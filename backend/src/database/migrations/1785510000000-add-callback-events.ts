import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCallbackEvents1785510000000 implements MigrationInterface {
  name = "AddCallbackEvents1785510000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "callback_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "timestamp" timestamptz NOT NULL,
        "sourceIp" varchar(128) NOT NULL,
        "userAgent" text NULL,
        "method" varchar(8) NOT NULL,
        "url" text NOT NULL,
        "headers" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "queryParams" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "body" text NULL,
        "status" varchar(16) NOT NULL DEFAULT 'received',
        "processedAt" timestamptz NULL,
        "targetId" text NULL,
        "payload" text NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_callback_events_timestamp"
      ON "callback_events" ("timestamp")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_callback_events_source_ip"
      ON "callback_events" ("sourceIp")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_callback_events_status"
      ON "callback_events" ("status")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "callback_events"`);
  }
}
