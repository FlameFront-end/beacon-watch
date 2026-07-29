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
  readonly calendarInvite?: CalendarInvite;
};

export type CalendarInvite = {
  readonly title: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly location?: string;
  readonly description?: string;
};

export interface MailSender {
  send(message: OutgoingMail): Promise<void>;
}

export const MAIL_SENDER = Symbol("MAIL_SENDER");

const MAX_CALENDAR_DURATION_MS = 24 * 60 * 60 * 1000;
const CALENDAR_PAST_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CALENDAR_TITLE_LENGTH = 120;
const MAX_CALENDAR_LOCATION_LENGTH = 160;
const MAX_CALENDAR_DESCRIPTION_LENGTH = 2_000;

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
  const calendarInvite = parseCalendarInvite(value.calendarInvite);

  if (!to || !isEmailAddress(to)) {
    throw new BadRequestException("A valid recipient email is required");
  }

  if (!subject) {
    throw new BadRequestException("A subject is required");
  }

  if (!text) {
    throw new BadRequestException("Message text is required");
  }

  return {
    to,
    subject,
    text,
    ...(html ? { html } : {}),
    ...(calendarInvite ? { calendarInvite } : {}),
  };
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

function parseCalendarInvite(value: unknown): CalendarInvite | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException("Calendar invite must be an object");
  }

  const invite = value as Record<string, unknown>;
  const title = readTrimmedString(invite.title);
  const location = readTrimmedString(invite.location);
  const description = readTrimmedString(invite.description);
  const startsAt = readDate(invite.startsAt);
  const endsAt = readDate(invite.endsAt);

  if (!title) {
    throw new BadRequestException("Calendar invite title is required");
  }
  if (title.length > MAX_CALENDAR_TITLE_LENGTH) {
    throw new BadRequestException(`Calendar invite title must be ${MAX_CALENDAR_TITLE_LENGTH} characters or fewer`);
  }
  if (location.length > MAX_CALENDAR_LOCATION_LENGTH) {
    throw new BadRequestException(`Calendar invite location must be ${MAX_CALENDAR_LOCATION_LENGTH} characters or fewer`);
  }
  if (description.length > MAX_CALENDAR_DESCRIPTION_LENGTH) {
    throw new BadRequestException(`Calendar invite description must be ${MAX_CALENDAR_DESCRIPTION_LENGTH} characters or fewer`);
  }
  if (!startsAt || !endsAt) {
    throw new BadRequestException("Calendar invite start and end dates are required");
  }
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new BadRequestException("Calendar invite end date must be after the start date");
  }
  if (endsAt.getTime() - startsAt.getTime() > MAX_CALENDAR_DURATION_MS) {
    throw new BadRequestException("Calendar invite duration must be 24 hours or shorter");
  }
  if (startsAt.getTime() < Date.now() - CALENDAR_PAST_WINDOW_MS) {
    throw new BadRequestException("Calendar invite start date is too far in the past");
  }

  return {
    title,
    startsAt,
    endsAt,
    ...(location ? { location } : {}),
    ...(description ? { description } : {}),
  };
}

function readDate(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
