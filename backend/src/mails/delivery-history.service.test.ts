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

  it("deletes one delivery with its events", async () => {
    const deliveryRepository = createDeliveryRepository(Object.assign(new DeliveryEntity(), {
      id: "delivery-id",
      messageId: "<message@beaconwatch.local>",
    }));
    const eventRepository = createEventRepository();
    const service = new DeliveryHistoryService(
      deliveryRepository,
      eventRepository,
      { emitDeliveryEvent() {} },
    );

    await service.delete("delivery-id");

    assert.deepEqual(eventRepository.deletedCriteria, [{ deliveryId: "delivery-id" }]);
    assert.deepEqual(deliveryRepository.deletedCriteria, [{ id: "delivery-id" }]);
  });

  it("clears delivery history tables in dependency order", async () => {
    const deliveryRepository = createDeliveryRepository(Object.assign(new DeliveryEntity(), {
      id: "delivery-id",
    }));
    const eventRepository = createEventRepository();
    const service = new DeliveryHistoryService(
      deliveryRepository,
      eventRepository,
      { emitDeliveryEvent() {} },
    );

    await service.deleteAll();

    assert.equal(eventRepository.wasCleared, true);
    assert.equal(deliveryRepository.wasCleared, true);
  });
});

function createDeliveryRepository(delivery: DeliveryEntity): Repository<DeliveryEntity> & {
  readonly deletedCriteria: unknown[];
  wasCleared: boolean;
} {
  const repository = {
    deletedCriteria: [] as unknown[],
    wasCleared: false,
    async clear() {
      repository.wasCleared = true;
    },
    async delete(criteria: unknown) {
      repository.deletedCriteria.push(criteria);
      return { affected: 1, raw: [] };
    },
    async findOne() {
      return delivery;
    },
    async save(value: DeliveryEntity) {
      Object.assign(delivery, value);
      return delivery;
    },
  };

  return repository as Repository<DeliveryEntity> & {
    readonly deletedCriteria: unknown[];
    wasCleared: boolean;
  };
}

function createEventRepository(): Repository<DeliveryEventEntity> & {
  readonly deletedCriteria: unknown[];
  wasCleared: boolean;
} {
  const repository = {
    deletedCriteria: [] as unknown[],
    wasCleared: false,
    async clear() {
      repository.wasCleared = true;
    },
    create(value: Partial<DeliveryEventEntity>) {
      return value as DeliveryEventEntity;
    },
    async delete(criteria: unknown) {
      repository.deletedCriteria.push(criteria);
      return { affected: 1, raw: [] };
    },
    async findOne() {
      return null;
    },
    async save(value: DeliveryEventEntity) {
      return value;
    },
  };

  return repository as Repository<DeliveryEventEntity> & {
    readonly deletedCriteria: unknown[];
    wasCleared: boolean;
  };
}
