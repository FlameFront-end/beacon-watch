import { describe, expect, it } from "vitest";

import {
  adminNotificationLogsPath,
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
  });
});
