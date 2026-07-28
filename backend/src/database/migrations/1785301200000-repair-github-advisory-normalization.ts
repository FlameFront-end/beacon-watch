import type { MigrationInterface, QueryRunner } from "typeorm";

export class RepairGithubAdvisoryNormalization1785301200000 implements MigrationInterface {
  name = "RepairGithubAdvisoryNormalization1785301200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vulnerability_source_records"
      ADD COLUMN IF NOT EXISTS "normalizationVersion" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "vulnerability_source_records"
      ADD COLUMN IF NOT EXISTS "withdrawnAt" TIMESTAMP WITH TIME ZONE
    `);
    await queryRunner.query(`
      ALTER TABLE "vulnerabilities"
      ADD COLUMN IF NOT EXISTS "epssPercentage" real
    `);
    await queryRunner.query(`
      ALTER TABLE "vulnerabilities"
      ADD COLUMN IF NOT EXISTS "epssPercentile" real
    `);
    await queryRunner.query(`
      UPDATE "vulnerability_source_records"
      SET "withdrawnAt" = NULLIF("rawPayload"->>'withdrawn_at', '')::timestamptz
      WHERE "source" = 'github_advisory'
        AND "rawPayload" ? 'withdrawn_at'
        AND "rawPayload"->>'withdrawn_at' IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vulnerabilities"
      DROP COLUMN IF EXISTS "epssPercentile"
    `);
    await queryRunner.query(`
      ALTER TABLE "vulnerabilities"
      DROP COLUMN IF EXISTS "epssPercentage"
    `);
    await queryRunner.query(`
      ALTER TABLE "vulnerability_source_records"
      DROP COLUMN IF EXISTS "withdrawnAt"
    `);
    await queryRunner.query(`
      ALTER TABLE "vulnerability_source_records"
      DROP COLUMN IF EXISTS "normalizationVersion"
    `);
  }
}
