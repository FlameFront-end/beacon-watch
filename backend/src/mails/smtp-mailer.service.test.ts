import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

import { SmtpMailerService } from "./smtp-mailer.service.js";
import type {
  SmtpSettings,
  SmtpSettingsService,
} from "./smtp-settings.service.js";

describe("SmtpMailerService", () => {
  it("uses STARTTLS, authentication, and configured connection settings", async () => {
    const settings: SmtpSettings = {
      host: "smtp.example.com",
      port: 587,
      secure: false,
      requireTls: true,
      from: "sender@example.com",
      user: "sender@example.com",
      password: "secret",
    };
    const capturedOptions: Array<Record<string, unknown>> = [];
    const originalCreateTransport = nodemailer.createTransport;
    nodemailer.createTransport = ((options: Record<string, unknown>) => {
      capturedOptions.push(options);
      return {
        sendMail: async () => ({ accepted: ["recipient@example.com"] }),
        set: () => new Map(),
      };
    }) as typeof nodemailer.createTransport;

    try {
      const smtpSettingsService = {
        get: async () => settings,
      } as Pick<SmtpSettingsService, "get">;
      const configService = {
        get: <T>(key: string, defaultValue?: T) =>
          key === "SMTP_TIMEOUT_MS" ? ("2500" as T) : defaultValue,
      } as ConfigService;
      const service = Reflect.construct(SmtpMailerService, [
        smtpSettingsService,
        configService,
      ]) as SmtpMailerService;

      await service.send({
        to: "recipient@example.com",
        subject: "Subject",
        text: "Body",
      });
    } finally {
      nodemailer.createTransport = originalCreateTransport;
    }

    assert.equal(capturedOptions[0]?.connectionTimeout, 2500);
    assert.equal(capturedOptions[0]?.greetingTimeout, 2500);
    assert.equal(capturedOptions[0]?.socketTimeout, 2500);
    assert.equal(capturedOptions[0]?.host, "smtp.example.com");
    assert.equal(capturedOptions[0]?.port, 587);
    assert.equal(capturedOptions[0]?.secure, false);
    assert.equal(capturedOptions[0]?.requireTLS, true);
    assert.equal(capturedOptions[0]?.ignoreTLS, false);
    assert.deepEqual(capturedOptions[0]?.auth, {
      user: "sender@example.com",
      pass: "secret",
    });
  });

  it("uses implicit TLS without STARTTLS", async () => {
    const options = await captureTransportOptions({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      requireTls: false,
      from: "sender@example.com",
      user: "sender@example.com",
      password: "secret",
    });

    assert.equal(options.secure, true);
    assert.equal(options.requireTLS, false);
    assert.equal(options.ignoreTLS, false);
  });

  it("attaches a calendar invite as an iCalendar request", async () => {
    let sentMessage: Record<string, unknown> | undefined;
    const originalCreateTransport = nodemailer.createTransport;
    nodemailer.createTransport = ((options: Record<string, unknown>) => {
      void options;
      return {
        sendMail: async (message: Record<string, unknown>) => {
          sentMessage = message;
          return { accepted: ["recipient@example.com"] };
        },
        set: () => new Map(),
      };
    }) as typeof nodemailer.createTransport;

    try {
      const smtpSettingsService = {
        get: async () => ({
          host: "smtp.example.com",
          port: 587,
          secure: false,
          requireTls: true,
          from: "sender@example.com",
          user: "sender@example.com",
          password: "secret",
        }),
      } as Pick<SmtpSettingsService, "get">;
      const configService = {
        get: <T>(_key: string, defaultValue?: T) => defaultValue,
      } as ConfigService;
      const service = Reflect.construct(SmtpMailerService, [
        smtpSettingsService,
        configService,
      ]) as SmtpMailerService;

      await service.send({
        to: "recipient@example.com",
        subject: "Subject",
        text: "Body",
        calendarInvite: {
          title: "Project sync",
          startsAt: new Date("2026-08-01T10:00:00.000Z"),
          endsAt: new Date("2026-08-01T10:30:00.000Z"),
          location: "Online",
          description: "Discuss delivery status",
        },
      });
    } finally {
      nodemailer.createTransport = originalCreateTransport;
    }

    const attachments = sentMessage?.attachments as Array<Record<string, unknown>> | undefined;
    assert.equal(sentMessage?.icalEvent, undefined);
    assert.equal(attachments?.[0]?.filename, "invite.ics");
    assert.equal(attachments?.[0]?.contentType, "text/calendar; method=REQUEST; charset=UTF-8");
    assert.match(String(attachments?.[0]?.content), /METHOD:REQUEST/);
    assert.match(String(attachments?.[0]?.content), /SUMMARY:Project sync/);
    assert.match(String(attachments?.[0]?.content), /DTSTART:20260801T100000Z/);
  });

  it("disables TLS explicitly for an anonymous relay", async () => {
    const options = await captureTransportOptions({
      host: "mail.cvelab.local",
      port: 25,
      secure: false,
      requireTls: false,
      from: "sender@cvelab.local",
      user: "",
      password: "",
    });

    assert.equal(options.secure, false);
    assert.equal(options.requireTLS, false);
    assert.equal(options.ignoreTLS, true);
    assert.equal(options.auth, undefined);
  });

  it("uses the configured SOCKS5 proxy with proxy authentication", async () => {
    const options = await captureTransportOptions({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      requireTls: true,
      from: "sender@example.com",
      user: "sender@example.com",
      password: "secret",
      proxyHost: "127.0.0.1",
      proxyPort: 1080,
      proxyUser: "proxy user",
      proxyPassword: "proxy/pass",
    });

    assert.equal(options.proxy, "socks5://proxy%20user:proxy%2Fpass@127.0.0.1:1080");
  });

  it("brackets an IPv6 SOCKS5 proxy host", async () => {
    const options = await captureTransportOptions({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      requireTls: true,
      from: "sender@example.com",
      user: "sender@example.com",
      password: "secret",
      proxyHost: "2001:db8::1",
      proxyPort: 1080,
      proxyUser: "",
      proxyPassword: "",
    });

    assert.equal(options.proxy, "socks5://[2001:db8::1]:1080");
  });
});

async function captureTransportOptions(
  settings: SmtpSettings,
): Promise<Record<string, unknown>> {
  let capturedOptions: Record<string, unknown> | undefined;
  const originalCreateTransport = nodemailer.createTransport;
  nodemailer.createTransport = ((options: Record<string, unknown>) => {
    capturedOptions = options;
    return {
      sendMail: async () => ({ accepted: ["recipient@example.com"] }),
      set: () => new Map(),
    };
  }) as typeof nodemailer.createTransport;

  try {
    const smtpSettingsService = {
      get: async () => settings,
    } as Pick<SmtpSettingsService, "get">;
    const configService = {
      get: <T>(_key: string, defaultValue?: T) => defaultValue,
    } as ConfigService;
    const service = Reflect.construct(SmtpMailerService, [
      smtpSettingsService,
      configService,
    ]) as SmtpMailerService;

    await service.send({
      to: "recipient@example.com",
      subject: "Subject",
      text: "Body",
    });
  } finally {
    nodemailer.createTransport = originalCreateTransport;
  }

  assert.ok(capturedOptions);
  return capturedOptions;
}
