import { IsString, MinLength, Matches } from 'class-validator';

export class PresignDto {
  @IsString()
  @MinLength(1)
  filename: string;

  // MIME type, e.g. application/pdf
  @IsString()
  @Matches(/^[\w.+-]+\/[\w.+-]+$/, { message: 'Invalid content type' })
  contentType: string;
}
