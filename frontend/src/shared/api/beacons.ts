import type { Beacon, BeaconFilter } from "@/shared/model/beacon";
import { http } from "./axios-instance";

export async function getBeacons(filter?: BeaconFilter): Promise<Beacon[]> {
  const queryType =
    filter && filter !== "all"
      ? filter === "online" || filter === "offline"
        ? "heartbeat"
        : filter
      : undefined;

  const response = await http.get<Beacon[]>("/beacons", {
    params: queryType ? { type: queryType } : undefined,
  });
  const beacons = response.data;
  if (!filter || filter === "all") {
    return beacons;
  }
  if (filter === "online") {
    return beacons.filter((beacon) => beacon.heartbeat === "ONLINE");
  }
  if (filter === "offline") {
    return beacons.filter((beacon) => beacon.heartbeat === "OFFLINE");
  }
  return beacons;
}

export async function getBeacon(beaconId: string): Promise<Beacon> {
  const response = await http.get<Beacon>(`/beacons/${encodeURIComponent(beaconId)}`);
  return response.data;
}

export async function clearBeacons(): Promise<void> {
  await http.delete("/beacons");
}
