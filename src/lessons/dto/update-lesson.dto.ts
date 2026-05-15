import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  IsUrl,
  Min,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LessonResourceDto } from './create-lesson.dto';

export class UpdateLessonDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @Matches(/(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/, {
    message: 'Must be a valid YouTube URL',
  })
  @IsOptional()
  youtubeUrl?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationSeconds?: number;

  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonResourceDto)
  @IsOptional()
  resources?: LessonResourceDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
