import { http } from "./axios-instance";

export type AdminNotificationType = "success" | "error";

export type AdminNotificationLogs = {
  readonly success: readonly string[];
  readonly error: readonly string[];
};

export function adminNotificationPath(
  serviceKey: string,
  type: AdminNotificationType,
): string {
  return `/api/services/${encodeURIComponent(serviceKey)}/notif/admin/${type}`;
}

export function adminNotificationLogsPath(serviceKey: string): string {
  return `/api/services/${encodeURIComponent(serviceKey)}/notif/admin/logs`;
}

export function adminNotificationLogPath(
  serviceKey: string,
  type: AdminNotificationType,
): string {
  return `${adminNotificationLogsPath(serviceKey)}/${type}`;
}

export async function getAdminNotificationLogs(
  serviceKey: string,
): Promise<AdminNotificationLogs> {
  const response = await http.get<AdminNotificationLogs>(adminNotificationLogsPath(serviceKey), {
    params: { limit: 100 },
  });
  return response.data;
}

export async function clearAdminNotificationLog(
  serviceKey: string,
  type: AdminNotificationType,
): Promise<void> {
  await http.delete(adminNotificationLogPath(serviceKey, type));
}

export async function clearAdminNotificationLogs(serviceKey: string): Promise<void> {
  await http.delete(adminNotificationLogsPath(serviceKey));
}
