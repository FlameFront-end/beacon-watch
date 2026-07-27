import { useEffect, useState } from "react";

import {
  clearAdminNotificationLog,
  clearAdminNotificationLogs,
  getAdminNotificationLogs,
  type AdminNotificationType,
  type AdminNotificationLogs,
} from "@/shared/api/admin-notifications";
import type { ServiceKey } from "@/shared/config/services";

const EMPTY_LOGS: AdminNotificationLogs = { success: [], error: [] };

export function useAdminNotificationLogs(serviceKey: ServiceKey) {
  const [logs, setLogs] = useState<AdminNotificationLogs>(EMPTY_LOGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState<AdminNotificationType | "all" | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadLogs = async (): Promise<void> => {
      try {
        const loadedLogs = await getAdminNotificationLogs(serviceKey);
        if (isMounted) {
          setLogs(loadedLogs);
          setError(null);
        }
      } catch (loadError: unknown) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load admin logs");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadLogs();
    const refreshTimer = window.setInterval(() => {
      void loadLogs();
    }, 15_000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, [serviceKey]);

  const clearLog = async (type: AdminNotificationType): Promise<void> => {
    setClearing(type);
    try {
      await clearAdminNotificationLog(serviceKey, type);
      setLogs((currentLogs) => ({ ...currentLogs, [type]: [] }));
      setError(null);
    } catch (clearError: unknown) {
      const message = clearError instanceof Error ? clearError.message : "Failed to clear admin logs";
      setError(message);
      throw clearError;
    } finally {
      setClearing(null);
    }
  };

  const clearAll = async (): Promise<void> => {
    setClearing("all");
    try {
      await clearAdminNotificationLogs(serviceKey);
      setLogs(EMPTY_LOGS);
      setError(null);
    } catch (clearError: unknown) {
      const message = clearError instanceof Error ? clearError.message : "Failed to clear admin logs";
      setError(message);
      throw clearError;
    } finally {
      setClearing(null);
    }
  };

  return { logs, isLoading, error, clearing, clearLog, clearAll };
}
