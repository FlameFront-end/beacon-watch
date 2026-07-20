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

export type ListMailsQuery = {
  readonly limit?: number;
  readonly offset?: number;
};

export type StoredMailDto = {
  readonly id: string;
  readonly receivedAt: Date;
  readonly externalId: string;
  readonly changeKey: string;
  readonly subject: string;
  readonly sender: string;
  readonly senderEmail: string;
  readonly mailDate: Date;
  readonly hasAttachments: boolean;
  readonly isRead: boolean;
  readonly size: number;
  readonly body: string;
};
