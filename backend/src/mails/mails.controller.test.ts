import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { StoredMailsController } from "./mails.controller.js";
import type { MailsService } from "./mails.service.js";

describe("StoredMailsController", () => {
  it("ignores repeated list query parameters instead of throwing", async () => {
    const service = createMailsService();
    const controller = new StoredMailsController(service);

    await controller.findAll(
      "owa",
      ["10", "20"] as unknown as string,
      ["1"] as unknown as string,
    );

    assert.equal(service.serviceKey, "owa");
    assert.deepEqual(service.findAllQuery, {
      limit: undefined,
      offset: undefined,
    });
  });
});

function createMailsService(): Pick<MailsService, "findAll"> & {
  readonly serviceKey: string | null;
  readonly findAllQuery: unknown;
} {
  let serviceKey: string | null = null;
  let findAllQuery: unknown = null;

  return {
    get serviceKey() {
      return serviceKey;
    },
    get findAllQuery() {
      return findAllQuery;
    },
    findAll: async (key, query) => {
      serviceKey = key;
      findAllQuery = query;
      return [];
    },
  };
}
