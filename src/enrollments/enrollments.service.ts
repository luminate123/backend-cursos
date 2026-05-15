import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment, EnrollmentStatus } from '../entities/enrollment.entity';
import { LessonProgress } from '../entities/lesson-progress.entity';
import { Course } from '../entities/course.entity';
import { Lesson } from '../entities/lesson.entity';
import { User } from '../entities/user.entity';
import { Role } from '../enums/role.enum';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(LessonProgress)
    private lessonProgressRepository: Repository<LessonProgress>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // ─── Student: request enrollment ────────────────────────────────────────────

  async requestEnrollment(courseId: string, userId: string): Promise<Enrollment> {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (!course.isPublished) throw new ForbiddenException('Course is not published');
    if (course.instructorId === userId) {
      throw new ForbiddenException('No puedes inscribirte en tu propio curso');
    }

    const existing = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
    });
    if (existing) {
      if (existing.status === EnrollmentStatus.REJECTED) {
        // Allow re-request after rejection
        existing.status = EnrollmentStatus.PENDING;
        existing.rejectionReason = null;
        existing.reviewedBy = null;
        existing.reviewedAt = null;
        return this.enrollmentRepository.save(existing);
      }
      throw new ConflictException(
        existing.status === EnrollmentStatus.PENDING
          ? 'Enrollment request already sent'
          : 'Already enrolled in this course',
      );
    }

    const enrollment = this.enrollmentRepository.create({
      userId,
      courseId,
      status: EnrollmentStatus.PENDING,
    });
    return this.enrollmentRepository.save(enrollment);
  }

  // ─── Instructor: manually enroll a student (auto-approved) ──────────────────

  async manualEnroll(
    courseId: string,
    studentId: string,
    instructorId: string,
    instructorRole: Role,
  ): Promise<Enrollment> {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    this.checkCourseOwnership(course, instructorId, instructorRole);

    const student = await this.userRepository.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    const existing = await this.enrollmentRepository.findOne({
      where: { userId: studentId, courseId },
    });
    if (existing && existing.status === EnrollmentStatus.APPROVED) {
      throw new ConflictException('Student already enrolled');
    }

    if (existing) {
      existing.status = EnrollmentStatus.APPROVED;
      existing.reviewedBy = instructorId;
      existing.reviewedAt = new Date();
      existing.rejectionReason = null;
      const saved = await this.enrollmentRepository.save(existing);
      await this.courseRepository.increment({ id: courseId }, 'enrollmentCount', 1);
      return saved;
    }

    const enrollment = this.enrollmentRepository.create({
      userId: studentId,
      courseId,
      status: EnrollmentStatus.APPROVED,
      reviewedBy: instructorId,
      reviewedAt: new Date(),
    });
    const saved = await this.enrollmentRepository.save(enrollment);
    await this.courseRepository.increment({ id: courseId }, 'enrollmentCount', 1);
    return saved;
  }

  // ─── Instructor: approve enrollment request ──────────────────────────────────

  async approve(
    enrollmentId: string,
    instructorId: string,
    instructorRole: Role,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['course'],
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    this.checkCourseOwnership(enrollment.course, instructorId, instructorRole);

    if (enrollment.status !== EnrollmentStatus.PENDING) {
      throw new BadRequestException('Enrollment is not pending');
    }

    enrollment.status = EnrollmentStatus.APPROVED;
    enrollment.reviewedBy = instructorId;
    enrollment.reviewedAt = new Date();
    enrollment.rejectionReason = null;

    const saved = await this.enrollmentRepository.save(enrollment);
    await this.courseRepository.increment({ id: enrollment.courseId }, 'enrollmentCount', 1);
    return saved;
  }

  // ─── Instructor: reject enrollment request ───────────────────────────────────

  async reject(
    enrollmentId: string,
    instructorId: string,
    instructorRole: Role,
    reason?: string,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['course'],
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    this.checkCourseOwnership(enrollment.course, instructorId, instructorRole);

    if (enrollment.status !== EnrollmentStatus.PENDING) {
      throw new BadRequestException('Enrollment is not pending');
    }

    enrollment.status = EnrollmentStatus.REJECTED;
    enrollment.reviewedBy = instructorId;
    enrollment.reviewedAt = new Date();
    enrollment.rejectionReason = reason ?? null;

    return this.enrollmentRepository.save(enrollment);
  }

  // ─── Instructor: get enrollment requests for a course ───────────────────────

  async getCourseEnrollments(
    courseId: string,
    instructorId: string,
    instructorRole: Role,
    status?: EnrollmentStatus,
  ) {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    this.checkCourseOwnership(course, instructorId, instructorRole);

    const qb = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.user', 'user')
      .where('enrollment.courseId = :courseId', { courseId })
      .orderBy('enrollment.enrolledAt', 'DESC');

    if (status) qb.andWhere('enrollment.status = :status', { status });

    return qb.getMany();
  }

  // ─── Student: get my enrollments ────────────────────────────────────────────

  async getMyEnrollments(userId: string) {
    return this.enrollmentRepository.find({
      where: { userId },
      relations: ['course', 'course.instructor'],
      order: { updatedAt: 'DESC' },
    });
  }

  // ─── Student/Instructor: get single enrollment for a course ─────────────────

  async getEnrollment(courseId: string, userId: string): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
      relations: ['course'],
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return enrollment;
  }

  // ─── Student: remove own request (only if PENDING) ──────────────────────────

  async cancelRequest(courseId: string, userId: string): Promise<void> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.status === EnrollmentStatus.APPROVED) {
      throw new ForbiddenException('Cannot cancel an approved enrollment. Contact the instructor.');
    }
    await this.enrollmentRepository.remove(enrollment);
  }

  // ─── Student: mark lesson complete (only if APPROVED) ───────────────────────

  async completeLesson(lessonId: string, userId: string): Promise<{ progressPercentage: number }> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['section', 'section.course'],
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const courseId = lesson.section.courseId;
    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
    });
    if (!enrollment) throw new ForbiddenException('Not enrolled in this course');
    if (enrollment.status !== EnrollmentStatus.APPROVED) {
      throw new ForbiddenException('Enrollment not approved yet');
    }

    const existing = await this.lessonProgressRepository.findOne({
      where: { userId, lessonId },
    });
    if (!existing) {
      await this.lessonProgressRepository.save(
        this.lessonProgressRepository.create({ userId, lessonId }),
      );
    }

    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    const completedCount = await this.lessonProgressRepository
      .createQueryBuilder('lp')
      .innerJoin('lp.lesson', 'lesson')
      .innerJoin('lesson.section', 'section')
      .where('lp.userId = :userId', { userId })
      .andWhere('section.courseId = :courseId', { courseId })
      .getCount();

    const totalLessons = course?.totalLessons ?? 1;
    const progressPercentage = Math.round((completedCount / totalLessons) * 100);
    const completedAt = progressPercentage === 100 ? new Date() : null;

    await this.enrollmentRepository.update(
      { userId, courseId },
      {
        completedLessons: completedCount,
        progressPercentage,
        lastAccessedAt: new Date(),
        ...(completedAt && { completedAt }),
      },
    );

    return { progressPercentage };
  }

  async getCompletedLessons(courseId: string, userId: string): Promise<string[]> {
    // Only return progress if enrollment is APPROVED
    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId, courseId, status: EnrollmentStatus.APPROVED },
    });
    if (!enrollment) return [];

    const rows = await this.lessonProgressRepository
      .createQueryBuilder('lp')
      .innerJoin('lp.lesson', 'lesson')
      .innerJoin('lesson.section', 'section')
      .where('lp.userId = :userId', { userId })
      .andWhere('section.courseId = :courseId', { courseId })
      .select('lp.lessonId')
      .getMany();

    return rows.map((r) => r.lessonId);
  }

  private checkCourseOwnership(course: Course, userId: string, userRole: Role): void {
    if (userRole !== Role.ADMIN && course.instructorId !== userId) {
      throw new ForbiddenException('You do not own this course');
    }
  }
}
