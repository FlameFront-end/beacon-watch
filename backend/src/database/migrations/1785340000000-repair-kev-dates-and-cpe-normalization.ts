import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Repairs three normalization defects and re-arms the versioned re-normalization pass.
 *
 * 1. CISA KEV published its catalog `dateAdded` into `vulnerabilities.modifiedAt`. That is a
 *    catalog event, not a property of the CVE, and it let long-published CVEs outrank genuinely
 *    new ones on a modifiedAt sort. It now lives in its own `kevDateAdded` column.
 * 2. NVD vendor/product were read from the first CPE match, which is frequently a
 *    non-vulnerable platform entry or a wildcard, producing "Product not specified".
 * 3. NVD CVSS v4 metric blocks were ignored entirely.
 *
 * Corrections 2 and 3 need the normalizer to run again over stored payloads, so every source
 * record is reset below the new normalization version. The collector re-normalizes them in
 * bounded batches after startup; nothing is deleted and no live value is overwritten here
 * except the demonstrably wrong KEV-sourced `modifiedAt`.
 */
export class RepairKevDatesAndCpeNormalization1785340000000 implements MigrationInterface {
  name = "RepairKevDatesAndCpeNormalization1785340000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vulnerabilities"
      ADD COLUMN IF NOT EXISTS "kevDateAdded" TIMESTAMP WITH TIME ZONE
    `);

    // Recover the catalog date from the stored KEV payload rather than from modifiedAt, so the
    // value is right even for rows whose modifiedAt was later overwritten by NVD.
    await queryRunner.query(`
      UPDATE "vulnerabilities" AS v
      SET "kevDateAdded" = source_record."dateAdded"
      FROM (
        SELECT
          "vulnerabilityId",
          MIN(
            CASE
              WHEN "rawPayload"->>'dateAdded'
                ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
              THEN CASE
                WHEN to_char(
                  to_date("rawPayload"->>'dateAdded', 'YYYY-MM-DD'),
                  'YYYY-MM-DD'
                ) = "rawPayload"->>'dateAdded'
                THEN to_date(
                  "rawPayload"->>'dateAdded',
                  'YYYY-MM-DD'
                )::timestamp AT TIME ZONE 'UTC'
                ELSE NULL
              END
              ELSE NULL
            END
          ) AS "dateAdded"
        FROM "vulnerability_source_records"
        WHERE "source" = 'cisa_kev'
          AND "vulnerabilityId" IS NOT NULL
          AND NULLIF("rawPayload"->>'dateAdded', '') IS NOT NULL
        GROUP BY "vulnerabilityId"
      ) AS source_record
      WHERE v."id" = source_record."vulnerabilityId"
        AND source_record."dateAdded" IS NOT NULL
        AND v."kevDateAdded" IS DISTINCT FROM source_record."dateAdded"
    `);

    // Clear only the modifiedAt values that CISA KEV actually owns. fieldSources records which
    // source last wrote each field, so rows where NVD or GitHub later supplied a real
    // modification date are left untouched.
    await queryRunner.query(`
      UPDATE "vulnerabilities"
      SET
        "modifiedAt" = NULL,
        "fieldSources" = "fieldSources" - 'modifiedAt'
      WHERE "fieldSources"->>'modifiedAt' = 'cisa_kev'
    `);

    // Same correction for rows written before fieldSources tracked date ownership: the only
    // way a vulnerability has a modifiedAt but no publishedAt and a KEV source record is the
    // dateAdded leak this migration repairs.
    await queryRunner.query(`
      UPDATE "vulnerabilities" AS v
      SET "modifiedAt" = NULL
      WHERE v."modifiedAt" IS NOT NULL
        AND v."publishedAt" IS NULL
        AND v."fieldSources"->>'modifiedAt' IS NULL
        AND EXISTS (
          SELECT 1
          FROM "vulnerability_source_records" source_record
          WHERE source_record."vulnerabilityId" = v."id"
            AND source_record."source" = 'cisa_kev'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "vulnerability_source_records" other_source
          WHERE other_source."vulnerabilityId" = v."id"
            AND other_source."source" <> 'cisa_kev'
        )
    `);

    // Re-arm re-normalization for every source. Version 3 covers the CPE vendor/product fix,
    // CVSS v4 support and UTC-correct date parsing, all of which apply to stored payloads.
    // Records already sit at version 2 or below, so they qualify without being touched; this
    // statement only clamps any row that a re-run or a newer build pushed to 3 or beyond.
    await queryRunner.query(`
      UPDATE "vulnerability_source_records"
      SET "normalizationVersion" = 2
      WHERE "normalizationVersion" > 2
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // modifiedAt values cleared above are not restored: the value they held was the KEV catalog
    // date, which is preserved in kevDateAdded and is not a valid modification date.
    await queryRunner.query(`
      ALTER TABLE "vulnerabilities"
      DROP COLUMN IF EXISTS "kevDateAdded"
    `);
  }
}
