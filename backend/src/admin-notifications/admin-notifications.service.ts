import { appendFile, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type {
  AdminErrorNotification,
  AdminNotificationLogs,
  AdminSuccessNotification,
} from "./admin-notifications.types.js";

const DEFAULT_LOG_DIRECTORY = join(process.cwd(), "logs");
const DEFAULT_READ_LIMIT = 100;
const MAX_LOG_ENTRIES = 1_000;

type AdminLogEntry = {
  readonly timestamp: string;
  readonly success: boolean;
  readonly user: string;
  readonly location: string;
  readonly error?: string;
  readonly stack?: string;
};

export class AdminNotificationsService {
  private writeQueue = Promise.resolve();

  constructor(private readonly logDirectory = DEFAULT_LOG_DIRECTORY) {}

  async recordSuccess(payload: AdminSuccessNotification): Promise<void> {
    await this.appendLog("success.log", payload);
  }

  async recordError(payload: AdminErrorNotification): Promise<void> {
    await this.appendLog("error.log", payload);
  }

  async clearLog(logType: "success" | "error"): Promise<void> {
    await this.enqueueWrite(() => this.removeLog(`${logType}.log`));
  }

  async clearLogs(): Promise<void> {
    await this.enqueueWrite(async () => {
      await Promise.all([this.removeLog("success.log"), this.removeLog("error.log")]);
    });
  }

  async readLogs(limit = DEFAULT_READ_LIMIT): Promise<AdminNotificationLogs> {
    await this.redactLegacyPasswords();
    const [success, error] = await Promise.all([
      this.readLog("success.log", limit),
      this.readLog("error.log", limit),
    ]);

    return { success, error };
  }

  private async appendLog(
    logName: "success.log" | "error.log",
    payload: AdminSuccessNotification | AdminErrorNotification,
  ): Promise<void> {
    await this.enqueueWrite(async () => {
        await mkdir(this.logDirectory, { recursive: true });
        const entry: AdminLogEntry = {
          timestamp: new Date().toISOString(),
          success: payload.success,
          user: payload.user,
          location: payload.location,
          ...(payload.success
            ? {}
            : { error: payload.error, stack: payload.stack }),
        };
        const logPath = join(this.logDirectory, logName);
        await appendFile(logPath, `${JSON.stringify(entry)}\n`, "utf8");
        await this.trimLog(logPath);
      });
  }

  private async readLog(
    logName: "success.log" | "error.log",
    limit: number,
  ): Promise<string[]> {
    try {
      const content = await readFile(join(this.logDirectory, logName), "utf8");
      return content
        .split("\n")
        .filter((line) => line.length > 0)
        .reverse()
        .slice(0, limit);
    } catch (error: unknown) {
      if (isFileNotFoundError(error)) {
        return [];
      }

      throw error;
    }
  }

  private async trimLog(logPath: string): Promise<void> {
    const content = await readFile(logPath, "utf8");
    const lines = content.split("\n").filter((line) => line.length > 0);
    if (lines.length <= MAX_LOG_ENTRIES) {
      return;
    }

    await writeFile(logPath, `${lines.slice(-MAX_LOG_ENTRIES).join("\n")}\n`, "utf8");
  }

  private async redactLegacyPasswords(): Promise<void> {
    await this.enqueueWrite(async () => {
        const logPath = join(this.logDirectory, "success.log");
        let content: string;
        try {
          content = await readFile(logPath, "utf8");
        } catch (error: unknown) {
          if (isFileNotFoundError(error)) {
            return;
          }

          throw error;
        }

        let hasChanges = false;
        const redactedLines = content.split("\n").map((line) => {
          const redactedLine = redactPassword(line);
          hasChanges ||= redactedLine !== line;
          return redactedLine;
        });

        if (hasChanges) {
          await writeFile(logPath, redactedLines.join("\n"), "utf8");
        }
      });
  }

  private async removeLog(logName: "success.log" | "error.log"): Promise<void> {
    try {
      await unlink(join(this.logDirectory, logName));
    } catch (error: unknown) {
      if (!isFileNotFoundError(error)) {
        throw error;
      }
    }
  }

  private enqueueWrite(operation: () => Promise<void>): Promise<void> {
    const queuedOperation = this.writeQueue.catch(() => undefined).then(operation);
    this.writeQueue = queuedOperation;
    return queuedOperation;
  }
}

function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function redactPassword(line: string): string {
  if (line.length === 0) {
    return line;
  }

  try {
    const parsed: unknown = JSON.parse(line);
    if (!isRecord(parsed) || !("password" in parsed)) {
      return line;
    }

    return JSON.stringify(
      Object.fromEntries(
        Object.entries(parsed).filter(([key]) => key !== "password"),
      ),
    );
  } catch {
    return line;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
