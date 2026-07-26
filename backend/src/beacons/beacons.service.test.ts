import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Repository } from "typeorm";

import type { SseService } from "../sse/sse.service.js";
import type { BeaconEntity } from "./beacon.entity.js";
import { BeaconsService } from "./beacons.service.js";

describe("BeaconsService service scoping", () => {
  it("stores and emits the service key", async () => {
    const repository = createBeaconRepository();
    const emitted: BeaconEntity[] = [];
    const service = new BeaconsService(repository, {
      emitBeacon: (beacon) => emitted.push(beacon),
    } as Pick<SseService, "emitBeacon"> as SseService);

    const result = await service.createFromPayload("owa", {
      cookies: "X-OWA-CANARY=test",
    });

    assert.equal(result.serviceKey, "owa");
    assert.equal(repository.saved[0]?.serviceKey, "owa");
    assert.equal(emitted[0]?.serviceKey, "owa");
  });

  it("scopes heartbeat upsert by service key", async () => {
    const repository = createBeaconRepository();
    const service = new BeaconsService(repository, createSseService());

    await service.createFromPayload("owa", {
      heartbeat: "ONLINE",
      mbxGuid: "mailbox-1",
    });

    assert.deepEqual(repository.findOneOptions, {
      where: {
        serviceKey: "owa",
        mbxGuid: "mailbox-1",
        type: "heartbeat",
      },
      order: { receivedAt: "DESC" },
    });
  });

  it("scopes list, detail, and delete by service key", async () => {
    const repository = createBeaconRepository([
      createBeaconEntity({ id: "beacon-1" }),
    ]);
    const service = new BeaconsService(repository, createSseService());

    await service.findAll("owa", "loot");
    await service.findById("owa", "beacon-1");
    await service.clearAll("owa");

    assert.deepEqual(repository.findOptions, {
      where: { serviceKey: "owa", type: "loot" },
      order: { receivedAt: "DESC" },
    });
    assert.deepEqual(repository.findOneOptions, {
      where: { serviceKey: "owa", id: "beacon-1" },
    });
    assert.deepEqual(repository.deleteCriteria, [{ serviceKey: "owa" }]);
  });
});

function createBeaconRepository(found: BeaconEntity[] = []) {
  const saved: BeaconEntity[] = [];
  const deleteCriteria: unknown[] = [];
  let findOptions: unknown;
  let findOneOptions: unknown;

  return {
    saved,
    deleteCriteria,
    get findOptions() {
      return findOptions;
    },
    get findOneOptions() {
      return findOneOptions;
    },
    find: async (options: unknown) => {
      findOptions = options;
      return found;
    },
    findOne: async (options: unknown) => {
      findOneOptions = options;
      const where = (options as { where?: { id?: string } }).where;
      return where?.id ? found.find((beacon) => beacon.id === where.id) ?? null : null;
    },
    create: (beacon: Partial<BeaconEntity>) => createBeaconEntity(beacon),
    save: async (beacon: BeaconEntity) => {
      saved.push(beacon);
      return beacon;
    },
    delete: async (criteria: unknown) => {
      deleteCriteria.push(criteria);
      return { raw: [], affected: 1 };
    },
  } as Pick<
    Repository<BeaconEntity>,
    "find" | "findOne" | "create" | "save" | "delete"
  > & {
    saved: BeaconEntity[];
    deleteCriteria: unknown[];
    readonly findOptions: unknown;
    readonly findOneOptions: unknown;
  };
}

function createSseService(): SseService {
  return { emitBeacon: () => undefined } as Pick<
    SseService,
    "emitBeacon"
  > as SseService;
}

function createBeaconEntity(
  overrides: Partial<BeaconEntity> = {},
): BeaconEntity {
  return {
    id: "beacon",
    serviceKey: "owa",
    receivedAt: new Date("2026-07-26T12:00:00.000Z"),
    type: "loot",
    cookies: null,
    mbxGuid: null,
    forest: null,
    heartbeat: null,
    httpStatus: null,
    raw: {},
    ...overrides,
  };
}
