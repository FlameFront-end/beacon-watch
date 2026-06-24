export type BeaconType = "loot" | "heartbeat";

export type HeartbeatState = "ONLINE" | "OFFLINE";

export type Beacon = {
  id: string;
  receivedAt: string;
  type: BeaconType;
  cookies?: string | null;
  mbxGuid?: string | null;
  forest?: string | null;
  heartbeat?: HeartbeatState | null;
  httpStatus?: number | null;
  raw: Record<string, unknown>;
};

export type BeaconFilter = "all" | "loot" | "heartbeat" | "online" | "offline";
