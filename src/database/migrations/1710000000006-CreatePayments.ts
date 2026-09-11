import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Comprobantes de pago de inscripción. `receiptKey` guarda la key del objeto en
 * R2, nunca una URL pública: la captura lleva datos bancarios del alumno.
 */
export class CreatePayments1710000000006 implements MigrationInterface {
  name = 'CreatePayments1710000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "payment_status_enum" AS ENUM('PENDING','APPROVED','REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "payment_method_enum" AS ENUM('BCP_SOLES','INTERBANK','OTHER')`,
    );

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "enrollmentId" uuid NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'PEN',
        "method" "payment_method_enum" NOT NULL DEFAULT 'BCP_SOLES',
        "receiptKey" character varying NOT NULL,
        "operationNumber" character varying,
        "declaredPaidAt" TIMESTAMP,
        "status" "payment_status_enum" NOT NULL DEFAULT 'PENDING',
        "reviewedBy" uuid,
        "reviewedAt" TIMESTAMP,
        "rejectionReason" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payments_enrollment" FOREIGN KEY ("enrollmentId")
          REFERENCES "enrollments"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_payments_enrollmentId" ON "payments" ("enrollmentId")`);
    await queryRunner.query(`CREATE INDEX "IDX_payments_status" ON "payments" ("status")`);
    // El reporte de ingresos filtra por estado y agrupa por mes de revisión.
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_status_reviewedAt" ON "payments" ("status", "reviewedAt")`,
    );
    // Un solo comprobante en revisión por inscripción.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_payments_one_pending" ON "payments" ("enrollmentId")
       WHERE "status" = 'PENDING'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TYPE "payment_method_enum"`);
    await queryRunner.query(`DROP TYPE "payment_status_enum"`);
  }
}
