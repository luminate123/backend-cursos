import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from '../entities/enrollment.entity';
import { LessonProgress } from '../entities/lesson-progress.entity';
import { Course } from '../entities/course.entity';
import { Lesson } from '../entities/lesson.entity';
import { User } from '../entities/user.entity';
import { Payment } from '../entities/payment.entity';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment, LessonProgress, Course, Lesson, User, Payment]),
  ],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
