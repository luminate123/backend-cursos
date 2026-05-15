import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'edutech',
  password: process.env.POSTGRES_PASSWORD || 'edutech123',
  database: process.env.POSTGRES_DB || 'edutech_db',
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function upsertUser(
  db: DataSource,
  email: string,
  firstName: string,
  lastName: string,
  role: string,
  password: string,
): Promise<string> {
  const existing = await db.query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existing.length > 0) {
    console.log(`  [skip] User ${email} already exists`);
    return existing[0].id;
  }
  const hash = await bcrypt.hash(password, 10);
  const result = await db.query(
    `INSERT INTO users (id, email, password, "firstName", "lastName", role, "isActive", "isEmailVerified")
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, true, true)
     RETURNING id`,
    [email, hash, firstName, lastName, role],
  );
  console.log(`  [ok]   User ${email} created (${role})`);
  return result[0].id;
}

async function upsertCourse(
  db: DataSource,
  slug: string,
  instructorId: string,
): Promise<string> {
  const existing = await db.query(`SELECT id FROM courses WHERE slug = $1`, [slug]);
  if (existing.length > 0) {
    console.log(`  [skip] Course "${slug}" already exists`);
    return existing[0].id;
  }
  const result = await db.query(
    `INSERT INTO courses (
       id, title, slug, description, "shortDescription", level, category,
       language, price, "isPublished", requirements, "whatYouLearn", tags,
       "totalDurationSeconds", "totalLessons", rating, "ratingCount",
       "enrollmentCount", "instructorId"
     ) VALUES (
       uuid_generate_v4(), $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10, $11, $12,
       $13, $14, $15, $16,
       $17, $18
     ) RETURNING id`,
    [
      'Introducción a JavaScript Moderno',
      slug,
      'Aprende JavaScript desde cero hasta conceptos avanzados como ES6+, async/await y módulos.',
      'Domina JavaScript con este curso completo',
      'BEGINNER',
      'PROGRAMMING',
      'Español',
      0,
      true,
      JSON.stringify(['Conocimientos básicos de computación', 'Un editor de código (VS Code recomendado)']),
      JSON.stringify(['Variables, tipos de datos y operadores', 'Funciones y alcance', 'Programación asíncrona', 'Módulos ES6']),
      JSON.stringify(['javascript', 'web', 'programacion', 'es6']),
      0,
      0,
      0,
      0,
      0,
      instructorId,
    ],
  );
  console.log(`  [ok]   Course "${slug}" created`);
  return result[0].id;
}

async function upsertSection(
  db: DataSource,
  courseId: string,
  title: string,
  order: number,
): Promise<string> {
  const existing = await db.query(
    `SELECT id FROM sections WHERE "courseId" = $1 AND "order" = $2`,
    [courseId, order],
  );
  if (existing.length > 0) {
    console.log(`  [skip] Section order ${order} already exists`);
    return existing[0].id;
  }
  const result = await db.query(
    `INSERT INTO sections (id, title, description, "order", "totalLessons", "totalDurationSeconds", "courseId")
     VALUES (uuid_generate_v4(), $1, $2, $3, 0, 0, $4)
     RETURNING id`,
    [title, 'Conceptos fundamentales de JavaScript', order, courseId],
  );
  console.log(`  [ok]   Section "${title}" created`);
  return result[0].id;
}

