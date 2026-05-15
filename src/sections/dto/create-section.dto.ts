import { IsString, IsOptional, IsInt, Min, MinLength } from 'class-validator';

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
}
