import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";

import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { DeliveryHistoryService, isDeliveryStatus } from "./delivery-history.service.js";
import type { DeliveryStatus } from "./delivery.entity.js";

@Controller("api/smtp/deliveries")
@UseGuards(SessionAuthGuard)
export class DeliveryHistoryController {
  constructor(private readonly deliveryHistoryService: DeliveryHistoryService) {}

  @Get()
  list(
    @Query("status") status?: string,
    @Query("recipient") recipient?: string,
    @Query("offset") offset?: string,
    @Query("limit") limit?: string,
  ) {
    if (status && !isDeliveryStatus(status)) {
      throw new BadRequestException("Invalid delivery status");
    }
    return this.deliveryHistoryService.list({
      status: status as DeliveryStatus | undefined,
      recipient: recipient?.trim() || undefined,
      offset: parseRange(offset, 0, 0, 10_000),
      limit: parseRange(limit, 50, 1, 100),
    });
  }

  @Get(":id")
  details(@Param("id") id: string) {
    return this.deliveryHistoryService.details(id);
  }

  @Post(":id/cancel")
  cancel(@Param("id") id: string) {
    return this.deliveryHistoryService.cancel(id);
  }

  @Post("/events")
  ingest(@Body() body: unknown) {
    const input = parseDeliveryEvent(body);
    return this.deliveryHistoryService.recordEvent(input);
  }

  @Delete(":id")
  archive(@Param("id") id: string) {
    return this.deliveryHistoryService.recordEvent({
      deliveryId: id,
      eventId: `archive-${Date.now()}`,
      source: "beaconwatch",
      status: "cancelled",
      message: "Archived by administrator",
    });
  }
}

function parseRange(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value ?? fallback);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

export function parseDeliveryEvent(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("Delivery event must be an object");
  }
  const value = body as Record<string, unknown>;
  const deliveryId = readOptionalString(value.deliveryId);
  const messageId = readOptionalString(value.messageId);
  const eventId = readString(value.eventId);
  const source = readString(value.source);
  const status = readString(value.status);
  if ((!deliveryId && !messageId) || !eventId || !source || !isDeliveryStatus(status)) {
    throw new BadRequestException("Delivery event fields are invalid");
  }
  return {
    deliveryId,
    messageId,
    eventId,
    source,
    status,
    queueId: readOptionalString(value.queueId),
    mxHost: readOptionalString(value.mxHost),
    smtpCode: typeof value.smtpCode === "number" ? value.smtpCode : undefined,
    errorCategory: readOptionalString(value.errorCategory),
    message: readOptionalString(value.message),
    details: isRecord(value.details) ? value.details : {},
  } as const;
}

@Controller("api/internal/smtp/delivery-events")
export class DeliveryAgentEventsController {
  constructor(
    private readonly deliveryHistoryService: DeliveryHistoryService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  async ingest(
    @Body() body: unknown,
    @Headers("x-delivery-signature") signature?: string,
  ) {
    const secret = this.configService.get<string>("DELIVERY_AGENT_SECRET");
    if (!secret || !signature || !isValidSignature(body, signature, secret)) {
      throw new UnauthorizedException("Invalid delivery agent signature");
    }
    return this.deliveryHistoryService.recordEvent(parseDeliveryEvent(body));
  }
}

function isValidSignature(body: unknown, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret)
    .update(canonicalJson(body), "utf8")
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(signature, "hex");
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown): string | undefined {
  const result = readString(value);
  return result || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
