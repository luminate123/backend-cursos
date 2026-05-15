import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async onApplicationBootstrap() {
    if (process.env.SEED_ON_BOOT !== 'true') return;
    await this.seed();
  }

  async seed() {
    this.logger.log('Seeding database...');

    const adminId = await this.upsertUser(
      'admin@edutech.com', 'Admin', 'EduTech', 'ADMIN', 'Admin123!',
    );
    const instructorId = await this.upsertUser(
      'instructor@edutech.com', 'Carlos', 'Ramírez', 'INSTRUCTOR', 'Instructor123!',
    );
    const studentId = await this.upsertUser(
      'estudiante@edutech.com', 'María', 'González', 'STUDENT', 'Estudiante123!',
    );

    const courseId = await this.upsertCourse(
      'introduccion-a-javascript-moderno', instructorId,
    );

    const sectionId = await this.upsertSection(
      courseId, 'Fundamentos de JavaScript', 1,
    );

    await this.upsertLesson(
      sectionId, '¿Qué es JavaScript?', 'https://www.youtube.com/watch?v=W6NZfCO5SIk', 1,
    );

    await this.db.query(
      `UPDATE courses SET "totalLessons" = 1, "totalDurationSeconds" = 600 WHERE id = $1`,
      [courseId],
    );

    await this.upsertEnrollment(studentId, courseId, 'APPROVED', instructorId);

    this.logger.log('Seed complete!');
    this.logger.log('admin@edutech.com → Admin123!');
    this.logger.log('instructor@edutech.com → Instructor123!');
    this.logger.log('estudiante@edutech.com → Estudiante123!');
  }

  private async upsertUser(
    email: string, firstName: string, lastName: string, role: string, password: string,
  ): Promise<string> {
    const existing = await this.db.query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existing.length > 0) {
      this.logger.log(`[skip] User ${email} already exists`);
      return existing[0].id;
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await this.db.query(
      `INSERT INTO users (id, email, password, "firstName", "lastName", role, "isActive", "isEmailVerified")
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, true, true) RETURNING id`,
      [email, hash, firstName, lastName, role],
    );
    this.logger.log(`[ok] User ${email} created (${role})`);
    return result[0].id;
  }

  private async upsertCourse(slug: string, instructorId: string): Promise<string> {
    const existing = await this.db.query(`SELECT id FROM courses WHERE slug = $1`, [slug]);
    if (existing.length > 0) {
      this.logger.log(`[skip] Course "${slug}" already exists`);
      return existing[0].id;
    }
    const result = await this.db.query(
      `INSERT INTO courses (
         id, title, slug, description, "shortDescription", level, category,
         language, price, "isPublished", requirements, "whatYouLearn", tags,
         "totalDurationSeconds", "totalLessons", rating, "ratingCount",
         "enrollmentCount", "instructorId"
       ) VALUES (
         uuid_generate_v4(), $1, $2, $3, $4, $5, $6,
         $7, $8, $9, $10, $11, $12,
         $13, $14, $15, $16, $17, $18
       ) RETURNING id`,
      [
        'Introducción a JavaScript Moderno', slug,
        'Aprende JavaScript desde cero hasta conceptos avanzados como ES6+, async/await y módulos.',
        'Domina JavaScript con este curso completo',
        'BEGINNER', 'PROGRAMMING', 'Español', 0, true,
        JSON.stringify(['Conocimientos básicos de computación', 'Un editor de código (VS Code recomendado)']),
        JSON.stringify(['Variables, tipos de datos y operadores', 'Funciones y alcance', 'Programación asíncrona', 'Módulos ES6']),
        JSON.stringify(['javascript', 'web', 'programacion', 'es6']),
        0, 0, 0, 0, 0, instructorId,
      ],
    );
    this.logger.log(`[ok] Course "${slug}" created`);
    return result[0].id;
  }

  private async upsertSection(courseId: string, title: string, order: number): Promise<string> {
    const existing = await this.db.query(
      `SELECT id FROM sections WHERE "courseId" = $1 AND "order" = $2`, [courseId, order],
    );
    if (existing.length > 0) {
      this.logger.log(`[skip] Section order ${order} already exists`);
      return existing[0].id;
    }
    const result = await this.db.query(
      `INSERT INTO sections (id, title, description, "order", "totalLessons", "totalDurationSeconds", "courseId")
       VALUES (uuid_generate_v4(), $1, $2, $3, 0, 0, $4) RETURNING id`,
      [title, 'Conceptos fundamentales de JavaScript', order, courseId],
    );
    this.logger.log(`[ok] Section "${title}" created`);
    return result[0].id;
  }

  private async upsertLesson(
    sectionId: string, title: string, youtubeUrl: string, order: number,
  ): Promise<string> {
    const existing = await this.db.query(
      `SELECT id FROM lessons WHERE "sectionId" = $1 AND "order" = $2`, [sectionId, order],
    );
    if (existing.length > 0) {
      this.logger.log(`[skip] Lesson order ${order} already exists`);
      return existing[0].id;
    }
    const match = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    const videoId = match ? match[1] : null;
    const result = await this.db.query(
      `INSERT INTO lessons (id, title, description, "youtubeUrl", "youtubeVideoId", "order", "durationSeconds", "isFree", resources, notes, "sectionId")
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        title, 'En esta lección aprenderás los conceptos básicos del tema.',
        youtubeUrl, videoId, order, 600, order === 1,
        JSON.stringify([{ title: 'Documentación MDN', url: 'https://developer.mozilla.org' }]),
        null, sectionId,
      ],
    );
    await this.db.query(
      `UPDATE sections SET "totalLessons" = "totalLessons" + 1, "totalDurationSeconds" = "totalDurationSeconds" + 600 WHERE id = $1`,
      [sectionId],
    );
    this.logger.log(`[ok] Lesson "${title}" created`);
    return result[0].id;
  }

  private async upsertEnrollment(
    userId: string, courseId: string, status: string, reviewedBy?: string,
  ): Promise<void> {
    const existing = await this.db.query(
      `SELECT id FROM enrollments WHERE "userId" = $1 AND "courseId" = $2`, [userId, courseId],
    );
    if (existing.length > 0) {
      this.logger.log('[skip] Enrollment already exists');
      return;
    }
    await this.db.query(
      `INSERT INTO enrollments (id, "userId", "courseId", status, "rejectionReason", "reviewedBy", "reviewedAt", "progressPercentage", "completedLessons")
       VALUES (uuid_generate_v4(), $1, $2, $3, null, $4, $5, 0, 0)`,
      [userId, courseId, status, reviewedBy ?? null, status === 'APPROVED' ? new Date() : null],
    );
    if (status === 'APPROVED') {
      await this.db.query(
        `UPDATE courses SET "enrollmentCount" = "enrollmentCount" + 1 WHERE id = $1`, [courseId],
      );
    }
    this.logger.log(`[ok] Enrollment (${status}) created`);
  }
}
