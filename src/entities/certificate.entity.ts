import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';
import { CourseLevel } from './course.entity';

/**
 * Tipos de certificado del plan estratégico (sección 9).
 *
 * Ninguno se presenta como acreditación oficial: KORE no es entidad
 * acreditadora. COMPETENCIAS solo se emite cuando el programa tiene una
 * evaluación formal que la sustente; sin eso se degrada a APROBACION.
 */
export enum CertificateType {
  PARTICIPACION = 'PARTICIPACION',
  APROBACION = 'APROBACION',
  ESPECIALIZACION = 'ESPECIALIZACION',
  COMPETENCIAS = 'COMPETENCIAS',
  EJECUTIVO = 'EJECUTIVO',
}

/**
 * Resuelve el tipo de certificado a partir del nivel del programa y de si tiene
 * evaluación formal. Es la regla legal del modelo de certificación, y vive en
 * una sola función para que no se duplique en el controlador ni en la vista.
 */
export function resolveCertificateType(
  level: CourseLevel,
  hasFormalEvaluation: boolean,
): CertificateType {
  switch (level) {
    case CourseLevel.EXECUTIVE:
      return CertificateType.EJECUTIVO;
    case CourseLevel.ADVANCED:
      // "Certificación de competencias" exige una evaluación que la sustente.
      return hasFormalEvaluation
        ? CertificateType.COMPETENCIAS
        : CertificateType.APROBACION;
    case CourseLevel.PROFESSIONAL:
      return CertificateType.ESPECIALIZACION;
    case CourseLevel.ESSENTIALS:
    default:
      return hasFormalEvaluation
        ? CertificateType.APROBACION
        : CertificateType.PARTICIPACION;
  }
}

@Entity('certificates')
@Unique(['userId', 'courseId'])
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Código público impreso en el certificado y usado para verificarlo.
  @Column({ type: 'varchar', unique: true })
  @Index()
  code: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  // ── Copia congelada de los datos al momento de emitir ────────────────────
  // Un certificado emitido no puede cambiar porque alguien editó el curso o el
  // alumno se cambió el apellido después.

  @Column({ type: 'varchar' })
  studentName: string;

  @Column({ type: 'varchar' })
  courseTitle: string;

  @Column({ type: 'int', default: 0 })
  academicHours: number;

  @Column({ type: 'simple-array', nullable: true })
  competencies: string[];

  @Column({ type: 'enum', enum: CertificateType })
  type: CertificateType;

  @CreateDateColumn({ type: 'timestamp' })
  issuedAt: Date;

  // Un certificado no se borra: se anula, y la verificación lo informa.
  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  revokedReason: string | null;
}
