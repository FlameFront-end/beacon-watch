import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isPublicIngestCorsRequest,
  parseCorsOrigins,
} from "./cors.js";

describe("parseCorsOrigins", () => {
  it("returns no origins when cross-origin access is not configured", () => {
    assert.deepEqual(parseCorsOrigins(undefined), []);
    assert.deepEqual(parseCorsOrigins("  "), []);
  });

  it("normalizes an explicit origin allowlist", () => {
    assert.deepEqual(
      parseCorsOrigins(" https://admin.example.com,https://ops.example.com "),
      ["https://admin.example.com", "https://ops.example.com"],
    );
  });

  it("rejects wildcards and invalid origins", () => {
    assert.throws(() => parseCorsOrigins("*"), {
      message: "CORS_ORIGINS must contain absolute HTTP(S) origins",
    });
    assert.throws(() => parseCorsOrigins("admin.example.com"), {
      message: "CORS_ORIGINS must contain absolute HTTP(S) origins",
    });
  });
});

describe("isPublicIngestCorsRequest", () => {
  it("allows only public ingestion posts and their preflight requests", () => {
    assert.equal(isPublicIngestCorsRequest("POST", "/beacons"), true);
    assert.equal(isPublicIngestCorsRequest("POST", "/mails"), true);
    assert.equal(isPublicIngestCorsRequest("OPTIONS", "/beacons", "POST"), true);
    assert.equal(isPublicIngestCorsRequest("GET", "/beacons"), false);
    assert.equal(isPublicIngestCorsRequest("OPTIONS", "/auth/login", "POST"), false);
  });
});
