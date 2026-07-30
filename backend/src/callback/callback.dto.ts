import { BadRequestException } from "@nestjs/common";

import type { CallbackEventEntity } from "./callback.entity.js";

export type CallbackRequestSnapshot = {
  readonly method: string;
  readonly protocol: string;
  readonly host: string;
  readonly originalUrl: string;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly queryParams: Record<string, unknown>;
  readonly body: unknown;
  readonly socketRemoteAddress: string | undefined;
};

export type CallbackListQuery = {
  readonly limit: number;
  readonly offset: number;
  readonly sourceIp?: string;
  readonly from?: Date;
  readonly to?: Date;
  readonly sortBy: CallbackSortField;
  readonly sortDirection: CallbackSortDirection;
};

export type CallbackSortField = "timestamp" | "sourceIp" | "status";
export type CallbackSortDirection = "ASC" | "DESC";

export type CallbackStats = {
  readonly total: number;
  readonly lastHour: number;
  readonly latest: CallbackEventEntity | null;
  readonly latestFive: CallbackEventEntity[];
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MAX_OFFSET = 100_000;
const MAX_SOURCE_IP_LENGTH = 128;
const SORT_FIELDS = new Set<CallbackSortField>(["timestamp", "sourceIp", "status"]);

export function parseCallbackListQuery(query: Record<string, unknown>): CallbackListQuery {
  const from = readOptionalDate(query.from, "from");
  const to = readOptionalDate(query.to, "to");
  if (from && to && from.getTime() > to.getTime()) {
    throw new BadRequestException("from must be before or equal to to");
  }

  return {
    limit: readBoundedInteger(query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT, "limit"),
    offset: readBoundedInteger(query.offset, 0, 0, MAX_OFFSET, "offset"),
    sourceIp: readOptionalString(query.sourceIp, "sourceIp", MAX_SOURCE_IP_LENGTH),
    from,
    to,
    sortBy: readSortBy(query.sortBy),
    sortDirection: readSortDirection(query.sortDirection),
  };
}

function readBoundedInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  field: string,
): number {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value !== "string" && typeof value !== "number") {
    throw new BadRequestException(`${field} must be a number`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new BadRequestException(`${field} must be an integer between ${min} and ${max}`);
  }
  return parsed;
}

function readOptionalString(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new BadRequestException(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.length > maxLength) {
    throw new BadRequestException(`${field} must be ${maxLength} characters or fewer`);
  }
  return trimmed;
}

function readOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new BadRequestException(`${field} must be an ISO date`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${field} must be an ISO date`);
  }
  return date;
}

function readSortBy(value: unknown): CallbackSortField {
  return typeof value === "string" && SORT_FIELDS.has(value as CallbackSortField)
    ? value as CallbackSortField
    : "timestamp";
}

function readSortDirection(value: unknown): CallbackSortDirection {
  return typeof value === "string" && value.toUpperCase() === "ASC" ? "ASC" : "DESC";
}
