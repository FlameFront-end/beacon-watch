import type { BadgeTone } from "@/shared/kit";
import type { CallbackEvent, CallbackStatus } from "@/shared/model/callback";

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

export function statusTone(status: CallbackStatus): BadgeTone {
  if (status === "error") {
    return "danger";
  }
  return status === "processed" ? "success" : "neutral";
}

export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function eventAsJson(event: CallbackEvent): string {
  return formatJson(event);
}

export function shortId(id: string): string {
  return id.length <= 8 ? id : id.slice(0, 8);
}
