import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Certificados KORE. Los datos del alumno y del programa se guardan como copia
 * congelada: un certificado emitido no puede cambiar porque después se editara
 * el curso o el nombre del alumno.
 */
export class CreateCertificates1710000000007 implements MigrationInterface {
  name = 'CreateCertificates1710000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "certificate_type_enum" AS ENUM(
        'PARTICIPACION','APROBACION','ESPECIALIZACION','COMPETENCIAS','EJECUTIVO')`,
    );

    await queryRunner.query(`
      CREATE TABLE "certificates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying NOT NULL,
        "userId" uuid NOT NULL,
        "courseId" uuid NOT NULL,
        "studentName" character varying NOT NULL,
        "courseTitle" character varying NOT NULL,
        "academicHours" integer NOT NULL DEFAULT 0,
        "competencies" text,
        "type" "certificate_type_enum" NOT NULL,
        "issuedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "revokedAt" TIMESTAMP,
        "revokedReason" text,
        CONSTRAINT "PK_certificates" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_certificates_code" UNIQUE ("code"),
        CONSTRAINT "UQ_certificates_user_course" UNIQUE ("userId", "courseId"),
        CONSTRAINT "FK_certificates_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_certificates_course" FOREIGN KEY ("courseId")
          REFERENCES "courses"("id") ON DELETE CASCADE
      )
    `);

    // La verificación pública busca exclusivamente por código.
    await queryRunner.query(`CREATE INDEX "IDX_certificates_code" ON "certificates" ("code")`);
    await queryRunner.query(`CREATE INDEX "IDX_certificates_userId" ON "certificates" ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "certificates"`);
    await queryRunner.query(`DROP TYPE "certificate_type_enum"`);
  }
}
