import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { isIP } from "node:net";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import * as socks from "socks";

import type { CalendarInvite, MailSender, OutgoingMail } from "./mail-sending.service.js";
import { SmtpSettingsService } from "./smtp-settings.service.js";

@Injectable()
export class SmtpMailerService implements MailSender {
  private readonly logger = new Logger(SmtpMailerService.name);

  constructor(
    private readonly smtpSettingsService: SmtpSettingsService,
    private readonly configService: ConfigService,
  ) {}

  async send(message: OutgoingMail): Promise<void> {
    const settings = await this.smtpSettingsService.get();
    const timeoutMs = parseTimeout(
      this.configService.get<string>("SMTP_TIMEOUT_MS"),
    );
    const from = settings.from;
    if (!from) {
      throw new Error("SMTP_FROM is required");
    }

    const transportOptions: SmtpTransportOptions = {
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      requireTLS: settings.requireTls,
      ignoreTLS: !settings.secure && !settings.requireTls,
      auth: settings.user && settings.password
        ? { user: settings.user, pass: settings.password }
        : undefined,
      proxy: settings.proxyHost
        ? buildSocks5ProxyUrl(settings)
        : undefined,
      connectionTimeout: timeoutMs,
      greetingTimeout: timeoutMs,
      socketTimeout: timeoutMs,
    };
    const transporter: Transporter = nodemailer.createTransport(
      transportOptions as Parameters<typeof nodemailer.createTransport>[0],
    );
    if (settings.proxyHost) {
      transporter.set("proxy_socks_module", socks);
    }

    await transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      messageId: message.messageId,
      attachments: message.calendarInvite
        ? [
            {
              filename: "invite.ics",
              content: buildCalendarInvite({
                invite: message.calendarInvite,
                from,
                to: message.to,
                uid: message.messageId ?? `${Date.now()}@beaconwatch.local`,
              }),
              contentType: "text/calendar; method=REQUEST; charset=UTF-8",
            },
          ]
        : undefined,
    });

    this.logger.log(`SMTP message accepted for ${message.to}`);
  }
}

function buildSocks5ProxyUrl(settings: {
  readonly proxyHost: string;
  readonly proxyPort: number;
  readonly proxyUser: string;
  readonly proxyPassword: string;
}): string {
  const host = isIP(settings.proxyHost) === 6
    ? `[${settings.proxyHost}]`
    : settings.proxyHost;
  const proxy = new URL(`socks5://${host}:${settings.proxyPort}`);
  if (settings.proxyUser) {
    proxy.username = settings.proxyUser;
    proxy.password = settings.proxyPassword;
  }

  return proxy.toString();
}

type SmtpTransportOptions = {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly requireTLS: boolean;
  readonly ignoreTLS: boolean;
  readonly auth?: {
    readonly user: string;
    readonly pass: string;
  };
  readonly proxy?: string;
  readonly connectionTimeout: number;
  readonly greetingTimeout: number;
  readonly socketTimeout: number;
};

const DEFAULT_SMTP_TIMEOUT_MS = 10_000;

function parseTimeout(value: unknown): number {
  const timeout = Number(value ?? DEFAULT_SMTP_TIMEOUT_MS);
  return Number.isSafeInteger(timeout) && timeout > 0
    ? timeout
    : DEFAULT_SMTP_TIMEOUT_MS;
}

function buildCalendarInvite(input: {
  readonly invite: CalendarInvite;
  readonly from: string;
  readonly to: string;
  readonly uid: string;
}): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BeaconWatch//SMTP Calendar Invite//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${escapeCalendarText(input.uid.replace(/^<|>$/g, ""))}`,
    `DTSTAMP:${formatCalendarDate(new Date())}`,
    `DTSTART:${formatCalendarDate(input.invite.startsAt)}`,
    `DTEND:${formatCalendarDate(input.invite.endsAt)}`,
    `SUMMARY:${escapeCalendarText(input.invite.title)}`,
    `DESCRIPTION:${escapeCalendarText(input.invite.description ?? "")}`,
    `LOCATION:${escapeCalendarText(input.invite.location ?? "")}`,
    `ORGANIZER:MAILTO:${input.from}`,
    `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:MAILTO:${input.to}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ].map(foldCalendarLine).join("\r\n");
}

function formatCalendarDate(date: Date): string {
  return date.toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeCalendarText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replace(/\r?\n/g, "\\n");
}

function foldCalendarLine(line: string): string {
  const limit = 75;
  if (line.length <= limit) {
    return line;
  }

  const parts: string[] = [];
  let remainingLine = line;
  while (remainingLine.length > limit) {
    parts.push(remainingLine.slice(0, limit));
    remainingLine = ` ${remainingLine.slice(limit)}`;
  }
  parts.push(remainingLine);
  return parts.join("\r\n");
}
