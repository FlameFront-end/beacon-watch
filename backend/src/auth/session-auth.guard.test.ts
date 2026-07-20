import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

import { AuthService } from "./auth.service.js";
import { SessionAuthGuard } from "./session-auth.guard.js";

describe("SessionAuthGuard", () => {
  it("allows requests with a valid session cookie", () => {
    const authService = createAuthService();
    const guard = new SessionAuthGuard(authService);
    const token = authService.createSessionToken();

    assert.equal(
      guard.canActivate(createHttpContext(`beacon_watch_session=${token}`)),
      true,
    );
  });

  it("rejects requests without a valid session cookie", () => {
    const guard = new SessionAuthGuard(createAuthService());

    assert.throws(
      () => guard.canActivate(createHttpContext("beacon_watch_session=invalid")),
      UnauthorizedException,
    );
  });
});

function createAuthService(): AuthService {
  const configService = {
    get: <T>(key: string, fallback?: T): T | undefined => {
      const values: Record<string, string> = {
        ADMIN_USERNAME: "admin",
        ADMIN_PASSWORD: "admin",
        AUTH_SESSION_SECRET: "test-secret",
      };

      return (values[key] ?? fallback) as T | undefined;
    },
  };

  return new AuthService(configService as ConfigService, () => 1_000);
}

function createHttpContext(cookie?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {
          cookie,
        },
      }),
    }),
  } as ExecutionContext;
}
