import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hora de Perú para lo que calcula Postgres: DEFAULT now() (createdAt,
 * enrolledAt, issuedAt) y DATE_TRUNC del reporte mensual. ALTER DATABASE
 * aplica a sesiones nuevas; SET ajusta la actual.
 */
export class LimaTimezone1710000000008 implements MigrationInterface {
  name = 'LimaTimezone1710000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'America/Lima'); END $$`,
    );
    await queryRunner.query(`SET timezone TO 'America/Lima'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN EXECUTE format('ALTER DATABASE %I RESET timezone', current_database()); END $$`,
    );
  }
}
