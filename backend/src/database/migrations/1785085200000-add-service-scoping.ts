import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddServiceScoping1785085200000 implements MigrationInterface {
  name = "AddServiceScoping1785085200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "beacons"
      ADD COLUMN IF NOT EXISTS "serviceKey" varchar NOT NULL DEFAULT 'owa'
    `);
    await queryRunner.query(`
      ALTER TABLE "mails"
      ADD COLUMN IF NOT EXISTS "serviceKey" varchar NOT NULL DEFAULT 'owa'
    `);
    await queryRunner.query(`
      ALTER TABLE "mails"
      DROP CONSTRAINT IF EXISTS "UQ_mails_external_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "mails"
      ADD CONSTRAINT "UQ_mails_service_external_id"
      UNIQUE ("serviceKey", "externalId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_beacons_service_received"
      ON "beacons" ("serviceKey", "receivedAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mails_service_received"
      ON "mails" ("serviceKey", "receivedAt")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_mails_service_received"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_beacons_service_received"',
    );
    await queryRunner.query(`
      ALTER TABLE "mails"
      DROP CONSTRAINT IF EXISTS "UQ_mails_service_external_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "mails"
      ADD CONSTRAINT "UQ_mails_external_id" UNIQUE ("externalId")
    `);
    await queryRunner.query(
      'ALTER TABLE "mails" DROP COLUMN IF EXISTS "serviceKey"',
    );
    await queryRunner.query(
      'ALTER TABLE "beacons" DROP COLUMN IF EXISTS "serviceKey"',
    );
  }
}
