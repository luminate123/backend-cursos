import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

type SeedLesson = { title: string; youtubeUrl: string };
type SeedSection = {
  title: string;
  phase: 'LEARN' | 'APPLY' | 'CREATE' | null;
  lessons: SeedLesson[];
};
type SeedCourse = {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  level: 'ESSENTIALS' | 'PROFESSIONAL' | 'ADVANCED' | 'EXECUTIVE';
  line: 'KORE_AI' | 'KORE_PROFESSIONAL';
  discipline: string;
  academicHours: number;
  price: number;
  hasFormalEvaluation: boolean;
  competencies: string[];
  whatYouLearn: string[];
  requirements: string[];
  tags: string[];
  sections: SeedSection[];
};

// Video de relleno: el seed existe para ver el catálogo con datos reales, no
// para dictar clases.
const VIDEO = 'https://www.youtube.com/watch?v=W6NZfCO5SIk';

// ponytail: catálogo inline. Cuando el equipo académico cargue los programas
// reales desde el panel, este seed se reduce a los 3 usuarios de prueba.
const CATALOG: SeedCourse[] = [
  {
    slug: 'ia-generativa-para-profesionales',
    title: 'IA Generativa para Profesionales',
    shortDescription: 'Usa IA generativa en tu trabajo diario con criterio profesional.',
    description:
      'Programa introductorio de KORE AI. Comprende cómo funcionan los modelos generativos, aplícalos a tareas reales de tu puesto y desarrolla criterio para evaluar sus resultados.',
    level: 'ESSENTIALS',
    line: 'KORE_AI',
    discipline: 'TRANSVERSAL',
    academicHours: 16,
    price: 180,
    hasFormalEvaluation: false,
    competencies: ['Uso aplicado de IA generativa', 'Evaluación crítica de resultados de IA'],
    whatYouLearn: ['Cómo funciona un modelo generativo', 'Casos de uso por área', 'Límites y riesgos'],
    requirements: ['Manejo básico de computadora'],
    tags: ['ia', 'ia-generativa', 'productividad'],
    sections: [
      {
        title: 'Comprender la IA generativa',
        phase: 'LEARN',
        lessons: [
          { title: '¿Qué es un modelo generativo?', youtubeUrl: VIDEO },
          { title: 'Capacidades y límites', youtubeUrl: VIDEO },
        ],
      },
      {
        title: 'Aplicar la IA a tu trabajo',
        phase: 'APPLY',
        lessons: [{ title: 'Casos de uso por área profesional', youtubeUrl: VIDEO }],
      },
    ],
  },
  {
    slug: 'prompt-engineering-aplicado',
    title: 'Prompt Engineering Aplicado',
    shortDescription: 'Diseña prompts que producen resultados consistentes.',
    description:
      'Técnicas de prompting para obtener resultados reproducibles en tareas profesionales: estructura, contexto, restricciones y evaluación de salidas.',
    level: 'ESSENTIALS',
    line: 'KORE_AI',
    discipline: 'TRANSVERSAL',
    academicHours: 12,
    price: 150,
    hasFormalEvaluation: false,
    competencies: ['Diseño de prompts estructurados', 'Iteración y evaluación de resultados'],
    whatYouLearn: ['Anatomía de un prompt efectivo', 'Patrones de prompting', 'Cómo iterar'],
    requirements: ['Haber usado alguna herramienta de IA generativa'],
    tags: ['ia', 'prompt-engineering'],
    sections: [
      {
        title: 'Fundamentos del prompting',
        phase: 'LEARN',
        lessons: [{ title: 'Anatomía de un prompt', youtubeUrl: VIDEO }],
      },
      {
        title: 'Práctica guiada',
        phase: 'APPLY',
        lessons: [{ title: 'Patrones de prompting aplicados', youtubeUrl: VIDEO }],
      },
    ],
  },
  {
    slug: 'ia-para-productividad',
    title: 'IA para Productividad',
    shortDescription: 'Automatiza tareas repetitivas de tu día a día.',
    description:
      'Identifica tareas automatizables en tu puesto y resuélvelas con herramientas de IA: redacción, síntesis, organización y seguimiento.',
    level: 'ESSENTIALS',
    line: 'KORE_AI',
    discipline: 'TRANSVERSAL',
    academicHours: 12,
    price: 150,
    hasFormalEvaluation: false,
    competencies: ['Automatización de tareas con IA'],
    whatYouLearn: ['Mapear tareas automatizables', 'Flujos de trabajo con IA'],
    requirements: ['Ninguno'],
    tags: ['ia', 'productividad', 'automatizacion'],
    sections: [
      {
        title: 'Comprender el flujo de trabajo',
        phase: 'LEARN',
        lessons: [{ title: 'Dónde se pierde el tiempo', youtubeUrl: VIDEO }],
      },
      {
        title: 'Automatizar con IA',
        phase: 'APPLY',
        lessons: [{ title: 'Construir tu primer flujo', youtubeUrl: VIDEO }],
      },
    ],
  },
  {
    slug: 'ia-para-analisis-de-datos',
    title: 'IA para Análisis de Datos',
    shortDescription: 'Analiza datos y toma decisiones con apoyo de IA.',
    description:
      'Uso de IA para explorar, limpiar e interpretar datos, y para comunicar hallazgos que sustenten decisiones profesionales.',
    level: 'PROFESSIONAL',
    line: 'KORE_AI',
    discipline: 'TRANSVERSAL',
    academicHours: 40,
    price: 480,
    hasFormalEvaluation: true,
    competencies: [
      'Análisis de datos asistido por IA',
      'Comunicación de hallazgos',
      'Toma de decisiones basada en datos',
    ],
    whatYouLearn: ['Exploración y limpieza de datos', 'Interpretación de resultados', 'Reportes ejecutivos'],
    requirements: ['Manejo de hojas de cálculo'],
    tags: ['ia', 'datos', 'analitica'],
    sections: [
      {
        title: 'Comprender el dato',
        phase: 'LEARN',
        lessons: [
          { title: 'Tipos de datos y calidad', youtubeUrl: VIDEO },
          { title: 'Preguntas que responde un dato', youtubeUrl: VIDEO },
        ],
      },
      {
        title: 'Aplicar el análisis',
        phase: 'APPLY',
        lessons: [{ title: 'Exploración asistida por IA', youtubeUrl: VIDEO }],
      },
      {
        title: 'Crear el reporte de decisión',
        phase: 'CREATE',
        lessons: [{ title: 'Proyecto final: tablero de decisión', youtubeUrl: VIDEO }],
      },
    ],
  },
  {
    slug: 'agentes-de-ia-y-automatizacion',
    title: 'Agentes de IA y Automatización',
    shortDescription: 'Diseña agentes que ejecutan procesos completos.',
    description:
      'Programa avanzado: diseño, orquestación y supervisión de agentes de IA aplicados a procesos empresariales.',
    level: 'ADVANCED',
    line: 'KORE_AI',
    discipline: 'TECNOLOGIA',
    academicHours: 60,
    price: 780,
    hasFormalEvaluation: true,
    competencies: [
      'Diseño de agentes de IA',
      'Orquestación de procesos automatizados',
      'Supervisión y control de riesgos',
    ],
    whatYouLearn: ['Arquitectura de un agente', 'Herramientas y orquestación', 'Supervisión humana'],
    requirements: ['Conocimiento previo de IA generativa', 'Nociones de procesos empresariales'],
    tags: ['ia', 'agentes', 'automatizacion'],
    sections: [
      {
        title: 'Comprender los agentes',
        phase: 'LEARN',
        lessons: [{ title: 'Qué hace a un sistema un agente', youtubeUrl: VIDEO }],
      },
      {
        title: 'Aplicar a un proceso real',
        phase: 'APPLY',
        lessons: [{ title: 'Mapear el proceso a automatizar', youtubeUrl: VIDEO }],
      },
      {
        title: 'Crear tu agente',
        phase: 'CREATE',
        lessons: [{ title: 'Proyecto final: agente en producción', youtubeUrl: VIDEO }],
      },
    ],
  },
  {
    slug: 'etica-y-uso-responsable-de-ia',
    title: 'Ética y Uso Responsable de IA',
    shortDescription: 'IA responsable, segura y centrada en las personas.',
    description:
      'Marco práctico para decidir cuándo y cómo usar IA: sesgos, privacidad, trazabilidad, responsabilidad y políticas internas.',
    level: 'ESSENTIALS',
    line: 'KORE_AI',
    discipline: 'TRANSVERSAL',
    academicHours: 8,
    price: 120,
    hasFormalEvaluation: false,
    competencies: ['Evaluación ética del uso de IA'],
    whatYouLearn: ['Sesgos y su impacto', 'Privacidad de datos', 'Políticas de uso responsable'],
    requirements: ['Ninguno'],
    tags: ['ia', 'etica', 'gobernanza'],
    sections: [
      {
        title: 'Comprender los riesgos',
        phase: 'LEARN',
        lessons: [{ title: 'Sesgo, privacidad y responsabilidad', youtubeUrl: VIDEO }],
      },
    ],
  },
  {
    slug: 'especializacion-en-gestion-de-personas-con-ia',
    title: 'Especialización en Gestión de Personas con IA',
    shortDescription: 'Programa de especialización en RRHH con IA transversal.',
    description:
      'Programa KORE Professional de 80 horas académicas para especialistas de recursos humanos: selección, desarrollo y analítica de personas con apoyo de IA.',
    level: 'PROFESSIONAL',
    line: 'KORE_PROFESSIONAL',
    discipline: 'RRHH',
    academicHours: 80,
    price: 1200,
    hasFormalEvaluation: true,
    competencies: ['Analítica de personas', 'Selección asistida por IA', 'Diseño de planes de desarrollo'],
    whatYouLearn: [
      'Indicadores de gestión de personas',
      'IA en selección',
      'Planes de desarrollo basados en datos',
    ],
    requirements: ['Experiencia en recursos humanos'],
    tags: ['rrhh', 'ia', 'especializacion'],
    sections: [
      {
        title: 'Comprender la gestión de personas hoy',
        phase: 'LEARN',
        lessons: [{ title: 'El rol de RRHH en la era de la IA', youtubeUrl: VIDEO }],
      },
      {
        title: 'Aplicar IA a los procesos de RRHH',
        phase: 'APPLY',
        lessons: [{ title: 'Selección y evaluación asistida', youtubeUrl: VIDEO }],
      },
      {
        title: 'Crear el plan de personas',
        phase: 'CREATE',
        lessons: [{ title: 'Proyecto final: plan de desarrollo', youtubeUrl: VIDEO }],
      },
    ],
  },
  {
    slug: 'programa-ejecutivo-de-transformacion-digital',
    title: 'Programa Ejecutivo de Transformación Digital',
    shortDescription: 'Para gerentes y directivos que lideran la transformación.',
    description:
      'Programa KORE Executive: cómo decidir, priorizar y gobernar iniciativas de IA y transformación digital en una organización.',
    level: 'EXECUTIVE',
    line: 'KORE_PROFESSIONAL',
    discipline: 'ADMINISTRACION',
    academicHours: 40,
    price: 1800,
    hasFormalEvaluation: false,
    competencies: [
      'Dirección de iniciativas de transformación digital',
      'Priorización de inversión tecnológica',
    ],
    whatYouLearn: ['Diagnóstico de madurez digital', 'Priorización de iniciativas', 'Gobierno de datos e IA'],
    requirements: ['Rol de gerencia o jefatura'],
    tags: ['transformacion-digital', 'direccion', 'ejecutivo'],
    sections: [
      {
        title: 'Comprender la transformación',
        phase: 'LEARN',
        lessons: [{ title: 'Madurez digital de una organización', youtubeUrl: VIDEO }],
      },
      {
        title: 'Decidir y priorizar',
        phase: 'APPLY',
        lessons: [{ title: 'Cartera de iniciativas y retorno', youtubeUrl: VIDEO }],
      },
    ],
  },
];

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
      'admin@koregroup.pe', 'Admin', 'KORE', 'ADMIN', 'Admin123!',
    );
    const instructorId = await this.upsertUser(
      'instructor@koregroup.pe', 'Carlos', 'Ramírez', 'INSTRUCTOR', 'Instructor123!',
    );
    const studentId = await this.upsertUser(
      'estudiante@koregroup.pe', 'María', 'González', 'STUDENT', 'Estudiante123!',
    );

    let firstCourseId = '';
    for (const course of CATALOG) {
      const courseId = await this.upsertCourse(course, instructorId);
      firstCourseId ||= courseId;

      let sectionOrder = 0;
      for (const section of course.sections) {
        const sectionId = await this.upsertSection(courseId, section, sectionOrder++);
        let lessonOrder = 0;
        for (const lesson of section.lessons) {
          await this.upsertLesson(sectionId, lesson, lessonOrder++);
        }
      }

      // Recalcula los contadores en cache desde las lecciones reales.
      await this.db.query(
        `UPDATE courses c SET
           "totalLessons" = (SELECT COUNT(*) FROM lessons l
             JOIN sections s ON l."sectionId" = s.id WHERE s."courseId" = c.id),
           "totalDurationSeconds" = (SELECT COALESCE(SUM(l."durationSeconds"), 0) FROM lessons l
             JOIN sections s ON l."sectionId" = s.id WHERE s."courseId" = c.id)
         WHERE c.id = $1`,
        [courseId],
      );
    }

    await this.upsertEnrollment(studentId, firstCourseId, 'APPROVED', adminId);

    this.logger.log('Seed complete!');
    this.logger.log('admin@koregroup.pe → Admin123!');
    this.logger.log('instructor@koregroup.pe → Instructor123!');
    this.logger.log('estudiante@koregroup.pe → Estudiante123!');
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

  private async upsertCourse(c: SeedCourse, instructorId: string): Promise<string> {
    const existing = await this.db.query(`SELECT id FROM courses WHERE slug = $1`, [c.slug]);
    if (existing.length > 0) {
      this.logger.log(`[skip] Course "${c.slug}" already exists`);
      return existing[0].id;
    }
    // simple-array de TypeORM se almacena como texto separado por comas.
    const result = await this.db.query(
      `INSERT INTO courses (
         id, title, slug, description, "shortDescription", level, line, discipline,
         "academicHours", competencies, "hasFormalEvaluation",
         language, price, "isPublished", requirements, "whatYouLearn", tags,
         "totalDurationSeconds", "totalLessons", rating, "ratingCount",
         "enrollmentCount", "instructorId"
       ) VALUES (
         uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7,
         $8, $9, $10,
         'Español', $11, true, $12, $13, $14,
         0, 0, 0, 0, 0, $15
       ) RETURNING id`,
      [
        c.title, c.slug, c.description, c.shortDescription, c.level, c.line, c.discipline,
        c.academicHours, c.competencies.join(','), c.hasFormalEvaluation,
        c.price, c.requirements.join(','), c.whatYouLearn.join(','), c.tags.join(','),
        instructorId,
      ],
    );
    this.logger.log(`[ok] Course "${c.slug}" created`);
    return result[0].id;
  }

  private async upsertSection(courseId: string, s: SeedSection, order: number): Promise<string> {
    const existing = await this.db.query(
      `SELECT id FROM sections WHERE "courseId" = $1 AND "order" = $2`, [courseId, order],
    );
    if (existing.length > 0) return existing[0].id;

    const result = await this.db.query(
      `INSERT INTO sections (id, title, description, phase, "order", "totalLessons", "totalDurationSeconds", "courseId")
       VALUES (uuid_generate_v4(), $1, null, $2, $3, 0, 0, $4) RETURNING id`,
      [s.title, s.phase, order, courseId],
    );
    this.logger.log(`[ok] Section "${s.title}" created`);
    return result[0].id;
  }

  private async upsertLesson(sectionId: string, l: SeedLesson, order: number): Promise<string> {
    const existing = await this.db.query(
      `SELECT id FROM lessons WHERE "sectionId" = $1 AND "order" = $2`, [sectionId, order],
    );
    if (existing.length > 0) return existing[0].id;

    const match = l.youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    const videoId = match ? match[1] : null;
    const result = await this.db.query(
      `INSERT INTO lessons (id, title, description, "youtubeUrl", "youtubeVideoId", "order", "durationSeconds", "isFree", resources, notes, "sectionId")
       VALUES (uuid_generate_v4(), $1, null, $2, $3, $4, 600, $5, null, null, $6) RETURNING id`,
      [l.title, l.youtubeUrl, videoId, order, order === 0, sectionId],
    );
    await this.db.query(
      `UPDATE sections SET "totalLessons" = "totalLessons" + 1, "totalDurationSeconds" = "totalDurationSeconds" + 600 WHERE id = $1`,
      [sectionId],
    );
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
