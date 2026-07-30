export type CallbackStatus = "received" | "processed" | "error";
export type CallbackMethod = "GET" | "POST";
export type CallbackSortField = "timestamp" | "sourceIp" | "status";
export type CallbackSortDirection = "ASC" | "DESC";

export type CallbackEvent = {
  readonly id: string;
  readonly timestamp: string;
  readonly sourceIp: string;
  readonly userAgent: string | null;
  readonly method: CallbackMethod;
  readonly url: string;
  readonly headers: Record<string, string | readonly string[]>;
  readonly queryParams: Record<string, unknown>;
  readonly body: string | null;
  readonly status: CallbackStatus;
  readonly processedAt: string | null;
  readonly targetId: string | null;
  readonly payload: string | null;
};

export type CallbackListFilters = {
  readonly sourceIp?: string | undefined;
  readonly from?: string | undefined;
  readonly to?: string | undefined;
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
  readonly sortBy?: CallbackSortField | undefined;
  readonly sortDirection?: CallbackSortDirection | undefined;
};

export type CallbackListResponse = {
  readonly items: readonly CallbackEvent[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CallbackStatsResponse = {
  readonly total: number;
  readonly lastHour: number;
  readonly latest: CallbackEvent | null;
  readonly latestFive: readonly CallbackEvent[];
};
