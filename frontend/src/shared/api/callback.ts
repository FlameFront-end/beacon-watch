import { http } from "./axios-instance";
import type {
  CallbackEvent,
  CallbackListFilters,
  CallbackListResponse,
  CallbackStatsResponse,
} from "@/shared/model/callback";

const BASE_PATH = "/api/callback";

export async function listCallbacks(
  filters: CallbackListFilters,
  signal?: AbortSignal,
): Promise<CallbackListResponse> {
  const requestConfig = signal
    ? { params: filters, signal }
    : { params: filters };
  const response = await http.get<CallbackListResponse>(BASE_PATH, {
    ...requestConfig,
  });
  return response.data;
}

export async function getCallback(id: string): Promise<CallbackEvent> {
  const response = await http.get<CallbackEvent>(`${BASE_PATH}/${encodeURIComponent(id)}`);
  return response.data;
}

export async function deleteCallback(id: string): Promise<void> {
  await http.delete(`${BASE_PATH}/${encodeURIComponent(id)}`);
}

export async function clearCallbacks(): Promise<void> {
  await http.delete(BASE_PATH);
}

export async function getCallbackStats(): Promise<CallbackStatsResponse> {
  const response = await http.get<CallbackStatsResponse>(`${BASE_PATH}/status/latest`);
  return response.data;
}
