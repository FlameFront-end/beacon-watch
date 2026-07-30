import { useEffect, useState } from "react";

import {
  clearCallbacks,
  deleteCallback,
  getCallback,
  getCallbackStats,
  listCallbacks,
} from "@/shared/api/callback";
import type {
  CallbackEvent,
  CallbackListFilters,
  CallbackListResponse,
  CallbackStatsResponse,
} from "@/shared/model/callback";

export function useCallbackList(filters: CallbackListFilters) {
  const [result, setResult] = useState<CallbackListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (signal?: AbortSignal): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      setResult(await listCallbacks(filters, signal));
    } catch (loadError: unknown) {
      if (!signal?.aborted) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load callbacks");
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [
    filters.sourceIp,
    filters.from,
    filters.to,
    filters.limit,
    filters.offset,
    filters.sortBy,
    filters.sortDirection,
  ]);

  const remove = async (id: string): Promise<void> => {
    await deleteCallback(id);
    await load();
  };

  const clear = async (): Promise<void> => {
    await clearCallbacks();
    await load();
  };

  return {
    result,
    isLoading,
    error,
    reload: load,
    remove,
    clear,
  };
}

export function useCallbackDetail(id: string) {
  const [event, setEvent] = useState<CallbackEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const loaded = await getCallback(id);
        if (isMounted) setEvent(loaded);
      } catch (loadError: unknown) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load callback");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [id]);

  return { event, isLoading, error };
}

export function useCallbackStats() {
  const [stats, setStats] = useState<CallbackStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async (): Promise<void> => {
      try {
        const loaded = await getCallbackStats();
        if (isMounted) setStats(loaded);
      } catch (loadError: unknown) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load callback stats");
        }
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), 15_000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return { stats, error };
}
