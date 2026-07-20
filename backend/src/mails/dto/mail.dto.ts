export type MailDto = {
  readonly id: string;
  readonly changeKey: string;
  readonly subject: string;
  readonly from: string;
  readonly fromEmail: string;
  readonly date: string;
  readonly hasAttachments: boolean;
  readonly isRead: boolean;
  readonly size: number;
  readonly body: string;
};

export type AcceptMailsResponse = {
  readonly accepted: number;
  readonly skipped: number;
};
