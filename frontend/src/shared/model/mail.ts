export type Mail = {
  readonly id: string;
  readonly receivedAt: string;
  readonly externalId: string;
  readonly changeKey: string;
  readonly subject: string;
  readonly sender: string;
  readonly senderEmail: string;
  readonly mailDate: string;
  readonly hasAttachments: boolean;
  readonly isRead: boolean;
  readonly size: number;
  readonly body: string;
};

export type MailFilter = "all" | "unread" | "read" | "attachments";
