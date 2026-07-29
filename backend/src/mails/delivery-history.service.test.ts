import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Repository } from "typeorm";

import { DeliveryEntity } from "./delivery.entity.js";
import { DeliveryEventEntity } from "./delivery-event.entity.js";
import { DeliveryHistoryService } from "./delivery-history.service.js";

describe("DeliveryHistoryService", () => {
  it("does not persist successful Postfix replies as delivery errors", async () => {
    const delivery = Object.assign(new DeliveryEntity(), {
      id: "delivery-id",
      messageId: "<message@beaconwatch.local>",
      status: "queued",
      attemptCount: 1,
      queueId: null,
      errorCategory: null,
      errorMessage: null,
      metadata: {},
      completedAt: null,
      updatedAt: new Date("2026-07-29T18:32:38Z"),
    });
    const service = new DeliveryHistoryService(
      createDeliveryRepository(delivery),
      createEventRepository(),
      { emitDeliveryEvent() {} },
    );

    const saved = await service.recordEvent({
      messageId: "<message@beaconwatch.local>",
      eventId: "event-id",
      source: "mailcow-postfix-agent",
      status: "delivered",
      queueId: "372BE124250",
      mxHost: "mx2.camgr.org[190.228.29.28]:25",
      smtpCode: 250,
      message: "372BE124250: status=sent (250 Queued!)",
      details: { attempt: 1 },
    });

    assert.equal(saved.status, "delivered");
    assert.equal(saved.errorCategory, null);
    assert.equal(saved.errorMessage, null);
  });
});

function createDeliveryRepository(delivery: DeliveryEntity): Repository<DeliveryEntity> {
  return {
    async findOne() {
      return delivery;
    },
    async save(value: DeliveryEntity) {
      Object.assign(delivery, value);
      return delivery;
    },
  } as Repository<DeliveryEntity>;
}

function createEventRepository(): Repository<DeliveryEventEntity> {
  return {
    create(value: Partial<DeliveryEventEntity>) {
      return value as DeliveryEventEntity;
    },
    async findOne() {
      return null;
    },
    async save(value: DeliveryEventEntity) {
      return value;
    },
  } as Repository<DeliveryEventEntity>;
}
