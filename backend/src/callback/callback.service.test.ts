import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { Repository } from "typeorm";

import { CallbackEventEntity } from "./callback.entity.js";
import { CallbackService } from "./callback.service.js";

describe("CallbackService", () => {
  it("stores callback request details and extracts target and payload", async () => {
    const savedEvents: CallbackEventEntity[] = [];
    const service = new CallbackService(
      {
        create: (event: Partial<CallbackEventEntity>) => event as CallbackEventEntity,
        save: async (event: CallbackEventEntity) => {
          const saved = {
            ...event,
            id: "callback-1",
          } as CallbackEventEntity;
          savedEvents.push(saved);
          return saved;
        },
      } as unknown as Repository<CallbackEventEntity>,
      { logDirectory: await mkdtemp(join(tmpdir(), "beaconwatch-callback-")) },
      () => new Date("2026-07-30T12:00:00.000Z"),
    );

    const event = await service.record({
      method: "POST",
      protocol: "https",
      host: "rtweriu.com",
      originalUrl: "/api/callback?targetId=owa-1",
      headers: {
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
        "user-agent": "curl/8.0",
        "content-type": "application/json",
      },
      socketRemoteAddress: "10.0.0.2",
      queryParams: { targetId: "owa-1" },
      body: { payload: "rce-confirmed", nested: { ok: true } },
    });

    assert.equal(event.id, "callback-1");
    assert.equal(savedEvents[0]?.timestamp.toISOString(), "2026-07-30T12:00:00.000Z");
    assert.equal(savedEvents[0]?.sourceIp, "203.0.113.10");
    assert.equal(savedEvents[0]?.userAgent, "curl/8.0");
    assert.equal(savedEvents[0]?.method, "POST");
    assert.equal(savedEvents[0]?.url, "https://rtweriu.com/api/callback?targetId=owa-1");
    assert.deepEqual(savedEvents[0]?.queryParams, { targetId: "owa-1" });
    assert.equal(savedEvents[0]?.body, JSON.stringify({ payload: "rce-confirmed", nested: { ok: true } }, null, 2));
    assert.equal(savedEvents[0]?.targetId, "owa-1");
    assert.equal(savedEvents[0]?.payload, "rce-confirmed");
    assert.equal(savedEvents[0]?.status, "processed");
    assert.equal(savedEvents[0]?.processedAt?.toISOString(), "2026-07-30T12:00:00.000Z");
  });

  it("logs storage failures and returns a synthetic received event", async () => {
    const logDirectory = await mkdtemp(join(tmpdir(), "beaconwatch-callback-"));
    const service = new CallbackService(
      {
        create: (event: Partial<CallbackEventEntity>) => event as CallbackEventEntity,
        save: async () => {
          throw new Error("database unavailable");
        },
      } as unknown as Repository<CallbackEventEntity>,
      { logDirectory },
      () => new Date("2026-07-30T12:00:00.000Z"),
    );

    const event = await service.record({
      method: "POST",
      protocol: "https",
      host: "rtweriu.com",
      originalUrl: "/api/callback",
      headers: {},
      socketRemoteAddress: "127.0.0.1",
      queryParams: {},
      body: "raw",
    });

    assert.equal(event.status, "error");
    assert.match(await readFile(join(logDirectory, "callback-errors.log"), "utf8"), /database unavailable/);
  });

  it("stores raw callback bodies as text", async () => {
    let savedEvent: CallbackEventEntity | null = null;
    const service = new CallbackService(
      {
        create: (event: Partial<CallbackEventEntity>) => event as CallbackEventEntity,
        save: async (event: CallbackEventEntity) => {
          savedEvent = {
            ...event,
            id: "callback-raw",
          } as CallbackEventEntity;
          return savedEvent;
        },
      } as unknown as Repository<CallbackEventEntity>,
      { logDirectory: await mkdtemp(join(tmpdir(), "beaconwatch-callback-")) },
      () => new Date("2026-07-30T12:00:00.000Z"),
    );

    await service.record({
      method: "POST",
      protocol: "https",
      host: "rtweriu.com",
      originalUrl: "/api/callback",
      headers: {
        "content-type": "application/octet-stream",
      },
      socketRemoteAddress: "127.0.0.1",
      queryParams: {},
      body: Buffer.from("raw exploit callback"),
    });

    assert.equal(savedEvent?.body, "raw exploit callback");
    assert.equal(savedEvent?.payload, "raw exploit callback");
  });

  it("rejects malformed callback ids before querying postgres uuid columns", async () => {
    let hasQueried = false;
    const service = new CallbackService(
      {
        findOne: async () => {
          hasQueried = true;
          return null;
        },
      } as unknown as Repository<CallbackEventEntity>,
      { logDirectory: await mkdtemp(join(tmpdir(), "beaconwatch-callback-")) },
      () => new Date("2026-07-30T12:00:00.000Z"),
    );

    await assert.rejects(() => service.findById("not-a-uuid"), /must be a UUID/);
    assert.equal(hasQueried, false);
  });

  it("drops callbacks over the per-IP rate limit without writing to the database", async () => {
    let saveCount = 0;
    const service = new CallbackService(
      {
        create: (event: Partial<CallbackEventEntity>) => event as CallbackEventEntity,
        save: async (event: CallbackEventEntity) => {
          saveCount += 1;
          return {
            ...event,
            id: `callback-${saveCount}`,
          } as CallbackEventEntity;
        },
      } as unknown as Repository<CallbackEventEntity>,
      {
        logDirectory: await mkdtemp(join(tmpdir(), "beaconwatch-callback-")),
        rateLimitMax: 1,
        rateLimitWindowMs: 60_000,
      },
      () => new Date("2026-07-30T12:00:00.000Z"),
    );

    const snapshot = {
      method: "POST",
      protocol: "https",
      host: "rtweriu.com",
      originalUrl: "/api/callback",
      headers: { "x-forwarded-for": "203.0.113.10" },
      socketRemoteAddress: "127.0.0.1",
      queryParams: {},
      body: "proof",
    };

    assert.equal((await service.record(snapshot)).id, "callback-1");
    const dropped = await service.record(snapshot);

    assert.equal(dropped.id, "rate-limited");
    assert.equal(dropped.status, "error");
    assert.equal(saveCount, 1);
  });

  it("prunes callback events older than the configured retention window", async () => {
    const parameters: unknown[] = [];
    const service = new CallbackService(
      {
        createQueryBuilder: () => ({
          delete: () => ({
            from: () => ({
              where: (_predicate: string, params: Record<string, unknown>) => ({
                execute: async () => {
                  parameters.push(params.cutoff);
                  return { affected: 3 };
                },
              }),
            }),
          }),
        }),
      } as unknown as Repository<CallbackEventEntity>,
      {
        logDirectory: await mkdtemp(join(tmpdir(), "beaconwatch-callback-")),
        retentionDays: 7,
      },
      () => new Date("2026-07-30T12:00:00.000Z"),
    );

    assert.equal(await service.pruneExpired(new Date("2026-07-30T12:00:00.000Z")), 3);
    assert.equal((parameters[0] as Date).toISOString(), "2026-07-23T12:00:00.000Z");
  });

  it("uses whitelisted sorting for callback lists", async () => {
    let order: unknown = null;
    const service = new CallbackService(
      {
        findAndCount: async (options: { readonly order?: unknown }) => {
          order = options.order;
          return [[], 0];
        },
      } as unknown as Repository<CallbackEventEntity>,
      { logDirectory: await mkdtemp(join(tmpdir(), "beaconwatch-callback-")) },
      () => new Date("2026-07-30T12:00:00.000Z"),
    );

    await service.list({
      limit: 50,
      offset: 0,
      sortBy: "sourceIp",
      sortDirection: "ASC",
    });

    assert.deepEqual(order, { sourceIp: "ASC", id: "DESC" });
  });

  it("loads latest callback stats without TypeORM findOne selection conditions", async () => {
    const latestEvent = {
      id: "callback-latest",
      timestamp: new Date("2026-07-30T11:59:00.000Z"),
    } as CallbackEventEntity;
    const service = new CallbackService(
      {
        count: async () => 1,
        findOne: async () => {
          throw new Error("You must provide selection conditions in order to find a single row.");
        },
        find: async (options: { readonly take?: number }) => {
          assert.equal(options.take, 5);
          return [latestEvent];
        },
      } as unknown as Repository<CallbackEventEntity>,
      { logDirectory: await mkdtemp(join(tmpdir(), "beaconwatch-callback-")) },
      () => new Date("2026-07-30T12:00:00.000Z"),
    );

    const stats = await service.latestStatus();

    assert.equal(stats.total, 1);
    assert.equal(stats.lastHour, 1);
    assert.equal(stats.latest, latestEvent);
    assert.deepEqual(stats.latestFive, [latestEvent]);
  });

  it("truncates overlong request fields before storage", async () => {
    let savedEvent: CallbackEventEntity | null = null;
    const service = new CallbackService(
      {
        create: (event: Partial<CallbackEventEntity>) => event as CallbackEventEntity,
        save: async (event: CallbackEventEntity) => {
          savedEvent = {
            ...event,
            id: "callback-truncated",
          } as CallbackEventEntity;
          return savedEvent;
        },
      } as unknown as Repository<CallbackEventEntity>,
      { logDirectory: await mkdtemp(join(tmpdir(), "beaconwatch-callback-")) },
      () => new Date("2026-07-30T12:00:00.000Z"),
    );

    await service.record({
      method: "POST",
      protocol: "https",
      host: "rtweriu.com",
      originalUrl: `/api/callback?targetId=${"target".repeat(200)}`,
      headers: {
        "x-forwarded-for": `${"1".repeat(200)}, 10.0.0.1`,
        "user-agent": "agent".repeat(600),
      },
      socketRemoteAddress: "127.0.0.1",
      queryParams: { targetId: "target".repeat(200) },
      body: { payload: "payload".repeat(20_000) },
    });

    assert.ok((savedEvent?.sourceIp.length ?? 0) <= 128);
    assert.ok((savedEvent?.userAgent?.length ?? 0) <= 1024);
    assert.ok((savedEvent?.url.length ?? 0) <= 8192);
    assert.ok((savedEvent?.targetId?.length ?? 0) <= 512);
    assert.ok((savedEvent?.payload?.length ?? 0) <= 8192);
    assert.ok((savedEvent?.body?.length ?? 0) <= 1_000_000);
  });
});
