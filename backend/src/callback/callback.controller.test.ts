import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { INestApplication } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { getRepositoryToken } from "@nestjs/typeorm";

import { AuthService } from "../auth/auth.service.js";
import { CallbackEventEntity } from "./callback.entity.js";
import { CallbackController } from "./callback.controller.js";
import { CallbackService } from "./callback.service.js";

describe("CallbackController", () => {
  let app: INestApplication | null = null;

  afterEach(async () => {
    await app?.close();
    app = null;
  });

  it("returns 200 for the public callback endpoint even when storage fails", async () => {
    @Module({
      controllers: [CallbackController],
      providers: [
        {
          provide: CallbackService,
          useValue: {
            record: async () => {
              throw new Error("unexpected storage failure");
            },
          },
        },
        {
          provide: AuthService,
          useValue: {
            extractSessionToken: () => null,
            validateSessionToken: () => null,
          },
        },
      ],
    })
    class TestModule {}

    app = await NestFactory.create(TestModule, { logger: false });
    await app.listen(0);
    const address = app.getHttpServer().address() as { readonly port: number };

    const response = await fetch(`http://127.0.0.1:${address.port}/api/callback`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.10",
      },
      body: JSON.stringify({ payload: "proof" }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });

  it("stores public callbacks and exposes them only to an admin session", async () => {
    const callbackRepository = createCallbackRepository();

    @Module({
      controllers: [CallbackController],
      providers: [
        CallbackService,
        Reflector,
        {
          provide: getRepositoryToken(CallbackEventEntity),
          useValue: callbackRepository,
        },
        {
          provide: AuthService,
          useFactory: () => createAuthService(),
        },
      ],
    })
    class TestModule {}

    app = await NestFactory.create(TestModule, { logger: false });
    await app.listen(0);
    const address = app.getHttpServer().address() as { readonly port: number };
    const origin = `http://127.0.0.1:${address.port}`;

    const publicResponse = await fetch(`${origin}/api/callback?targetId=target-1`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.10",
      },
      body: JSON.stringify({ payload: "proof" }),
    });

    assert.equal(publicResponse.status, 200);
    assert.equal((await fetch(`${origin}/api/callback`)).status, 401);

    const authService = app.get(AuthService);
    const token = authService.createSessionToken();
    const listResponse = await fetch(`${origin}/api/callback`, {
      headers: { cookie: `beacon_watch_session=${token}` },
    });

    assert.equal(listResponse.status, 200);
    const list = await listResponse.json() as { readonly items: readonly CallbackEventEntity[] };
    assert.equal(list.items.length, 1);
    assert.equal(list.items[0]?.sourceIp, "203.0.113.10");
    assert.equal(list.items[0]?.targetId, "target-1");
    assert.equal(list.items[0]?.payload, "proof");

    const detailResponse = await fetch(`${origin}/api/callback/${list.items[0]?.id}`, {
      headers: { cookie: `beacon_watch_session=${token}` },
    });
    assert.equal(detailResponse.status, 200);
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

function createCallbackRepository() {
  const events: CallbackEventEntity[] = [];

  return {
    create: (event: Partial<CallbackEventEntity>) => event as CallbackEventEntity,
    save: async (event: CallbackEventEntity) => {
      const saved = {
        ...event,
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      } as CallbackEventEntity;
      events.push(saved);
      return saved;
    },
    findAndCount: async () => [events, events.length],
    findOne: async ({ where }: { readonly where?: { readonly id?: string } }) =>
      events.find((event) => event.id === where?.id) ?? events[0] ?? null,
    count: async () => events.length,
    find: async () => events.slice(0, 5),
    delete: async ({ id }: { readonly id: string }) => {
      const index = events.findIndex((event) => event.id === id);
      if (index === -1) {
        return { affected: 0 };
      }
      events.splice(index, 1);
      return { affected: 1 };
    },
    createQueryBuilder: () => ({
      delete: () => ({
        from: () => ({
          where: () => ({
            execute: async () => ({ affected: 0 }),
          }),
          execute: async () => ({ affected: events.splice(0, events.length).length }),
        }),
      }),
    }),
  };
}
