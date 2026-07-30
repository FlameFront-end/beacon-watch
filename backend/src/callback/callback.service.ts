import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, MoreThanOrEqual, LessThanOrEqual, type FindOptionsWhere, type Repository } from "typeorm";
import { CronJob } from "cron";

import { CallbackEventEntity, type CallbackMethod } from "./callback.entity.js";
import type { CallbackListQuery, CallbackRequestSnapshot, CallbackStats } from "./callback.dto.js";

export const CALLBACK_CLOCK = Symbol("CALLBACK_CLOCK");
export const CALLBACK_OPTIONS = Symbol("CALLBACK_OPTIONS");

export type CallbackOptions = {
  readonly logDirectory?: string;
  readonly rateLimitMax?: number;
  readonly rateLimitWindowMs?: number;
  readonly retentionDays?: number;
};

const DEFAULT_LOG_DIRECTORY = "logs";
const ERROR_LOG_FILE = "callback-errors.log";
const DEFAULT_RATE_LIMIT_MAX = 120;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RETENTION_DAYS = 30;
const RETENTION_CRON = "0 3 * * *";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_SOURCE_IP_LENGTH = 128;
const MAX_USER_AGENT_LENGTH = 1024;
const MAX_URL_LENGTH = 8192;
const MAX_TARGET_ID_LENGTH = 512;
const MAX_PAYLOAD_LENGTH = 8192;
const MAX_BODY_LENGTH = 1_000_000;
const TRUNCATION_SUFFIX = "\n...[truncated]";

type RateLimitBucket = {
  windowStartedAt: number;
  count: number;
};

