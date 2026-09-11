import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../../entities/payment.entity';

export class CheckoutDto {
  // Key devuelta por POST /uploads/presign/receipt. Se valida que pertenezca
  // al propio alumno antes de guardarla.
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  receiptKey: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod;

  @IsString()
  @MaxLength(60)
  @Matches(/^[\w-]+$/, {
    message: 'El número de operación solo admite letras, números y guiones',
  })
  @IsOptional()
  operationNumber?: string;

  @IsDateString()
  @IsOptional()
  declaredPaidAt?: string;
}

export class RejectPaymentDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

export class QueryPaymentsDto {
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @IsOptional()
  @Matches(/^\d+$/)
  page?: string;

  @IsOptional()
  @Matches(/^\d+$/)
  limit?: string;
}

export class QueryRevenueDto {
  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;
}