async function upsertLesson(
  db: DataSource,
  sectionId: string,
  title: string,
  youtubeUrl: string,
  order: number,
): Promise<string> {
  const existing = await db.query(
    `SELECT id FROM lessons WHERE "sectionId" = $1 AND "order" = $2`,
    [sectionId, order],
  );
  if (existing.length > 0) {
    console.log(`  [skip] Lesson order ${order} already exists`);
    return existing[0].id;
  }
  // Extract YouTube video ID
  const match = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  const videoId = match ? match[1] : null;

  const result = await db.query(
    `INSERT INTO lessons (id, title, description, "youtubeUrl", "youtubeVideoId", "order", "durationSeconds", "isFree", resources, notes, "sectionId")
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      title,
      'En esta lección aprenderás los conceptos básicos del tema.',
      youtubeUrl,
      videoId,
      order,
      600,
      order === 1, // first lesson free
      JSON.stringify([{ title: 'Documentación MDN', url: 'https://developer.mozilla.org' }]),
      null,
      sectionId,
    ],
  );

  // Update section stats
  await db.query(
    `UPDATE sections SET "totalLessons" = "totalLessons" + 1, "totalDurationSeconds" = "totalDurationSeconds" + 600
     WHERE id = $1`,
    [sectionId],
  );

  console.log(`  [ok]   Lesson "${title}" created`);
  return result[0].id;
}

async function upsertEnrollment(
  db: DataSource,
  userId: string,
  courseId: string,
  status: string,
  reviewedBy?: string,
): Promise<void> {
  const existing = await db.query(
    `SELECT id FROM enrollments WHERE "userId" = $1 AND "courseId" = $2`,
    [userId, courseId],
  );
  if (existing.length > 0) {
    console.log(`  [skip] Enrollment already exists`);
    return;
  }
  await db.query(
    `INSERT INTO enrollments (id, "userId", "courseId", status, "rejectionReason", "reviewedBy", "reviewedAt", "progressPercentage", "completedLessons")
     VALUES (uuid_generate_v4(), $1, $2, $3, null, $4, $5, 0, 0)`,
    [
      userId,
      courseId,
      status,
      reviewedBy ?? null,
      status === 'APPROVED' ? new Date() : null,
    ],
  );

  if (status === 'APPROVED') {
    await db.query(
      `UPDATE courses SET "enrollmentCount" = "enrollmentCount" + 1 WHERE id = $1`,
      [courseId],
    );
  }

  console.log(`  [ok]   Enrollment (${status}) created`);
}

// ─── Main seed ───────────────────────────────────────────────────────────────

async function seed() {
  await AppDataSource.initialize();
  console.log('\n🌱 Seeding database...\n');

  // ── Users ──
  console.log('👤 Users:');
  const adminId = await upsertUser(
    AppDataSource,
    'admin@edutech.com',
    'Admin',
    'EduTech',
    'ADMIN',
    'Admin123!',
  );
  const instructorId = await upsertUser(
    AppDataSource,
    'instructor@edutech.com',
    'Carlos',
    'Ramírez',
    'INSTRUCTOR',
    'Instructor123!',
  );
  const studentId = await upsertUser(
    AppDataSource,
    'estudiante@edutech.com',
    'María',
    'González',
    'STUDENT',
    'Estudiante123!',
  );

  // ── Course ──
  console.log('\n📚 Course:');
  const courseId = await upsertCourse(
    AppDataSource,
    'introduccion-a-javascript-moderno',
    instructorId,
  );

  // ── Section ──
  console.log('\n📂 Section:');
  const sectionId = await upsertSection(
    AppDataSource,
    courseId,
    'Fundamentos de JavaScript',
    1,
  );

  // ── Lesson ──
  console.log('\n🎬 Lesson:');
  await upsertLesson(
    AppDataSource,
    sectionId,
    '¿Qué es JavaScript?',
    'https://www.youtube.com/watch?v=W6NZfCO5SIk',
    1,
  );

  // Update course total stats
  await AppDataSource.query(
    `UPDATE courses SET "totalLessons" = 1, "totalDurationSeconds" = 600 WHERE id = $1`,
    [courseId],
  );

  // ── Enrollments ──
  console.log('\n📋 Enrollments:');
  // Student has an APPROVED enrollment
  await upsertEnrollment(AppDataSource, studentId, courseId, 'APPROVED', instructorId);

  console.log('\n✅ Seed complete!\n');
  console.log('─────────────────────────────────────────');
  console.log('  admin@edutech.com       → Admin123!');
  console.log('  instructor@edutech.com  → Instructor123!');
  console.log('  estudiante@edutech.com  → Estudiante123!');
  console.log('─────────────────────────────────────────\n');

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
