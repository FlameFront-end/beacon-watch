import { http } from "./axios-instance";

export type SendMailRequest = {
  readonly to: string;
  readonly subject: string;
  readonly text?: string;
  readonly html?: string;
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
