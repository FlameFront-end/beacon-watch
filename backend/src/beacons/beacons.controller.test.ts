import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NotFoundException } from "@nestjs/common";

import { BeaconsController } from "./beacons.controller.js";
import type { BeaconsService } from "./beacons.service.js";

describe("BeaconsController service capabilities", () => {
  it("rejects services without beacon support", async () => {
    const controller = new BeaconsController({
      createFromPayload: async () => {
        throw new Error("service should not be called");
      },
    } as Pick<BeaconsService, "createFromPayload"> as BeaconsService);

    assert.throws(
      () => controller.create("zimbra", "{}"),
      NotFoundException,
    );
  });
});
