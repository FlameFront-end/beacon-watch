import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { QueryRunner } from "typeorm";

import { BackfillVendorProductFieldSources1785310000000 } from "./1785310000000-backfill-vendor-product-field-sources.js";

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

describe("BackfillVendorProductFieldSources", () => {
  it("assigns an owner for both precedence-owned identity fields", async () => {
    const { runner, statements } = createQueryRunner();

    await new BackfillVendorProductFieldSources1785310000000().up(runner);

    assert.equal(statements.length, 2);
    assert.ok(statements.some((sql) => sql.includes("'vendor'")));
    assert.ok(statements.some((sql) => sql.includes("'product'")));
  });

  it("stamps only populated fields and never re-owns a field that already has an owner", async () => {
    const { runner, statements } = createQueryRunner();

    await new BackfillVendorProductFieldSources1785310000000().up(runner);

    for (const sql of statements) {
      // A NULL value must stay open so any later source can still enrich it.
      assert.ok(/IS NOT NULL/.test(sql), `missing populated-value guard: ${sql}`);
      // Never clobber ownership that the live merge path already recorded.
      assert.ok(/"fieldSources" -> '\w+' IS NULL/.test(sql), `missing existing-owner guard: ${sql}`);
    }
  });

  it("prefers NVD over GitHub over CISA when several sources contributed", async () => {
    const { runner, statements } = createQueryRunner();

    await new BackfillVendorProductFieldSources1785310000000().up(runner);

    for (const sql of statements) {
      const nvdIndex = sql.indexOf("'nvd'");
      const githubIndex = sql.indexOf("'github_advisory'");
      const cisaIndex = sql.indexOf("'cisa_kev'");

      assert.ok(nvdIndex >= 0 && githubIndex >= 0 && cisaIndex >= 0);
      assert.ok(nvdIndex < githubIndex, "NVD must be evaluated before GitHub");
      assert.ok(githubIndex < cisaIndex, "GitHub must be evaluated before CISA KEV");
    }
  });

  it("removes only the ownership it introduced when rolled back", async () => {
    const { runner, statements } = createQueryRunner();

    await new BackfillVendorProductFieldSources1785310000000().down(runner);

    assert.equal(statements.length, 1);
    assert.ok(statements[0].includes("- 'vendor' - 'product'"));
  });
});
