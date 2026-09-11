import { IsString, MinLength, Matches, IsInt, Min, Max } from 'class-validator';

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

export class PresignDto {
  @IsString()
  @MinLength(1)
  filename: string;

  // MIME type, e.g. application/pdf
  @IsString()
  @Matches(/^[\w.+-]+\/[\w.+-]+$/, { message: 'Invalid content type' })
  contentType: string;
}

export class PresignReceiptDto extends PresignDto {
  // Tamaño exacto en bytes: se firma como Content-Length, así R2 rechaza
  // cualquier PUT de otro tamaño.
  @IsInt()
  @Min(1)
  @Max(MAX_RECEIPT_BYTES, { message: 'El comprobante supera el límite de 10 MB' })
  size: number;
}
