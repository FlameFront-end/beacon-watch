import type { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillGithubAdvisoryPackages1785211200000 implements MigrationInterface {
  name = "BackfillGithubAdvisoryPackages1785211200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH github_packages AS (
        SELECT
          source_record."vulnerabilityId",
          array_agg(DISTINCT affected_package->'package'->>'ecosystem')
            FILTER (WHERE affected_package->'package'->>'ecosystem' IS NOT NULL) AS ecosystems,
          array_agg(DISTINCT affected_package->'package'->>'name')
            FILTER (WHERE affected_package->'package'->>'name' IS NOT NULL) AS package_names,
          array_agg(DISTINCT affected_package->>'vulnerable_version_range')
            FILTER (WHERE affected_package->>'vulnerable_version_range' IS NOT NULL) AS affected_versions,
          array_agg(DISTINCT CASE jsonb_typeof(affected_package->'first_patched_version')
            WHEN 'string' THEN affected_package->>'first_patched_version'
            WHEN 'object' THEN affected_package->'first_patched_version'->>'identifier'
            ELSE NULL
          END) FILTER (WHERE affected_package->'first_patched_version' IS NOT NULL) AS fixed_versions
        FROM "vulnerability_source_records" source_record
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(source_record."rawPayload"->'vulnerabilities') = 'array'
              THEN source_record."rawPayload"->'vulnerabilities'
            ELSE '[]'::jsonb
          END
        ) affected_package
        WHERE source_record."source" = 'github_advisory'
          AND source_record."vulnerabilityId" IS NOT NULL
        GROUP BY source_record."vulnerabilityId"
      )
      UPDATE "vulnerabilities" vulnerability
      SET
        "product" = COALESCE(
          NULLIF(vulnerability."product", ''),
          github_packages.package_names[1]
        ),
        "ecosystems" = ARRAY(
          SELECT DISTINCT value
          FROM unnest(
            vulnerability."ecosystems" || COALESCE(github_packages.ecosystems, '{}'::text[])
          ) value
          WHERE value IS NOT NULL AND btrim(value) <> ''
        ),
        "packageNames" = ARRAY(
          SELECT DISTINCT value
          FROM unnest(
            vulnerability."packageNames" || COALESCE(github_packages.package_names, '{}'::text[])
          ) value
          WHERE value IS NOT NULL AND btrim(value) <> ''
        ),
        "affectedVersions" = ARRAY(
          SELECT DISTINCT value
          FROM unnest(
            vulnerability."affectedVersions" || COALESCE(github_packages.affected_versions, '{}'::text[])
          ) value
          WHERE value IS NOT NULL AND btrim(value) <> ''
        ),
        "fixedVersions" = ARRAY(
          SELECT DISTINCT value
          FROM unnest(
            vulnerability."fixedVersions" || COALESCE(github_packages.fixed_versions, '{}'::text[])
          ) value
          WHERE value IS NOT NULL AND btrim(value) <> ''
        )
      FROM github_packages
      WHERE vulnerability."id" = github_packages."vulnerabilityId"
    `);
  }

  down(): Promise<void> {
    return Promise.resolve();
  }
}
