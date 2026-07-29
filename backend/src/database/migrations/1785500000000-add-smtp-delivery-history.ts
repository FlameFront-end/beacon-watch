import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddSmtpDeliveryHistory1785500000000 implements MigrationInterface {
  name = "AddSmtpDeliveryHistory1785500000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "smtp_deliveries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "status" varchar(32) NOT NULL,
        "messageId" text NOT NULL,
        "sender" text NOT NULL,
        "recipient" text NOT NULL,
        "subject" text NOT NULL,
        "preview" text NOT NULL,
        "messageSize" integer NOT NULL,
        "attemptCount" integer NOT NULL DEFAULT 0,
        "queueId" text NULL,
        "errorCategory" text NULL,
        "errorMessage" text NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "completedAt" timestamptz NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_smtp_deliveries_message_id"
      ON "smtp_deliveries" ("messageId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_smtp_deliveries_status_created"
      ON "smtp_deliveries" ("status", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_smtp_deliveries_recipient_created"
      ON "smtp_deliveries" ("recipient", "createdAt")
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "smtp_delivery_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "deliveryId" uuid NOT NULL REFERENCES "smtp_deliveries"("id") ON DELETE CASCADE,
        "eventId" text NOT NULL,
        "source" text NOT NULL,
        "status" varchar(32) NOT NULL,
        "queueId" text NULL,
        "mxHost" text NULL,
        "smtpCode" integer NULL,
        "errorCategory" text NULL,
        "message" text NULL,
        "details" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_smtp_delivery_events_source_id"
      ON "smtp_delivery_events" ("source", "eventId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_smtp_delivery_events_delivery_time"
      ON "smtp_delivery_events" ("deliveryId", "createdAt")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "smtp_delivery_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "smtp_deliveries"`);
  }
}
