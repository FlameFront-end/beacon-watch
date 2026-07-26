import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NotFoundException } from "@nestjs/common";

import {
  getRegisteredService,
  hasServiceCapability,
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

  it("resolves Zimbra as an email-only service", () => {
    assert.deepEqual(getRegisteredService("zimbra"), {
      key: "zimbra",
      name: "Zimbra",
      description: "Zimbra captured email monitoring",
      capabilities: ["emails"],
    });
    assert.equal(hasServiceCapability("zimbra", "emails"), true);
    assert.equal(hasServiceCapability("zimbra", "beacons"), false);
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
