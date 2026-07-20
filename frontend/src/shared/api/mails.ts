import type { Mail } from "@/shared/model/mail";

import { http } from "./axios-instance";

export const MAIL_PAGE_LIMIT = 200;

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
