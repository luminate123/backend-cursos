import { IsString, IsOptional, IsInt, Min, MinLength } from 'class-validator';

export class UpdateSectionDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
