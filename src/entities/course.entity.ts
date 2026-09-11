import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Section } from './section.entity';
import { Enrollment } from './enrollment.entity';

/** Arquitectura académica KORE (plan estratégico, línea 04 — KORE ACADEMY). */
export enum CourseLevel {
  ESSENTIALS = 'ESSENTIALS', // Nivel 1 — cursos cortos
  PROFESSIONAL = 'PROFESSIONAL', // Nivel 2 — programas de especialización
  ADVANCED = 'ADVANCED', // Nivel 3 — programas avanzados
  EXECUTIVE = 'EXECUTIVE', // Nivel 4 — gerentes, directivos y líderes
}

/** Línea de negocio educativa. Reemplaza a la antigua CourseCategory. */
export enum CourseLine {
  KORE_AI = 'KORE_AI', // Inteligencia Artificial aplicada
  KORE_PROFESSIONAL = 'KORE_PROFESSIONAL', // Especialización por profesión
}

/** Profesión a la que se dirige el programa. TRANSVERSAL = cualquier disciplina. */
export enum Discipline {
  TRANSVERSAL = 'TRANSVERSAL',
  INGENIERIA = 'INGENIERIA',
  ADMINISTRACION = 'ADMINISTRACION',
  CONTABILIDAD = 'CONTABILIDAD',
  ECONOMIA = 'ECONOMIA',
  DERECHO = 'DERECHO',
  EDUCACION = 'EDUCACION',
  SALUD = 'SALUD',
  MARKETING = 'MARKETING',
  RRHH = 'RRHH',
  FINANZAS = 'FINANZAS',
  TECNOLOGIA = 'TECNOLOGIA',
  GESTION_PUBLICA = 'GESTION_PUBLICA',
  ARQUITECTURA = 'ARQUITECTURA',
  COMUNICACION = 'COMUNICACION',
}

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  // URL-friendly identifier, e.g. "introduccion-a-nestjs"
  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'text' })
  description: string;

  // Short description for cards/previews
  @Column({ type: 'varchar', nullable: true })
  shortDescription: string | null;

  @Column({ type: 'varchar', nullable: true })
  thumbnail: string | null;

  // Intro/promo video (YouTube URL)
  @Column({ type: 'varchar', nullable: true })
  promoVideoUrl: string | null;

  @Column({ type: 'enum', enum: CourseLevel, default: CourseLevel.ESSENTIALS })
  level: CourseLevel;

  @Column({ type: 'enum', enum: CourseLine, default: CourseLine.KORE_AI })
  line: CourseLine;

  @Column({ type: 'enum', enum: Discipline, default: Discipline.TRANSVERSAL })
  discipline: Discipline;

  // Horas académicas del programa (40, 60, 80, 120...). Se imprime en el
  // certificado, por eso es un dato declarado y no la suma de duración de video.
  @Column({ type: 'int', default: 0 })
  academicHours: number;

  // Competencias que desarrolla el programa. Se listan en el certificado.
  @Column({ type: 'simple-array', nullable: true })
  competencies: string[];

  // Solo con evaluación formal se puede emitir "certificación de competencias".
  // Sin esto el certificado se degrada a constancia de aprobación.
  @Column({ type: 'boolean', default: false })
  hasFormalEvaluation: boolean;

  @Column({ type: 'varchar', default: 'es' })
  language: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  // Array of prerequisites, e.g. ["Saber JavaScript básico", "Tener Node.js instalado"]
  @Column({ type: 'simple-array', nullable: true })
  requirements: string[];

  // Array of learning outcomes, e.g. ["Construir una API REST", "Usar TypeORM"]
  @Column({ type: 'simple-array', nullable: true })
  whatYouLearn: string[];

  // Tags for search/filtering, e.g. ["nestjs", "typescript", "backend"]
  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  // Cached total duration of all lessons in seconds
  @Column({ type: 'int', default: 0 })
  totalDurationSeconds: number;

  // Cached lesson count
  @Column({ type: 'int', default: 0 })
  totalLessons: number;

  // Average rating 0-5
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  // Total number of ratings
  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  // Total enrollments (cached for performance)
  @Column({ type: 'int', default: 0 })
  enrollmentCount: number;

  @Column({ type: 'uuid' })
  instructorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  @OneToMany(() => Section, (section) => section.course, { cascade: true })
  sections: Section[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
