import { useEffect, useMemo, useState } from "react";

import { clearBeacons, getBeacons } from "@/shared/api/beacons";
import type { Beacon, BeaconFilter } from "@/shared/model/beacon";
import { useSse } from "@/shared/hooks/use-sse";

const DEFAULT_FILTER: BeaconFilter = "all";

function matchesFilter(beacon: Beacon, filter: BeaconFilter): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "online") {
    return beacon.heartbeat === "ONLINE";
  }

  if (filter === "offline") {
    return beacon.heartbeat === "OFFLINE";
  }

  return beacon.type === filter;
}

export function useBeaconsDashboard() {
  const [beacons, setBeacons] = useState<Beacon[]>([]);
  const [filter, setFilter] = useState<BeaconFilter>(DEFAULT_FILTER);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void getBeacons()
      .then((loadedBeacons) => {
        if (!isMounted) {
          return;
        }

        setBeacons(loadedBeacons);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!isMounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load beacons");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useSse({
    onBeacon: (beacon) => {
      setBeacons((currentBeacons) => [beacon, ...currentBeacons.filter((currentBeacon) => currentBeacon.id !== beacon.id)]);
    },
  });

  const visibleBeacons = useMemo(
    () => beacons.filter((beacon) => matchesFilter(beacon, filter)),
    [beacons, filter],
  );

  const counts = useMemo(() => {
    const lootBeacons = beacons.filter((b) => b.type === "loot");
    const heartbeatBeacons = beacons.filter((b) => b.type === "heartbeat");

    // Count unique users (by mbxGuid) that are currently online/offline
    // beacons are sorted DESC — first seen per mbxGuid is the latest status
    const userStatusMap = new Map<string, "ONLINE" | "OFFLINE">();
    for (const b of heartbeatBeacons) {
      if (b.mbxGuid && b.heartbeat && !userStatusMap.has(b.mbxGuid)) {
        userStatusMap.set(b.mbxGuid, b.heartbeat);
      }
    }

    return {
      total: lootBeacons.length + heartbeatBeacons.length,
      loot: lootBeacons.length,
      users: userStatusMap.size,
      online: [...userStatusMap.values()].filter((s) => s === "ONLINE").length,
      offline: [...userStatusMap.values()].filter((s) => s === "OFFLINE").length,
    };
  }, [beacons]);

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await clearBeacons();
      setBeacons([]);
      setError(null);
    } catch (clearError: unknown) {
      setError(clearError instanceof Error ? clearError.message : "Failed to clear beacons");
    } finally {
      setIsClearing(false);
    }
  };

  return {
    beacons,
    visibleBeacons,
    filter,
    setFilter,
    isLoading,
    error,
    isClearing,
    counts,
    handleClearAll,
  };
}
