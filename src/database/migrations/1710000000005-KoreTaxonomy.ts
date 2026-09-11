import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Taxonomia KORE Group: reemplaza la categorizacion generica (PROGRAMMING,
 * DESIGN, MUSIC...) por las lineas de negocio y niveles del plan estrategico,
 * y agrega los datos que el certificado necesita imprimir.
 */
export class KoreTaxonomy1710000000005 implements MigrationInterface {
  name = 'KoreTaxonomy1710000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── level: BEGINNER/INTERMEDIATE/ADVANCED → arquitectura academica KORE
    await queryRunner.query(
      `CREATE TYPE "course_level_enum_new" AS ENUM('ESSENTIALS','PROFESSIONAL','ADVANCED','EXECUTIVE')`,
    );
    await queryRunner.query(`ALTER TABLE "courses" ALTER COLUMN "level" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "courses" ALTER COLUMN "level" TYPE "course_level_enum_new"
       USING CASE "level"::text
         WHEN 'BEGINNER' THEN 'ESSENTIALS'
         WHEN 'INTERMEDIATE' THEN 'PROFESSIONAL'
         WHEN 'ADVANCED' THEN 'ADVANCED'
         ELSE 'ESSENTIALS'
       END::"course_level_enum_new"`,
    );
    await queryRunner.query(`DROP TYPE "course_level_enum"`);
    await queryRunner.query(`ALTER TYPE "course_level_enum_new" RENAME TO "course_level_enum"`);
    await queryRunner.query(
      `ALTER TABLE "courses" ALTER COLUMN "level" SET DEFAULT 'ESSENTIALS'`,
    );

    // ── line + discipline reemplazan a category
    await queryRunner.query(
      `CREATE TYPE "course_line_enum" AS ENUM('KORE_AI','KORE_PROFESSIONAL')`,
    );
    await queryRunner.query(
      `CREATE TYPE "course_discipline_enum" AS ENUM('TRANSVERSAL','INGENIERIA','ADMINISTRACION',
        'CONTABILIDAD','ECONOMIA','DERECHO','EDUCACION','SALUD','MARKETING','RRHH','FINANZAS',
        'TECNOLOGIA','GESTION_PUBLICA','ARQUITECTURA','COMUNICACION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD "line" "course_line_enum" NOT NULL DEFAULT 'KORE_AI'`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD "discipline" "course_discipline_enum" NOT NULL DEFAULT 'TRANSVERSAL'`,
    );

    // Mapeo de los datos existentes: las categorias con equivalente profesional
    // pasan a KORE_PROFESSIONAL con su disciplina; el resto queda en KORE_AI.
    await queryRunner.query(
      `UPDATE "courses" SET "line" = 'KORE_PROFESSIONAL', "discipline" = CASE "category"::text
         WHEN 'BUSINESS' THEN 'ADMINISTRACION'
         WHEN 'MARKETING' THEN 'MARKETING'
         WHEN 'HEALTH' THEN 'SALUD'
         WHEN 'DESIGN' THEN 'COMUNICACION'
         WHEN 'PROGRAMMING' THEN 'TECNOLOGIA'
         ELSE 'TRANSVERSAL'
       END::"course_discipline_enum"
       WHERE "category"::text IN ('BUSINESS','MARKETING','HEALTH','DESIGN','PROGRAMMING')`,
    );

    // DROP COLUMN se lleva el indice de category en cascada, no hace falta dropearlo aparte.
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "category"`);
    await queryRunner.query(`DROP TYPE "course_category_enum"`);
    await queryRunner.query(`CREATE INDEX "IDX_courses_line" ON "courses" ("line")`);
    await queryRunner.query(`CREATE INDEX "IDX_courses_discipline" ON "courses" ("discipline")`);

    // ── datos que se imprimen en el certificado
    await queryRunner.query(
      `ALTER TABLE "courses" ADD "academicHours" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`ALTER TABLE "courses" ADD "competencies" text`);
    await queryRunner.query(
      `ALTER TABLE "courses" ADD "hasFormalEvaluation" boolean NOT NULL DEFAULT false`,
    );

    // ── modelo de formacion: COMPRENDER → APLICAR → CREAR
    await queryRunner.query(
      `CREATE TYPE "section_phase_enum" AS ENUM('LEARN','APPLY','CREATE')`,
    );
    await queryRunner.query(`ALTER TABLE "sections" ADD "phase" "section_phase_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "phase"`);
    await queryRunner.query(`DROP TYPE "section_phase_enum"`);

    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "hasFormalEvaluation"`);
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "competencies"`);
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "academicHours"`);

    await queryRunner.query(
      `CREATE TYPE "course_category_enum" AS ENUM('PROGRAMMING','DESIGN','BUSINESS','MARKETING',
        'PHOTOGRAPHY','MUSIC','HEALTH','OTHER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD "category" "course_category_enum" NOT NULL DEFAULT 'OTHER'`,
    );
    await queryRunner.query(
      `UPDATE "courses" SET "category" = CASE "discipline"::text
         WHEN 'ADMINISTRACION' THEN 'BUSINESS'
         WHEN 'MARKETING' THEN 'MARKETING'
         WHEN 'SALUD' THEN 'HEALTH'
         WHEN 'COMUNICACION' THEN 'DESIGN'
         WHEN 'TECNOLOGIA' THEN 'PROGRAMMING'
         ELSE 'OTHER'
       END::"course_category_enum"`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_courses_category" ON "courses" ("category")`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_courses_discipline"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_courses_line"`);
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "discipline"`);
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "line"`);
    await queryRunner.query(`DROP TYPE "course_discipline_enum"`);
    await queryRunner.query(`DROP TYPE "course_line_enum"`);

    await queryRunner.query(
      `CREATE TYPE "course_level_enum_old" AS ENUM('BEGINNER','INTERMEDIATE','ADVANCED')`,
    );
    await queryRunner.query(`ALTER TABLE "courses" ALTER COLUMN "level" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "courses" ALTER COLUMN "level" TYPE "course_level_enum_old"
       USING CASE "level"::text
         WHEN 'ESSENTIALS' THEN 'BEGINNER'
         WHEN 'PROFESSIONAL' THEN 'INTERMEDIATE'
         WHEN 'ADVANCED' THEN 'ADVANCED'
         WHEN 'EXECUTIVE' THEN 'ADVANCED'
         ELSE 'BEGINNER'
       END::"course_level_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "course_level_enum"`);
    await queryRunner.query(`ALTER TYPE "course_level_enum_old" RENAME TO "course_level_enum"`);
    await queryRunner.query(`ALTER TABLE "courses" ALTER COLUMN "level" SET DEFAULT 'BEGINNER'`);
  }
}
