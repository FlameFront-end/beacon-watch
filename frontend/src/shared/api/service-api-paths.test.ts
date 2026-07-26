import { describe, expect, it } from "vitest";

import {
  serviceBeaconsPath,
  serviceEmailsPath,
  serviceEventsPath,
  serviceEventsUrl,
} from "./service-api-paths";

describe("service API paths", () => {
  it("builds encoded service resource paths", () => {
    expect(serviceBeaconsPath("owa")).toBe("/api/services/owa/beacons");
    expect(serviceEmailsPath("owa")).toBe("/api/services/owa/emails");
    expect(serviceEventsPath("owa")).toBe("/api/services/owa/events");
  });

  it("encodes dynamic identifiers", () => {
    expect(serviceBeaconsPath("owa", "beacon/id")).toBe(
      "/api/services/owa/beacons/beacon%2Fid",
    );
    expect(serviceEmailsPath("owa", "email/id")).toBe(
      "/api/services/owa/emails/email%2Fid",
    );
  });

  it("builds event stream urls with an optional API origin", () => {
    expect(serviceEventsUrl("owa", "")).toBe("/api/services/owa/events");
    expect(serviceEventsUrl("owa", "https://admin.example.test")).toBe(
      "https://admin.example.test/api/services/owa/events",
    );
  });
});
