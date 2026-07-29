import { BadRequestException, Inject, Injectable, Optional } from "@nestjs/common";
import { convert } from "html-to-text";
import { randomUUID } from "node:crypto";

import { DeliveryHistoryService } from "./delivery-history.service.js";
import { SmtpSettingsService } from "./smtp-settings.service.js";

export type OutgoingMail = {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
  readonly messageId?: string;
};

export interface MailSender {
  send(message: OutgoingMail): Promise<void>;
}

export const MAIL_SENDER = Symbol("MAIL_SENDER");

@Injectable()
export class MailSendingService {
  constructor(
    @Inject(MAIL_SENDER) private readonly mailSender: MailSender,
    @Optional() private readonly deliveryHistoryService?: DeliveryHistoryService,
    @Optional() private readonly smtpSettingsService?: SmtpSettingsService,
  ) {}

  async send(payload: unknown): Promise<void> {
    const message = parseOutgoingMail(payload);
    if (!this.deliveryHistoryService || !this.smtpSettingsService) {
      await this.mailSender.send(message);
      return;
    }
    const settings = await this.smtpSettingsService.get();
    const messageId = `<${randomUUID()}@beaconwatch.local>`;
    const delivery = await this.deliveryHistoryService.create({
      messageId,
      sender: settings.from,
      recipient: message.to,
      subject: message.subject,
      preview: message.text.slice(0, 240),
      messageSize: Buffer.byteLength(message.text, "utf8"),
    });

    try {
      await this.deliveryHistoryService.recordEvent({
        deliveryId: delivery.id,
        eventId: `${delivery.id}:submitting`,
        source: "beaconwatch",
        status: "submitting",
      });
      await this.mailSender.send({ ...message, messageId });
      await this.deliveryHistoryService.recordEvent({
        deliveryId: delivery.id,
        eventId: `${delivery.id}:accepted`,
        source: "smtp",
        status: "accepted",
      });
    } catch (error: unknown) {
      await this.deliveryHistoryService.recordEvent({
        deliveryId: delivery.id,
        eventId: `${delivery.id}:failed`,
        source: "beaconwatch",
        status: "failed",
        errorCategory: classifySendError(error),
        message: error instanceof Error ? error.message.slice(0, 500) : "SMTP submission failed",
      });
      throw error;
    }
  }
}

function classifySendError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("auth")) {
    return "authentication_failed";
  }
  if (message.includes("timeout")) {
    return "network_timeout";
  }
  if (message.includes("tls")) {
    return "tls_error";
  }
  return "queue_error";
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
