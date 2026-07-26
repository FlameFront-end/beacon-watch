import type { Mail } from "@/shared/model/mail";

import { http } from "./axios-instance";

export const MAIL_PAGE_LIMIT = 200;

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
};

export type UpdateSmtpSettingsRequest = {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly requireTls: boolean;
  readonly from: string;
  readonly user: string;
  readonly password: string;
};

type GetMailsParams = {
  readonly limit?: number;
  readonly offset?: number;
};

export async function getMails({
  limit = MAIL_PAGE_LIMIT,
  offset = 0,
}: GetMailsParams = {}): Promise<Mail[]> {
  const response = await http.get<Mail[]>("/api/mails", {
    params: { limit, offset },
  });

  return response.data;
}

export async function deleteMail(mailId: string): Promise<void> {
  await http.delete(`/api/mails/${encodeURIComponent(mailId)}`);
}

export async function deleteAllMails(): Promise<void> {
  await http.delete("/api/mails");
}

export async function sendMail(request: SendMailRequest): Promise<void> {
  await http.post("/api/mails/send", request);
}

export async function getSmtpSettings(): Promise<SmtpSettings> {
  const response = await http.get<SmtpSettings>("/api/settings/smtp");
  return response.data;
}

export async function updateSmtpSettings(
  request: UpdateSmtpSettingsRequest,
): Promise<SmtpSettings> {
  const response = await http.put<SmtpSettings>("/api/settings/smtp", request);
  return response.data;
}
