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
import { Section } from './section.entity';
import { LessonProgress } from './lesson-progress.entity';

export interface LessonResource {
  title: string;
  url: string;
}

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Full YouTube URL, e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ
  @Column({ type: 'varchar' })
  youtubeUrl: string;

  // Extracted YouTube video ID for embedding (dQw4w9WgXcQ)
  @Column({ type: 'varchar', nullable: true })
  youtubeVideoId: string | null;

  // Position in the section (0-indexed)
  @Column({ type: 'int', default: 0 })
  order: number;

  // Duration of the video in seconds
  @Column({ type: 'int', nullable: true })
  durationSeconds: number | null;

  // Whether non-enrolled users can watch this lesson as a preview
  @Column({ type: 'boolean', default: false })
  isFree: boolean;

  // Downloadable resources attached to this lesson
  // e.g. [{ title: "Slides", url: "https://..." }, { title: "Code", url: "https://..." }]
  @Column({ type: 'jsonb', nullable: true })
  resources: LessonResource[] | null;

  // Notes/transcript for the lesson (markdown)
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid' })
  sectionId: string;

  @ManyToOne(() => Section, (section) => section.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sectionId' })
  section: Section;

  @OneToMany(() => LessonProgress, (lp) => lp.lesson)
  progress: LessonProgress[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
