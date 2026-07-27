import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddSocks5SmtpProxy1785090000000 implements MigrationInterface {
  name = "AddSocks5SmtpProxy1785090000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "smtp_settings"
      ADD COLUMN IF NOT EXISTS "proxyHost" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "proxyPort" integer NOT NULL DEFAULT 1080,
      ADD COLUMN IF NOT EXISTS "proxyUser" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "encryptedProxyPassword" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "proxyPasswordIv" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "proxyPasswordTag" text NOT NULL DEFAULT ''
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "smtp_settings"
      DROP COLUMN IF EXISTS "proxyPasswordTag",
      DROP COLUMN IF EXISTS "proxyPasswordIv",
      DROP COLUMN IF EXISTS "encryptedProxyPassword",
      DROP COLUMN IF EXISTS "proxyUser",
      DROP COLUMN IF EXISTS "proxyPort",
      DROP COLUMN IF EXISTS "proxyHost"
    `);
  }
}
