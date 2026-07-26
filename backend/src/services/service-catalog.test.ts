import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NotFoundException } from "@nestjs/common";

import {
  getRegisteredService,
  requireRegisteredService,
} from "./service-catalog.js";

describe("service catalog", () => {
  it("resolves the registered OWA service", () => {
    assert.deepEqual(getRegisteredService("owa"), {
      key: "owa",
      name: "Outlook Web App",
      description: "OWA beacon and captured email monitoring",
      capabilities: ["beacons", "emails"],
    });
  });

  it("returns no service for an unknown key", () => {
    assert.equal(getRegisteredService("unknown"), undefined);
  });

  it("rejects an unknown required service", () => {
    assert.throws(
      () => requireRegisteredService("unknown"),
      NotFoundException,
    );
  });
});
