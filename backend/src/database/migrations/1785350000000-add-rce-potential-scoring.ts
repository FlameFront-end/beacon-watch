import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRcePotentialScoring1785350000000 implements MigrationInterface {
  name = "AddRcePotentialScoring1785350000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vulnerabilities"
      ADD COLUMN IF NOT EXISTS "rcePotentialScore" integer NULL,
      ADD COLUMN IF NOT EXISTS "rcePotentialLevel" varchar NULL,
      ADD COLUMN IF NOT EXISTS "rcePath" varchar NULL,
      ADD COLUMN IF NOT EXISTS "rceScoreConfidence" integer NULL,
      ADD COLUMN IF NOT EXISTS "rceScoreVersion" varchar NULL,
      ADD COLUMN IF NOT EXISTS "rceScoreBreakdown" jsonb NULL,
      ADD COLUMN IF NOT EXISTS "rceScoreSummary" text NULL,
      ADD COLUMN IF NOT EXISTS "rceScoreCalculatedAt" timestamptz NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vulnerabilities_rce_potential_score"
      ON "vulnerabilities" ("rcePotentialScore")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vulnerabilities_rce_score_version"
      ON "vulnerabilities" ("rceScoreVersion")
    `);
    await queryRunner.query(`
      ALTER TABLE "vulnerability_watch_rules"
      ADD COLUMN IF NOT EXISTS "minimumRcePotentialScore" integer NULL,
      ADD COLUMN IF NOT EXISTS "rcePaths" text[] NOT NULL DEFAULT '{}'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vulnerability_watch_rules"
      DROP COLUMN IF EXISTS "rcePaths",
      DROP COLUMN IF EXISTS "minimumRcePotentialScore"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_vulnerabilities_rce_score_version"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_vulnerabilities_rce_potential_score"
    `);
    await queryRunner.query(`
      ALTER TABLE "vulnerabilities"
      DROP COLUMN IF EXISTS "rceScoreCalculatedAt",
      DROP COLUMN IF EXISTS "rceScoreSummary",
      DROP COLUMN IF EXISTS "rceScoreBreakdown",
      DROP COLUMN IF EXISTS "rceScoreVersion",
      DROP COLUMN IF EXISTS "rceScoreConfidence",
      DROP COLUMN IF EXISTS "rcePath",
      DROP COLUMN IF EXISTS "rcePotentialLevel",
      DROP COLUMN IF EXISTS "rcePotentialScore"
    `);
  }
}
