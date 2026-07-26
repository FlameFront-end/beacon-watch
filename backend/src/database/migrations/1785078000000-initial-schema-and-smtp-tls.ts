import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchemaAndSmtpTls1785078000000
  implements MigrationInterface
{
  name = "InitialSchemaAndSmtpTls1785078000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE "beacons_type_enum" AS ENUM ('loot', 'heartbeat');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END
      $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "beacons" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "receivedAt" timestamptz NOT NULL DEFAULT now(),
        "type" "beacons_type_enum" NOT NULL,
        "cookies" text,
        "mbxGuid" varchar,
        "forest" varchar,
        "heartbeat" varchar,
        "httpStatus" integer,
        "raw" jsonb NOT NULL,
        CONSTRAINT "PK_beacons" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mails" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "receivedAt" timestamptz NOT NULL DEFAULT now(),
        "externalId" text NOT NULL,
        "changeKey" text NOT NULL,
        "subject" text NOT NULL,
        "sender" text NOT NULL,
        "senderEmail" text NOT NULL,
        "mailDate" timestamptz NOT NULL,
        "hasAttachments" boolean NOT NULL,
        "isRead" boolean NOT NULL,
        "size" integer NOT NULL,
        "body" text NOT NULL,
        "raw" jsonb NOT NULL,
        CONSTRAINT "PK_mails" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_mails_external_id" UNIQUE ("externalId")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "smtp_settings" (
        "id" integer NOT NULL,
        "host" text NOT NULL,
        "port" integer NOT NULL,
        "secure" boolean NOT NULL,
        "requireTls" boolean NOT NULL DEFAULT false,
        "from" text NOT NULL,
        "user" text NOT NULL,
        "encryptedPassword" text NOT NULL,
        "passwordIv" text NOT NULL,
        "passwordTag" text NOT NULL,
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_smtp_settings" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "smtp_settings"
      ADD COLUMN IF NOT EXISTS "requireTls" boolean NOT NULL DEFAULT false
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "smtp_settings" DROP COLUMN IF EXISTS "requireTls"',
    );
  }
}
