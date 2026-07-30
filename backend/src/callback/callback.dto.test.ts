import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BadRequestException } from "@nestjs/common";

import { parseCallbackListQuery } from "./callback.dto.js";

describe("parseCallbackListQuery", () => {
  it("rejects an inverted date range", () => {
    assert.throws(
      () => parseCallbackListQuery({
        from: "2026-07-30T12:00:00.000Z",
        to: "2026-07-30T11:00:00.000Z",
      }),
      BadRequestException,
    );
  });

  it("rejects an overlong source IP filter", () => {
    assert.throws(
      () => parseCallbackListQuery({ sourceIp: "1".repeat(129) }),
      BadRequestException,
    );
  });

  it("accepts only explicit callback list sort fields", () => {
    assert.deepEqual(
      {
        sortBy: parseCallbackListQuery({ sortBy: "sourceIp", sortDirection: "asc" }).sortBy,
        sortDirection: parseCallbackListQuery({ sortBy: "sourceIp", sortDirection: "asc" }).sortDirection,
      },
      { sortBy: "sourceIp", sortDirection: "ASC" },
    );
    assert.deepEqual(
      {
        sortBy: parseCallbackListQuery({ sortBy: "body", sortDirection: "sideways" }).sortBy,
        sortDirection: parseCallbackListQuery({ sortBy: "body", sortDirection: "sideways" }).sortDirection,
      },
      { sortBy: "timestamp", sortDirection: "DESC" },
    );
  });
});
