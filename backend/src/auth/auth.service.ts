import { createHmac, timingSafeEqual } from "node:crypto";

import { Inject, Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type AuthSession = {
  readonly username: string;
};

type SessionPayload = {
  readonly username: string;
  readonly expiresAt: number;
};

const SESSION_COOKIE_NAME = "beacon_watch_session";
const DEFAULT_SESSION_TTL_SECONDS = 86_400;

export type AuthClock = () => number;
export const AUTH_CLOCK = Symbol("AUTH_CLOCK");

@Injectable()
export class AuthService {
  private readonly getNow: AuthClock;

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Optional() @Inject(AUTH_CLOCK) getNow?: AuthClock,
  ) {
    this.getNow = getNow ?? Date.now;
  }

  get sessionCookieName(): string {
    return SESSION_COOKIE_NAME;
  }

  get sessionTtlMs(): number {
    return this.getSessionTtlSeconds() * 1_000;
  }

  verifyCredentials(username: string, password: string): boolean {
    return (
      safeEquals(username, this.getRequiredConfig("ADMIN_USERNAME")) &&
      safeEquals(password, this.getRequiredConfig("ADMIN_PASSWORD"))
    );
  }

  createSessionToken(): string {
    const payload: SessionPayload = {
      username: this.getRequiredConfig("ADMIN_USERNAME"),
      expiresAt: this.getNow() + this.sessionTtlMs,
    };
    const encodedPayload = encodeBase64Url(JSON.stringify(payload));
    const signature = this.sign(encodedPayload);

    return `${encodedPayload}.${signature}`;
  }

  validateSessionToken(token: string): AuthSession | null {
    const [encodedPayload, signature, extra] = token.split(".");
    if (!encodedPayload || !signature || extra !== undefined) {
      return null;
    }

    if (!safeEquals(signature, this.sign(encodedPayload))) {
      return null;
    }

    const payload = parseSessionPayload(encodedPayload);
    if (!payload) {
      return null;
    }

    if (payload.expiresAt <= this.getNow()) {
      return null;
    }

    const adminUsername = this.getRequiredConfig("ADMIN_USERNAME");
    if (!safeEquals(payload.username, adminUsername)) {
      return null;
    }

    return { username: payload.username };
  }

  extractSessionToken(cookieHeader: string | undefined): string | null {
    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader.split(";");
    for (const cookie of cookies) {
      const [rawName, ...rawValueParts] = cookie.trim().split("=");
      if (rawName === SESSION_COOKIE_NAME) {
        return rawValueParts.join("=") || null;
      }
    }

    return null;
  }

  isCookieSecure(): boolean {
    return this.configService.get<string>("AUTH_COOKIE_SECURE", "true") === "true";
  }

  private sign(encodedPayload: string): string {
    return createHmac("sha256", this.getRequiredConfig("AUTH_SESSION_SECRET"))
      .update(encodedPayload)
      .digest("base64url");
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`${key} is required`);
    }

    return value;
  }

  private getSessionTtlSeconds(): number {
    const value = Number(
      this.configService.get<string>(
        "AUTH_SESSION_TTL_SECONDS",
        String(DEFAULT_SESSION_TTL_SECONDS),
      ),
    );

    return Number.isFinite(value) && value > 0
      ? value
      : DEFAULT_SESSION_TTL_SECONDS;
  }
}

function safeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function parseSessionPayload(encodedPayload: string): SessionPayload | null {
  try {
    const parsedPayload = JSON.parse(decodeBase64Url(encodedPayload)) as unknown;
    if (!isSessionPayload(parsedPayload)) {
      return null;
    }

    return parsedPayload;
  } catch {
    return null;
  }
}

function isSessionPayload(payload: unknown): payload is SessionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "username" in payload &&
    "expiresAt" in payload &&
    typeof payload.username === "string" &&
    typeof payload.expiresAt === "number"
  );
}
