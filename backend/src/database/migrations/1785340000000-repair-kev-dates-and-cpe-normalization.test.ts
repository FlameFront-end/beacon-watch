import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { QueryRunner } from "typeorm";

import { RepairKevDatesAndCpeNormalization1785340000000 } from "./1785340000000-repair-kev-dates-and-cpe-normalization.js";

function createQueryRunner(): { runner: QueryRunner; statements: string[] } {
  const statements: string[] = [];
  const runner = {
    query: async (sql: string) => {
      statements.push(sql.replace(/\s+/g, " ").trim());
      return [];
    },
  } as unknown as QueryRunner;

  return { runner, statements };
}

describe("RepairKevDatesAndCpeNormalization", () => {
  it("adds the kevDateAdded column idempotently", async () => {
    const { runner, statements } = createQueryRunner();

    await new RepairKevDatesAndCpeNormalization1785340000000().up(runner);

    const addColumn = statements.find((sql) => sql.includes("ADD COLUMN"));
    assert.ok(addColumn, "expected the column to be added");
    // Re-running the migration on a database that already has the column must not fail.
    assert.match(addColumn, /ADD COLUMN IF NOT EXISTS "kevDateAdded"/);
    assert.match(addColumn, /TIMESTAMP WITH TIME ZONE/);
  });

  it("recovers the catalog date from the stored KEV payload, not from modifiedAt", async () => {
    const { runner, statements } = createQueryRunner();

    await new RepairKevDatesAndCpeNormalization1785340000000().up(runner);

    const backfill = statements.find((sql) => sql.includes('SET "kevDateAdded"'));
    assert.ok(backfill, "expected a kevDateAdded backfill");
    // Reading the payload keeps the value correct even where NVD later overwrote modifiedAt.
    assert.match(backfill, /"rawPayload"->>'dateAdded'/);
    assert.match(backfill, /"source" = 'cisa_kev'/);
    assert.ok(
      !/SET "kevDateAdded" = [^ ]*"modifiedAt"/.test(backfill),
      "must not copy the possibly-overwritten modifiedAt",
    );
  });

  it("filters malformed KEV catalog dates before converting them", async () => {
    const { runner, statements } = createQueryRunner();

    await new RepairKevDatesAndCpeNormalization1785340000000().up(runner);

    const backfill = statements.find((sql) => sql.includes('SET "kevDateAdded"'));
    assert.ok(backfill, "expected a kevDateAdded backfill");
    assert.match(backfill, /CASE WHEN/);
    assert.match(backfill, /to_date/);
    assert.match(backfill, /\[0-9\]\{4\}/);
    assert.ok(
      !/NULLIF\("rawPayload"->>'dateAdded', ''\)::timestamptz/.test(backfill),
      "must not cast an unvalidated payload value directly",
    );
  });

  it("clears only the modifiedAt values that CISA KEV owns", async () => {
    const { runner, statements } = createQueryRunner();

    await new RepairKevDatesAndCpeNormalization1785340000000().up(runner);

    const ownedClear = statements.find(
      (sql) => sql.includes(`"fieldSources"->>'modifiedAt' = 'cisa_kev'`),
    );
    assert.ok(ownedClear, "expected the field-ownership-guarded clear");
    assert.match(ownedClear, /SET "modifiedAt" = NULL/);
    // Ownership is dropped alongside the value so a later NVD sync can populate the field.
    assert.match(ownedClear, /"fieldSources" - 'modifiedAt'/);
  });

  it("does not touch a record that any non-KEV source also contributed to", async () => {
    const { runner, statements } = createQueryRunner();

    await new RepairKevDatesAndCpeNormalization1785340000000().up(runner);

    const legacyClear = statements.find(
      (sql) =>
        sql.includes('SET "modifiedAt" = NULL') &&
        sql.includes(`"fieldSources"->>'modifiedAt' IS NULL`),
    );
    assert.ok(legacyClear, "expected the pre-fieldSources repair");
    // Guards that together identify the dateAdded leak and nothing else.
    assert.match(legacyClear, /"publishedAt" IS NULL/);
    assert.match(legacyClear, /NOT EXISTS/);
    assert.match(legacyClear, /"source" <> 'cisa_kev'/);
  });

  it("re-arms re-normalization without erasing progress below the new version", async () => {
    const { runner, statements } = createQueryRunner();

    await new RepairKevDatesAndCpeNormalization1785340000000().up(runner);

    const rearm = statements.find((sql) => sql.includes('"normalizationVersion"'));
    assert.ok(rearm, "expected the normalization version to be re-armed");
    // Records already sit at 2 or below and qualify untouched; only rows a re-run pushed past
    // the new version are clamped back.
    assert.match(rearm, /SET "normalizationVersion" = 2 WHERE "normalizationVersion" > 2/);
  });

  it("applies to every source rather than only GitHub", async () => {
    const { runner, statements } = createQueryRunner();

    await new RepairKevDatesAndCpeNormalization1785340000000().up(runner);

    const rearm = statements.find((sql) => sql.includes('SET "normalizationVersion"'));
    assert.ok(rearm);
    // The CPE and CVSS v4 fixes affect NVD payloads, so the re-arm must not filter by source.
    assert.ok(
      !rearm.includes("github_advisory"),
      "the re-normalization re-arm must not be scoped to one source",
    );
  });

  it("issues no unconditional destructive statement", async () => {
    const { runner, statements } = createQueryRunner();

    await new RepairKevDatesAndCpeNormalization1785340000000().up(runner);

    for (const sql of statements) {
      assert.ok(!sql.startsWith("DROP TABLE"), `unexpected destructive statement: ${sql}`);
      assert.ok(!sql.startsWith("TRUNCATE"), `unexpected destructive statement: ${sql}`);
      if (sql.startsWith("DELETE")) {
        assert.fail(`migration must not delete rows: ${sql}`);
      }
      if (sql.startsWith("UPDATE")) {
        assert.ok(/\bWHERE\b/.test(sql), `UPDATE without a guard: ${sql}`);
      }
    }
  });

  it("drops only the column it added when rolled back", async () => {
    const { runner, statements } = createQueryRunner();

    await new RepairKevDatesAndCpeNormalization1785340000000().down(runner);

    assert.equal(statements.length, 1);
    assert.match(statements[0], /DROP COLUMN IF EXISTS "kevDateAdded"/);
  });
});
