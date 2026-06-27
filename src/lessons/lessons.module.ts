import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from '../entities/lesson.entity';
import { Section } from '../entities/section.entity';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { UploadsModule } from '../uploads/uploads.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, Section]), UploadsModule, CommonModule],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
