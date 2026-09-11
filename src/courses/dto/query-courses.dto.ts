import { IsEnum, IsOptional, IsString, IsNumberString } from 'class-validator';
import { CourseLevel, CourseLine, Discipline } from '../../entities/course.entity';

export class QueryCoursesDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(CourseLine)
  line?: CourseLine;

  @IsOptional()
  @IsEnum(Discipline)
  discipline?: Discipline;

  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @IsOptional()
  @IsString()
  language?: string;
}
