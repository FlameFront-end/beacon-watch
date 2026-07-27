import { describe, expect, it } from "vitest";

import {
  adminNotificationLogsPath,
  adminNotificationLogPath,
  adminNotificationPath,
} from "./admin-notifications";

describe("admin notification paths", () => {
  it("builds service-scoped notification paths", () => {
    expect(adminNotificationPath("owa", "success")).toBe(
      "/api/services/owa/notif/admin/success",
    );
    expect(adminNotificationLogsPath("owa")).toBe(
      "/api/services/owa/notif/admin/logs",
    );
    expect(adminNotificationLogPath("owa", "error")).toBe(
      "/api/services/owa/notif/admin/logs/error",
    );
  });
});
