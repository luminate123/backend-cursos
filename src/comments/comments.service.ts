import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { Enrollment, EnrollmentStatus } from '../entities/enrollment.entity';
import { Course } from '../entities/course.entity';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  async findByCourse(courseId: string): Promise<Comment[]> {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    return this.commentRepository.find({
      where: { courseId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(courseId: string, userId: string, dto: CreateCommentDto): Promise<Comment> {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
    });

    if (!enrollment || enrollment.status !== EnrollmentStatus.APPROVED) {
      throw new ForbiddenException('Only enrolled students can comment');
    }

    const comment = this.commentRepository.create({ content: dto.content, userId, courseId });
    return this.commentRepository.save(comment);
  }
}
