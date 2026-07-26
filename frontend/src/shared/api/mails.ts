import type { Mail } from "@/shared/model/mail";
import type { ServiceKey } from "@/shared/config/services";

import { http } from "./axios-instance";
import { serviceEmailsPath } from "./service-api-paths";

export const MAIL_PAGE_LIMIT = 200;

type GetMailsParams = {
  readonly limit?: number;
  readonly offset?: number;
};

export async function getMails({
  serviceKey,
  limit = MAIL_PAGE_LIMIT,
  offset = 0,
}: GetMailsParams & { readonly serviceKey: ServiceKey }): Promise<Mail[]> {
  const response = await http.get<Mail[]>(serviceEmailsPath(serviceKey), {
    params: { limit, offset },
  });

  return response.data;
}

export async function deleteMail(
  serviceKey: ServiceKey,
  mailId: string,
): Promise<void> {
  await http.delete(serviceEmailsPath(serviceKey, mailId));
}

export async function deleteAllMails(serviceKey: ServiceKey): Promise<void> {
  await http.delete(serviceEmailsPath(serviceKey));
}
