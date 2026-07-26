import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

import type { MailSender, OutgoingMail } from "./mail-sending.service.js";
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

    const transporter: Transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      requireTLS: settings.requireTls,
      ignoreTLS: !settings.secure && !settings.requireTls,
      auth: settings.user && settings.password
        ? { user: settings.user, pass: settings.password }
        : undefined,
      connectionTimeout: timeoutMs,
      greetingTimeout: timeoutMs,
      socketTimeout: timeoutMs,
    });

    await transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    this.logger.log(`SMTP message accepted for ${message.to}`);
  }
}

const DEFAULT_SMTP_TIMEOUT_MS = 10_000;

function parseTimeout(value: unknown): number {
  const timeout = Number(value ?? DEFAULT_SMTP_TIMEOUT_MS);
  return Number.isSafeInteger(timeout) && timeout > 0
    ? timeout
    : DEFAULT_SMTP_TIMEOUT_MS;
}
