import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { Comment } from '../entities/comment.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { Course } from '../entities/course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, Enrollment, Course])],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
