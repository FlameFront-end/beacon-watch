import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCorporateXssWatchRules1785320000000 implements MigrationInterface {
  name = "AddCorporateXssWatchRules1785320000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vulnerability_watch_rules"
      ADD COLUMN IF NOT EXISTS "requireCorporateXss" boolean NOT NULL DEFAULT false
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vulnerability_watch_rules"
      DROP COLUMN IF EXISTS "requireCorporateXss"
    `);
  }
}
