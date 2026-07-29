import { http } from "./axios-instance";

export type SendMailRequest = {
  readonly to: string;
  readonly subject: string;
  readonly text?: string;
  readonly html?: string;
};

export type DeliveryStatus =
  | "created"
  | "submitting"
  | "accepted"
  | "queued"
  | "retrying"
  | "delivered"
  | "deferred"
  | "bounced"
  | "failed"
  | "cancelled"
  | "stale"
  | "sync_pending";

export type DeliveryRecord = {
  readonly id: string;
  readonly status: DeliveryStatus;
  readonly messageId: string;
  readonly sender: string;
  readonly recipient: string;
  readonly subject: string;
  readonly preview: string;
  readonly attemptCount: number;
  readonly queueId: string | null;
  readonly errorCategory: string | null;
  readonly errorMessage: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
};

export type DeliveryEvent = {
  readonly id: string;
  readonly eventId: string;
  readonly source: string;
  readonly status: DeliveryStatus;
  readonly queueId: string | null;
  readonly mxHost: string | null;
  readonly smtpCode: number | null;
  readonly errorCategory: string | null;
  readonly message: string | null;
  readonly createdAt: string;
};

export type SmtpSettings = {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly requireTls: boolean;
  readonly from: string;
  readonly user: string;
  readonly hasPassword: boolean;
  readonly proxyHost: string;
  readonly proxyPort: number;
  readonly proxyUser: string;
  readonly hasProxyPassword: boolean;
};

export type UpdateSmtpSettingsRequest = {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly requireTls: boolean;
  readonly from: string;
  readonly user: string;
  readonly password: string;
  readonly proxyHost: string;
  readonly proxyPort: number;
  readonly proxyUser: string;
  readonly proxyPassword: string;
};

export async function sendMail(request: SendMailRequest): Promise<void> {
  await http.post("/api/smtp/send", request);
}

export async function getDeliveries(
  status?: DeliveryStatus,
): Promise<{ readonly items: DeliveryRecord[]; readonly total: number }> {
  const response = await http.get("/api/smtp/deliveries", {
    params: status ? { status } : undefined,
  });
  return response.data as { readonly items: DeliveryRecord[]; readonly total: number };
}

export async function getDeliveryDetails(id: string): Promise<{
  readonly delivery: DeliveryRecord;
  readonly events: DeliveryEvent[];
}> {
  const response = await http.get(`/api/smtp/deliveries/${id}`);
  return response.data;
}

export async function cancelDelivery(id: string): Promise<void> {
  await http.post(`/api/smtp/deliveries/${id}/cancel`);
}

export async function getSmtpSettings(): Promise<SmtpSettings> {
  const response = await http.get<SmtpSettings>("/api/smtp/settings");
  return response.data;
}

export async function updateSmtpSettings(
  request: UpdateSmtpSettingsRequest,
): Promise<SmtpSettings> {
  const response = await http.put<SmtpSettings>("/api/smtp/settings", request);
  return response.data;
}
