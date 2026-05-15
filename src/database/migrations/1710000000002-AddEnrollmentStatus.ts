import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnrollmentStatus1710000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "enrollment_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments"
        ADD COLUMN "status" "enrollment_status_enum" NOT NULL DEFAULT 'PENDING',
        ADD COLUMN "rejectionReason" text,
        ADD COLUMN "reviewedBy" uuid,
        ADD COLUMN "reviewedAt" timestamp`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_enrollments_status" ON "enrollments" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_enrollments_status"`);
    await queryRunner.query(
      `ALTER TABLE "enrollments"
        DROP COLUMN "status",
        DROP COLUMN "rejectionReason",
        DROP COLUMN "reviewedBy",
        DROP COLUMN "reviewedAt"`,
    );
    await queryRunner.query(`DROP TYPE "enrollment_status_enum"`);
  }
}