@Injectable()
export class CallbackService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CallbackService.name);
  private readonly rateLimitBuckets = new Map<string, RateLimitBucket>();
  private readonly options: Required<CallbackOptions>;
  private retentionJob: CronJob | null = null;

  constructor(
    @InjectRepository(CallbackEventEntity)
    private readonly callbackRepository: Repository<CallbackEventEntity>,
    @Optional()
    @Inject(CALLBACK_OPTIONS)
    options?: CallbackOptions,
    @Optional()
    @Inject(CALLBACK_CLOCK)
    private readonly now: () => Date = () => new Date(),
  ) {
    this.options = {
      logDirectory: options?.logDirectory ?? process.env.LOG_DIR ?? DEFAULT_LOG_DIRECTORY,
      rateLimitMax: options?.rateLimitMax ?? readPositiveInteger("CALLBACK_RATE_LIMIT_MAX", DEFAULT_RATE_LIMIT_MAX),
      rateLimitWindowMs: options?.rateLimitWindowMs ??
        readPositiveInteger("CALLBACK_RATE_LIMIT_WINDOW_MS", DEFAULT_RATE_LIMIT_WINDOW_MS),
      retentionDays: options?.retentionDays ?? readPositiveInteger("CALLBACK_RETENTION_DAYS", DEFAULT_RETENTION_DAYS),
    };
  }

  onModuleInit(): void {
    this.retentionJob = new CronJob(RETENTION_CRON, () => {
      void this.pruneExpired().catch((error: unknown) => {
        this.logger.error("Callback retention failed", error);
      });
    });
    this.retentionJob.start();
    this.logger.log(`Scheduled callback retention with cron "${RETENTION_CRON}"`);
  }

  onModuleDestroy(): void {
    this.retentionJob?.stop();
    this.retentionJob = null;
  }

  async record(snapshot: CallbackRequestSnapshot): Promise<CallbackEventEntity> {
    const timestamp = this.now();
    const sourceIp = truncateText(getSourceIp(snapshot), MAX_SOURCE_IP_LENGTH);
    if (!this.consumeRateLimit(sourceIp, timestamp)) {
      this.logger.warn(`Dropped callback from ${sourceIp}: rate limit exceeded`);
      return this.buildUnsavedEvent(snapshot, timestamp, sourceIp, "rate-limited");
    }

    const event = this.callbackRepository.create({
      timestamp,
      sourceIp,
      userAgent: truncateNullableText(readHeader(snapshot.headers, "user-agent"), MAX_USER_AGENT_LENGTH),
      method: normalizeMethod(snapshot.method),
      url: truncateText(buildFullUrl(snapshot), MAX_URL_LENGTH),
      headers: normalizeHeaders(snapshot.headers),
      queryParams: snapshot.queryParams,
      body: truncateNullableText(serializeBody(snapshot.body), MAX_BODY_LENGTH),
      status: "processed",
      processedAt: timestamp,
      targetId: truncateNullableText(extractTargetId(snapshot), MAX_TARGET_ID_LENGTH),
      payload: truncateNullableText(extractPayload(snapshot), MAX_PAYLOAD_LENGTH),
    });

    try {
      return await this.callbackRepository.save(event);
    } catch (error: unknown) {
      await this.logError(error, snapshot);
      return {
        ...event,
        id: "unpersisted",
        status: "error",
        processedAt: timestamp,
      };
    }
  }

  async list(query: CallbackListQuery): Promise<{
    readonly items: CallbackEventEntity[];
    readonly total: number;
    readonly limit: number;
    readonly offset: number;
  }> {
    const where = buildWhere(query);
    const [items, total] = await this.callbackRepository.findAndCount({
      where,
      order: {
        [query.sortBy]: query.sortDirection,
        id: "DESC",
      },
      take: query.limit,
      skip: query.offset,
    });
    return { items, total, limit: query.limit, offset: query.offset };
  }

  async findById(id: string): Promise<CallbackEventEntity> {
    assertUuid(id);
    const event = await this.callbackRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Callback event ${id} not found`);
    }
    return event;
  }

  async deleteOne(id: string): Promise<void> {
    assertUuid(id);
    const result = await this.callbackRepository.delete({ id });
    if (!result.affected) {
      throw new NotFoundException(`Callback event ${id} not found`);
    }
  }

  async deleteAll(): Promise<void> {
    await this.callbackRepository
      .createQueryBuilder()
      .delete()
      .from(CallbackEventEntity)
      .execute();
  }

  async latestStatus(): Promise<CallbackStats> {
    const oneHourAgo = new Date(this.now().getTime() - 60 * 60 * 1000);
    const [total, lastHour, latest, latestFive] = await Promise.all([
      this.callbackRepository.count(),
      this.callbackRepository.count({ where: { timestamp: MoreThanOrEqual(oneHourAgo) } }),
      this.callbackRepository.findOne({ order: { timestamp: "DESC" } }),
      this.callbackRepository.find({ order: { timestamp: "DESC" }, take: 5 }),
    ]);
    return { total, lastHour, latest, latestFive };
  }

  async pruneExpired(now: Date = this.now()): Promise<number> {
    const cutoff = new Date(now.getTime() - this.options.retentionDays * 24 * 60 * 60 * 1000);
    const result = await this.callbackRepository
      .createQueryBuilder()
      .delete()
      .from(CallbackEventEntity)
      .where('"timestamp" < :cutoff', { cutoff })
      .execute();
    const removed = result.affected ?? 0;
    if (removed > 0) {
      this.logger.log(`Removed ${removed} callback events older than ${this.options.retentionDays} days`);
    }
    return removed;
  }

  private async logError(error: unknown, snapshot: CallbackRequestSnapshot): Promise<void> {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    const entry = {
      timestamp: this.now().toISOString(),
      error: message,
      method: snapshot.method,
      url: buildFullUrl(snapshot),
      sourceIp: getSourceIp(snapshot),
    };

    this.logger.error(`Failed to store callback event: ${message}`);
    await mkdir(this.options.logDirectory, { recursive: true });
    await appendFile(join(this.options.logDirectory, ERROR_LOG_FILE), `${JSON.stringify(entry)}\n`, "utf8");
  }

  private consumeRateLimit(sourceIp: string, timestamp: Date): boolean {
    if (this.options.rateLimitMax <= 0) {
      return true;
    }

    const nowMs = timestamp.getTime();
    const bucket = this.rateLimitBuckets.get(sourceIp);
    if (!bucket || nowMs - bucket.windowStartedAt >= this.options.rateLimitWindowMs) {
      this.rateLimitBuckets.set(sourceIp, { windowStartedAt: nowMs, count: 1 });
      return true;
    }

    if (bucket.count >= this.options.rateLimitMax) {
      return false;
    }

    bucket.count += 1;
    return true;
  }

  private buildUnsavedEvent(
    snapshot: CallbackRequestSnapshot,
    timestamp: Date,
    sourceIp: string,
    id: string,
  ): CallbackEventEntity {
    return {
      id,
      timestamp,
      sourceIp,
      userAgent: truncateNullableText(readHeader(snapshot.headers, "user-agent"), MAX_USER_AGENT_LENGTH),
      method: normalizeMethod(snapshot.method),
      url: truncateText(buildFullUrl(snapshot), MAX_URL_LENGTH),
      headers: normalizeHeaders(snapshot.headers),
      queryParams: snapshot.queryParams,
      body: truncateNullableText(serializeBody(snapshot.body), MAX_BODY_LENGTH),
      status: "error",
      processedAt: timestamp,
      targetId: truncateNullableText(extractTargetId(snapshot), MAX_TARGET_ID_LENGTH),
      payload: truncateNullableText(extractPayload(snapshot), MAX_PAYLOAD_LENGTH),
    } as CallbackEventEntity;
  }
}

function buildWhere(query: CallbackListQuery): FindOptionsWhere<CallbackEventEntity> {
  const where: FindOptionsWhere<CallbackEventEntity> = {};
  if (query.sourceIp) {
    where.sourceIp = query.sourceIp;
  }
  if (query.from && query.to) {
    where.timestamp = Between(query.from, query.to);
  } else if (query.from) {
    where.timestamp = MoreThanOrEqual(query.from);
  } else if (query.to) {
    where.timestamp = LessThanOrEqual(query.to);
  }
  return where;
}

function getSourceIp(snapshot: CallbackRequestSnapshot): string {
  const forwardedFor = readHeader(snapshot.headers, "x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();
  return firstForwardedIp || snapshot.socketRemoteAddress || "unknown";
}

function assertUuid(id: string): void {
  if (!UUID_PATTERN.test(id)) {
    throw new BadRequestException(`Callback event id must be a UUID, received "${id}"`);
  }
}

function normalizeMethod(method: string): CallbackMethod {
  return method.toUpperCase() === "GET" ? "GET" : "POST";
}

function buildFullUrl(snapshot: CallbackRequestSnapshot): string {
  const protocol = readHeader(snapshot.headers, "x-forwarded-proto") ?? snapshot.protocol;
  const host = readHeader(snapshot.headers, "x-forwarded-host") ?? snapshot.host;
  return `${protocol}://${host}${snapshot.originalUrl}`;
}

