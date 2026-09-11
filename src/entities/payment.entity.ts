import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Enrollment } from './enrollment.entity';
import { User } from './user.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** Medio por el que el alumno declara haber pagado. */
export enum PaymentMethod {
  BCP_SOLES = 'BCP_SOLES', // depósito o transferencia a la cuenta BCP soles
  INTERBANK = 'INTERBANK', // transferencia interbancaria (CCI)
  OTHER = 'OTHER',
}

/**
 * Comprobante de pago de una inscripción. Un enrollment puede tener varios
 * pagos: si el admin rechaza una captura, el alumno sube otra y el historial
 * del rechazo se conserva.
 *
 * `Enrollment.status` sigue siendo la única fuente de verdad del acceso al
 * curso; este registro es la evidencia que justifica su aprobación.
 */
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  enrollmentId: string;

  @ManyToOne(() => Enrollment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: Enrollment;

  // Snapshot del precio al momento de pagar: si el curso sube de precio, el
  // reporte de ingresos histórico no puede cambiar.
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'PEN' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.BCP_SOLES })
  method: PaymentMethod;

  // Key del objeto en R2, NO una URL pública: la captura de una transferencia
  // lleva datos bancarios del alumno y solo se sirve por presigned GET a él
  // mismo o a un administrador.
  @Column({ type: 'varchar' })
  receiptKey: string;

  // Número de operación que declara el alumno, para conciliar con el extracto.
  @Column({ type: 'varchar', nullable: true })
  operationNumber: string | null;

  // Fecha del pago según el alumno (la del voucher), distinta de createdAt.
  @Column({ type: 'timestamp', nullable: true })
  declaredPaidAt: Date | null;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  @Index()
  status: PaymentStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string | null;

  // Admin que aprobó o rechazó. Sin FK a propósito: la columna ya existe y
  // borrar un admin no debe borrar ni bloquear el historial de pagos.
  @ManyToOne(() => User, { createForeignKeyConstraints: false, nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer: User | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
