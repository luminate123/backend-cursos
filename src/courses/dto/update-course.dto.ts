import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  Max,
  IsInt,
  IsNumber,
  IsArray,
  IsUrl,
  MinLength,
  Min,
} from 'class-validator';
import { CourseLevel, CourseLine, Discipline } from '../../entities/course.entity';

export class UpdateCourseDto {
  @IsString()
  @MinLength(5)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(20)
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsUrl()
  @IsOptional()
  thumbnail?: string;

  @IsUrl()
  @IsOptional()
  promoVideoUrl?: string;

  @IsEnum(CourseLevel)
  @IsOptional()
  level?: CourseLevel;

  @IsEnum(CourseLine)
  @IsOptional()
  line?: CourseLine;

  @IsEnum(Discipline)
  @IsOptional()
  discipline?: Discipline;

  @IsInt()
  @Min(0)
  @Max(2000)
  @IsOptional()
  academicHours?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  competencies?: string[];

  @IsBoolean()
  @IsOptional()
  hasFormalEvaluation?: boolean;

  @IsString()
  @IsOptional()
  language?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requirements?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  whatYouLearn?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
