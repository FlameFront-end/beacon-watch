import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { StoredMailsController } from "./mails.controller.js";
import type { MailsService } from "./mails.service.js";

describe("StoredMailsController", () => {
  it("ignores repeated list query parameters instead of throwing", async () => {
    const service = createMailsService();
    const controller = new StoredMailsController(service);

    await controller.findAll(["10", "20"] as unknown as string, ["1"] as unknown as string);

    assert.deepEqual(service.findAllQuery, {
      limit: undefined,
      offset: undefined,
    });
  });
});

function createMailsService(): Pick<MailsService, "findAll"> & {
  readonly findAllQuery: unknown;
} {
  let findAllQuery: unknown = null;

  return {
    get findAllQuery() {
      return findAllQuery;
    },
    findAll: async (query) => {
      findAllQuery = query;
      return [];
    },
  };
}
