import { describe, expect, it } from "vitest";

import {
  getRegisteredService,
  hasServiceCapability,
  REGISTERED_SERVICES,
} from "./services";

describe("service registry", () => {
  it("exposes OWA as the initial service", () => {
    expect(REGISTERED_SERVICES).toEqual([
      {
        key: "owa",
        name: "Outlook Web App",
        description: "OWA beacon and captured email monitoring",
        capabilities: ["beacons", "emails"],
      },
    ]);
  });

  it("resolves only known services", () => {
    expect(getRegisteredService("owa")?.key).toBe("owa");
    expect(getRegisteredService("unknown")).toBeUndefined();
  });

  it("checks declared capabilities", () => {
    expect(hasServiceCapability("owa", "emails")).toBe(true);
    expect(hasServiceCapability("owa", "unknown")).toBe(false);
    expect(hasServiceCapability("unknown", "emails")).toBe(false);
  });
});
