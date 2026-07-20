import { useEffect, useRef } from "react";

import { API_ORIGIN } from "@/shared/config/api";
import type { Beacon } from "@/shared/model/beacon";

type UseSseOptions = {
  onBeacon: (beacon: Beacon) => void;
  onError?: (error: Event | Error) => void;
};

export function useSse({ onBeacon, onError }: UseSseOptions): void {
  const onBeaconRef = useRef(onBeacon);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onBeaconRef.current = onBeacon;
  }, [onBeacon]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const eventSource = new EventSource(
      API_ORIGIN ? `${API_ORIGIN}/sse` : "/sse",
      { withCredentials: true },
    );

    eventSource.addEventListener("beacon", (event) => {
      const messageEvent = event as MessageEvent<string>;
      const parsed = parseBeaconEvent(messageEvent.data);
      if (!parsed) {
        onErrorRef.current?.(new Error("SSE beacon event contains invalid JSON"));
        return;
      }

      onBeaconRef.current(parsed);
    });

    eventSource.onerror = (event) => onErrorRef.current?.(event);

    return () => {
      eventSource.close();
    };
  }, []);
}

function parseBeaconEvent(serializedBeacon: string): Beacon | null {
  try {
    const parsedBeacon = JSON.parse(serializedBeacon) as unknown;
    if (!parsedBeacon || typeof parsedBeacon !== "object") {
      return null;
    }

    return parsedBeacon as Beacon;
  } catch {
    return null;
  }
}
