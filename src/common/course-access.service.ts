import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment, EnrollmentStatus } from '../entities/enrollment.entity';
import { Role } from '../enums/role.enum';

export interface Requester {
  sub: string;
  role: Role | string;
}

// Lessons hold protected fields (video URLs, downloadable resources, notes).
// These are only returned to viewers with full access; everyone else gets a
// redacted roadmap. Single source of truth for both courses and lessons.
@Injectable()
export class CourseAccessService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
  ) {}

  // Full access = course owner, admin, or an APPROVED enrollment.
  async hasFullAccess(
    course: { id: string; instructorId: string },
    requester?: Requester,
  ): Promise<boolean> {
    if (!requester) return false;
    if (requester.role === Role.ADMIN) return true;
    if (course.instructorId === requester.sub) return true;
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        userId: requester.sub,
        courseId: course.id,
        status: EnrollmentStatus.APPROVED,
      },
    });
    return !!enrollment;
  }

  // Mutates lessons in place. Downloads + notes are enrolled-only always;
  // video is also stripped for non-free lessons.
  redactLessons(lessons: any[] | null | undefined, fullAccess: boolean): void {
    if (fullAccess || !lessons) return;
    for (const lesson of lessons) {
      lesson.resources = null;
      lesson.notes = null;
      if (!lesson.isFree) {
        lesson.youtubeUrl = null;
        lesson.youtubeVideoId = null;
      }
    }
  }
}
