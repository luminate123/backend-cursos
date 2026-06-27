import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from '../entities/enrollment.entity';
import { CourseAccessService } from './course-access.service';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment])],
  providers: [CourseAccessService],
  exports: [CourseAccessService],
})
export class CommonModule {}
