import { IsString, MinLength, MaxLength } from 'class-validator';

export class RevokeCertificateDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
