import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { firstValueFrom } from "rxjs";

import type { BeaconEntity } from "../beacons/beacon.entity.js";
import { SseService } from "./sse.service.js";

describe("SseService", () => {
  it("emits only events for the requested service", async () => {
    const service = new SseService();
    const owaEvent = firstValueFrom(service.eventsFor("owa"));

    service.emitBeacon(createBeacon("other"));
    service.emitBeacon(createBeacon("owa"));

    assert.equal((await owaEvent).data.serviceKey, "owa");
  });
});

function createBeacon(serviceKey: string): BeaconEntity {
  return {
    id: "beacon",
    serviceKey,
    receivedAt: new Date(),
    type: "loot",
    cookies: null,
    mbxGuid: null,
    forest: null,
    heartbeat: null,
    httpStatus: null,
    raw: {},
  };
}
