import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Vendor and product became precedence-owned fields, but the original fieldSources backfill
 * (LiveFirstVulnerabilityMonitoring1785110000000) never assigned an owner for them. An absent
 * owner makes winsPrecedence() fall through to "any source may write", so on legacy rows the
 * coarse CISA KEV vendorProject/product could still overwrite the structured NVD CPE values.
 *
 * Assign the owner the same way the original backfill did: the most authoritative source that
 * actually contributed a source record for the row. Only rows that carry a value are stamped —
 * a NULL vendor/product must stay open for enrichment by any later source.
 */
export class BackfillVendorProductFieldSources1785310000000 implements MigrationInterface {
  name = "BackfillVendorProductFieldSources1785310000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const field of ["vendor", "product"]) {
      await queryRunner.query(`
        UPDATE "vulnerabilities" vulnerability
        SET "fieldSources" = vulnerability."fieldSources" || jsonb_build_object(
          '${field}',
          CASE
            WHEN EXISTS (
              SELECT 1 FROM "vulnerability_source_records" source_record
              WHERE source_record."vulnerabilityId" = vulnerability."id"
                AND source_record."source" = 'nvd'
            ) THEN 'nvd'
            WHEN EXISTS (
              SELECT 1 FROM "vulnerability_source_records" source_record
              WHERE source_record."vulnerabilityId" = vulnerability."id"
                AND source_record."source" = 'github_advisory'
            ) THEN 'github_advisory'
            ELSE 'cisa_kev'
          END
        )
        WHERE vulnerability."${field}" IS NOT NULL
          AND vulnerability."fieldSources" -> '${field}' IS NULL
      `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "vulnerabilities"
      SET "fieldSources" = "fieldSources" - 'vendor' - 'product'
    `);
  }
}
