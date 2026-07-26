import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { convert } from "html-to-text";

export type OutgoingMail = {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
};

export interface MailSender {
  send(message: OutgoingMail): Promise<void>;
}

export const MAIL_SENDER = Symbol("MAIL_SENDER");

@Injectable()
export class MailSendingService {
  constructor(@Inject(MAIL_SENDER) private readonly mailSender: MailSender) {}

  async send(payload: unknown): Promise<void> {
    const message = parseOutgoingMail(payload);
    await this.mailSender.send(message);
  }
}

function parseOutgoingMail(payload: unknown): OutgoingMail {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new BadRequestException("Mail request must be an object");
  }

  const value = payload as Record<string, unknown>;
  const to = readTrimmedString(value.to);
  const subject = readTrimmedString(value.subject);
  const requestedText = readTrimmedString(value.text);
  const html = readTrimmedString(value.html);
  const text = requestedText || (html ? convertMailHtmlToText(html) : "");

  if (!to || !isEmailAddress(to)) {
    throw new BadRequestException("A valid recipient email is required");
  }

  if (!subject) {
    throw new BadRequestException("A subject is required");
  }

  if (!text) {
    throw new BadRequestException("Message text is required");
  }

  return html ? { to, subject, text, html } : { to, subject, text };
}

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function convertMailHtmlToText(html: string): string {
  return convert(html, {
    selectors: [{ selector: "img", format: "skip" }],
    wordwrap: false,
  }).trim();
}
