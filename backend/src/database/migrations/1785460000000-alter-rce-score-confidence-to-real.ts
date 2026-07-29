import type { MigrationInterface, QueryRunner } from "typeorm";

export class AlterRceScoreConfidenceToReal1785460000000 implements MigrationInterface {
  name = "AlterRceScoreConfidenceToReal1785460000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vulnerabilities"
      ALTER COLUMN "rceScoreConfidence" TYPE real
      USING "rceScoreConfidence"::real
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vulnerabilities"
      ALTER COLUMN "rceScoreConfidence" TYPE integer
      USING ROUND("rceScoreConfidence")::integer
    `);
  }
}
