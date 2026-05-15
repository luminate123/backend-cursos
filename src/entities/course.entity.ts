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

export enum CourseLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum CourseCategory {
  PROGRAMMING = 'PROGRAMMING',
  DESIGN = 'DESIGN',
  BUSINESS = 'BUSINESS',
  MARKETING = 'MARKETING',
  PHOTOGRAPHY = 'PHOTOGRAPHY',
  MUSIC = 'MUSIC',
  HEALTH = 'HEALTH',
  OTHER = 'OTHER',
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

  @Column({ type: 'enum', enum: CourseLevel, default: CourseLevel.BEGINNER })
  level: CourseLevel;

  @Column({ type: 'enum', enum: CourseCategory, default: CourseCategory.OTHER })
  category: CourseCategory;

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
