import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type { ConfigService } from "@nestjs/config";

import { AuthService } from "./auth.service.js";

describe("AuthService", () => {
  it("accepts only configured admin credentials", () => {
    const service = createAuthService({
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "admin",
      AUTH_SESSION_SECRET: "test-secret",
    });

    assert.equal(service.verifyCredentials("admin", "admin"), true);
    assert.equal(service.verifyCredentials("admin", "wrong"), false);
    assert.equal(service.verifyCredentials("wrong", "admin"), false);
  });

  it("creates signed session tokens that cannot be tampered with", () => {
    const service = createAuthService({
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "admin",
      AUTH_SESSION_SECRET: "test-secret",
    });

    const token = service.createSessionToken();
    const session = service.validateSessionToken(token);
    const tamperedToken = `${token.slice(0, -1)}${
      token.endsWith("a") ? "b" : "a"
    }`;

    assert.deepEqual(session, { username: "admin" });
    assert.equal(service.validateSessionToken(tamperedToken), null);
  });

  it("rejects expired session tokens", () => {
    let now = 1_000;
    const service = createAuthService(
      {
        ADMIN_USERNAME: "admin",
        ADMIN_PASSWORD: "admin",
        AUTH_SESSION_SECRET: "test-secret",
        AUTH_SESSION_TTL_SECONDS: "1",
      },
      () => now,
    );

    const token = service.createSessionToken();
    now = 2_001;

    assert.equal(service.validateSessionToken(token), null);
  });

  it("uses secure cookies by default and allows an explicit local opt-out", () => {
    const secureService = createAuthService({
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "admin",
      AUTH_SESSION_SECRET: "test-secret",
    });
    const localHttpService = createAuthService({
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "admin",
      AUTH_SESSION_SECRET: "test-secret",
      AUTH_COOKIE_SECURE: "false",
    });

    assert.equal(secureService.isCookieSecure(), true);
    assert.equal(localHttpService.isCookieSecure(), false);
  });
});

function createAuthService(
  values: Record<string, string>,
  getNow = () => 1_000,
): AuthService {
  const configService = {
    get: <T>(key: string, fallback?: T): T | undefined =>
      (values[key] ?? fallback) as T | undefined,
  };

  return new AuthService(configService as ConfigService, getNow);
}
