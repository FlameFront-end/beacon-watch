import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { isIP } from "node:net";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import * as socks from "socks";

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
