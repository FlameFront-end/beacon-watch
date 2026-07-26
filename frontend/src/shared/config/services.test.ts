import { describe, expect, it } from "vitest";

import {
  getDefaultServicePath,
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
      {
        key: "zimbra",
        name: "Zimbra",
        description: "Zimbra captured email monitoring",
        capabilities: ["emails"],
      },
    ]);
  });

  it("resolves only known services", () => {
    expect(getRegisteredService("owa")?.key).toBe("owa");
    expect(getRegisteredService("zimbra")?.key).toBe("zimbra");
    expect(getRegisteredService("unknown")).toBeUndefined();
  });

  it("checks declared capabilities", () => {
    expect(hasServiceCapability("owa", "emails")).toBe(true);
    expect(hasServiceCapability("zimbra", "emails")).toBe(true);
    expect(hasServiceCapability("zimbra", "beacons")).toBe(false);
    expect(hasServiceCapability("owa", "unknown")).toBe(false);
    expect(hasServiceCapability("unknown", "emails")).toBe(false);
  });

  it("routes services to their first supported admin page", () => {
    expect(getDefaultServicePath("owa")).toBe("/owa/beacons");
    expect(getDefaultServicePath("zimbra")).toBe("/zimbra/emails");
    expect(getDefaultServicePath("unknown")).toBe("/");
  });
});
