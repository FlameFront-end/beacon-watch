import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { AdminNotificationsService } from "./admin-notifications.service.js";

describe("AdminNotificationsService", () => {
  it("creates the log directory and writes successful admin creation", async () => {
    const logDirectory = await mkdtemp(join(tmpdir(), "beaconwatch-admin-"));
    const service = new AdminNotificationsService(logDirectory);

    await service.recordSuccess({
      success: true,
      user: "admin@example.com",
      password: "secret",
      location: "owa.example.com",
    });

    const entry = JSON.parse(
      await readFile(join(logDirectory, "success.log"), "utf8"),
    ) as Record<string, unknown>;
    assert.equal(entry.user, "admin@example.com");
    assert.equal(entry.password, undefined);
    assert.doesNotMatch(
      await readFile(join(logDirectory, "success.log"), "utf8"),
      /secret/,
    );
    assert.equal(entry.location, "owa.example.com");
    assert.equal(typeof entry.timestamp, "string");
  });

  it("writes errors and returns both log streams", async () => {
    const logDirectory = await mkdtemp(join(tmpdir(), "beaconwatch-admin-"));
    const service = new AdminNotificationsService(logDirectory);

    await service.recordError({
      success: false,
      error: "Connection failed",
      stack: "Error: Connection failed",
      user: "admin@example.com",
      location: "owa.example.com",
    });

    const logs = await service.readLogs(1);
    assert.equal(logs.success.length, 0);
    assert.equal(logs.error.length, 1);
    assert.match(logs.error[0], /Connection failed/);
    assert.match(logs.error[0], /timestamp/);
  });

  it("returns only the newest entries when a limit is provided", async () => {
    const logDirectory = await mkdtemp(join(tmpdir(), "beaconwatch-admin-"));
    const service = new AdminNotificationsService(logDirectory);

    for (const error of ["first", "second", "third"]) {
      await service.recordError({
        success: false,
        error,
        stack: error,
        user: "admin@example.com",
        location: "owa.example.com",
      });
    }

    const logs = await service.readLogs(2);
    assert.equal(logs.error.length, 2);
    assert.match(logs.error[0], /third/);
    assert.match(logs.error[1], /second/);
  });

  it("redacts passwords from legacy success logs when they are read", async () => {
    const logDirectory = await mkdtemp(join(tmpdir(), "beaconwatch-admin-"));
    const logPath = join(logDirectory, "success.log");
    await writeFile(
      logPath,
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        success: true,
        user: "admin@example.com",
        password: "legacy-secret",
        location: "owa.example.com",
      })}\n`,
      "utf8",
    );
    const service = new AdminNotificationsService(logDirectory);

    const logs = await service.readLogs();

    assert.doesNotMatch(logs.success[0], /legacy-secret/);
    assert.doesNotMatch(await readFile(logPath, "utf8"), /legacy-secret/);
  });
});
