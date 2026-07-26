import type { Beacon, BeaconFilter } from "@/shared/model/beacon";
import type { ServiceKey } from "@/shared/config/services";
import { http } from "./axios-instance";
import { serviceBeaconsPath } from "./service-api-paths";

export async function getBeacons(
  serviceKey: ServiceKey,
  filter?: BeaconFilter,
): Promise<Beacon[]> {
  const queryType =
    filter && filter !== "all"
      ? filter === "online" || filter === "offline"
        ? "heartbeat"
        : filter
      : undefined;

  const response = await http.get<Beacon[]>(serviceBeaconsPath(serviceKey), {
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

export async function getBeacon(
  serviceKey: ServiceKey,
  beaconId: string,
): Promise<Beacon> {
  const response = await http.get<Beacon>(
    serviceBeaconsPath(serviceKey, beaconId),
  );
  return response.data;
}

export async function clearBeacons(serviceKey: ServiceKey): Promise<void> {
  await http.delete(serviceBeaconsPath(serviceKey));
}
