import { IsString, IsOptional, IsInt, Min, MinLength, IsEnum } from 'class-validator';
import { LearningPhase } from '../../entities/section.entity';

export class CreateSectionDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsEnum(LearningPhase)
  @IsOptional()
  phase?: LearningPhase;
}
