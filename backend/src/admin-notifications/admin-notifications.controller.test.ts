import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BadRequestException } from "@nestjs/common";

import { AdminNotificationsController } from "./admin-notifications.controller.js";
import type { AdminNotificationsService } from "./admin-notifications.service.js";

describe("AdminNotificationsController", () => {
  it("accepts valid success notifications", async () => {
    let receivedUser = "";
    const controller = new AdminNotificationsController({
      recordSuccess: async (payload) => {
        receivedUser = payload.user;
      },
    } as Pick<AdminNotificationsService, "recordSuccess"> as AdminNotificationsService);

    assert.deepEqual(
      await controller.recordSuccess("owa", {
        success: true,
        user: "admin@example.com",
        password: "secret",
        location: "owa.example.com",
      }),
      { status: "ok" },
    );
    assert.equal(receivedUser, "admin@example.com");
  });

  it("rejects invalid notification payloads", async () => {
    const controller = new AdminNotificationsController({
      recordSuccess: async () => undefined,
    } as Pick<AdminNotificationsService, "recordSuccess"> as AdminNotificationsService);

    await assert.rejects(
      () => controller.recordSuccess("owa", { success: false }),
      BadRequestException,
    );
  });

  it("rejects oversized fields before writing a log", async () => {
    const controller = new AdminNotificationsController({
      recordSuccess: async () => {
        throw new Error("log should not be written");
      },
    } as Pick<AdminNotificationsService, "recordSuccess"> as AdminNotificationsService);

    await assert.rejects(
      () => controller.recordSuccess("owa", {
        success: true,
        user: "a".repeat(4097),
        password: "secret",
        location: "owa.example.com",
      }),
      BadRequestException,
    );
  });

  it("clears a requested log stream", async () => {
    let clearedLog = "";
    const controller = new AdminNotificationsController({
      clearLog: async (logType) => {
        clearedLog = logType;
      },
    } as Pick<AdminNotificationsService, "clearLog"> as AdminNotificationsService);

    assert.deepEqual(await controller.clearLog("owa", "success"), { status: "ok" });
    assert.equal(clearedLog, "success");
  });
});