function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string | string[]> {
  return Object.fromEntries(
    Object.entries(headers)
      .filter((entry): entry is [string, string | string[]] => entry[1] !== undefined)
      .map(([key, value]) => [key.toLowerCase(), value]),
  );
}

function serializeBody(body: unknown): string | null {
  if (body === undefined || body === null) {
    return null;
  }
  if (typeof body === "string") {
    return body;
  }
  if (Buffer.isBuffer(body)) {
    return body.toString("utf8");
  }
  return JSON.stringify(body, null, 2);
}

function extractTargetId(snapshot: CallbackRequestSnapshot): string | null {
  return readRecordString(snapshot.queryParams, "targetId") ??
    readRecordString(asRecord(snapshot.body), "targetId") ??
    readRecordString(asRecord(snapshot.body), "target") ??
    null;
}

function extractPayload(snapshot: CallbackRequestSnapshot): string | null {
  return readRecordString(asRecord(snapshot.body), "payload") ??
    readRecordString(snapshot.queryParams, "payload") ??
    serializeBody(snapshot.body);
}

function readHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name);
  const value = entry?.[1];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readRecordString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function truncateNullableText(value: string | null, maxLength: number): string | null {
  return value === null ? null : truncateText(value, maxLength);
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - TRUNCATION_SUFFIX.length))}${TRUNCATION_SUFFIX}`;
}

function readPositiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}
