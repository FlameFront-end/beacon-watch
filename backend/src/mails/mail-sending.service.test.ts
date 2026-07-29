import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { BadRequestException } from "@nestjs/common";

import {
  MailSendingService,
  type MailSender,
} from "./mail-sending.service.js";

describe("MailSendingService", () => {
  it("trims and sends a valid plain-text message", async () => {
    const sender = createMailSender();
    const service = new MailSendingService(sender);

    await service.send({
      to: " recipient@example.com ",
      subject: " Test subject ",
      text: " Test body ",
    });

    assert.deepEqual(sender.sent, [
      {
        to: "recipient@example.com",
        subject: "Test subject",
        text: "Test body",
      },
    ]);
  });

  it("passes HTML to the mail sender", async () => {
    const sender = createMailSender();
    const service = new MailSendingService(sender);

    await service.send({
      to: "recipient@example.com",
      subject: "HTML subject",
      text: "Fallback text",
      html: "<p><strong>Hello</strong></p>",
    });

    assert.deepEqual(sender.sent, [
      {
        to: "recipient@example.com",
        subject: "HTML subject",
        text: "Fallback text",
        html: "<p><strong>Hello</strong></p>",
      },
    ]);
  });

  it("passes a validated calendar invite to the mail sender", async () => {
    const sender = createMailSender();
    const service = new MailSendingService(sender);

    await service.send({
      to: "recipient@example.com",
      subject: "Meeting request",
      text: "Please join the meeting.",
      calendarInvite: {
        title: "Project sync",
        startsAt: "2026-08-01T10:00:00.000Z",
        endsAt: "2026-08-01T10:30:00.000Z",
        location: "Online",
        description: "Discuss delivery status",
      },
    });

    assert.equal(sender.sent.length, 1);
    assert.deepEqual(sender.sent[0]?.calendarInvite, {
      title: "Project sync",
      startsAt: new Date("2026-08-01T10:00:00.000Z"),
      endsAt: new Date("2026-08-01T10:30:00.000Z"),
      location: "Online",
      description: "Discuss delivery status",
    });
  });

  it("rejects calendar invites that end before they start", async () => {
    const sender = createMailSender();
    const service = new MailSendingService(sender);

    await assert.rejects(
      () =>
        service.send({
          to: "recipient@example.com",
          subject: "Meeting request",
          text: "Please join the meeting.",
          calendarInvite: {
            title: "Project sync",
            startsAt: "2026-08-01T10:30:00.000Z",
            endsAt: "2026-08-01T10:00:00.000Z",
          },
        }),
      BadRequestException,
    );

    assert.deepEqual(sender.sent, []);
  });

  it("rejects calendar invites older than the allowed retention window", async () => {
    const sender = createMailSender();
    const service = new MailSendingService(sender);

    await assert.rejects(
      () =>
        service.send({
          to: "recipient@example.com",
          subject: "Meeting request",
          text: "Please join the meeting.",
          calendarInvite: {
            title: "Project sync",
            startsAt: "2020-07-01T10:00:00.000Z",
            endsAt: "2020-07-01T10:30:00.000Z",
          },
        }),
      BadRequestException,
    );

    assert.deepEqual(sender.sent, []);
  });

  it("rejects calendar invites longer than 24 hours", async () => {
    const sender = createMailSender();
    const service = new MailSendingService(sender);

    await assert.rejects(
      () =>
        service.send({
          to: "recipient@example.com",
          subject: "Meeting request",
          text: "Please join the meeting.",
          calendarInvite: {
            title: "Project sync",
            startsAt: "2026-08-01T10:00:00.000Z",
            endsAt: "2026-08-02T10:00:01.000Z",
          },
        }),
      BadRequestException,
    );

    assert.deepEqual(sender.sent, []);
  });

  it("rejects overlong calendar invite fields", async () => {
    const sender = createMailSender();
    const service = new MailSendingService(sender);

    await assert.rejects(
      () =>
        service.send({
          to: "recipient@example.com",
          subject: "Meeting request",
          text: "Please join the meeting.",
          calendarInvite: {
            title: "x".repeat(121),
            startsAt: "2026-08-01T10:00:00.000Z",
            endsAt: "2026-08-01T10:30:00.000Z",
          },
        }),
      BadRequestException,
    );

    assert.deepEqual(sender.sent, []);
  });

  it("passes raw executable HTML to the mail sender unchanged", async () => {
    const sender = createMailSender();
    const service = new MailSendingService(sender);
    const html =
      '<img src="x1" class="payload-fragment" ' +
      'alt="x originalSrc=\'cid:1\' onerror=window._testJs=this.className y" ' +
      'onerror="window.runPayload()" ' +
      'style="width:0;height:0;position:absolute;visibility:hidden"/>';

    await service.send({
      to: "recipient@example.com",
      subject: "HTML subject",
      text: "Fallback text",
      html,
    });

    assert.deepEqual(sender.sent, [
      {
        to: "recipient@example.com",
        subject: "HTML subject",
        text: "Fallback text",
        html,
      },
    ]);
  });

  it("preserves safe email layout attributes and inline styles", async () => {
    const sender = createMailSender();
    const service = new MailSendingService(sender);

    await service.send({
      to: "recipient@example.com",
      subject: "HTML subject",
      html:
        '<table width="600" cellpadding="0" style="width:600px;border-collapse:collapse">' +
        '<tr><td style="display:none;color:#123456">Preview</td></tr>' +
        '<tr><td><img src="https://example.com/logo.png" alt="Logo" width="120"></td></tr>' +
        "</table>",
    });

    assert.deepEqual(sender.sent, [
      {
        to: "recipient@example.com",
        subject: "HTML subject",
        text: "Preview",
        html:
          '<table width="600" cellpadding="0" style="width:600px;border-collapse:collapse">' +
          '<tr><td style="display:none;color:#123456">Preview</td></tr>' +
          '<tr><td><img src="https://example.com/logo.png" alt="Logo" width="120"></td></tr>' +
          "</table>",
      },
    ]);
  });

  it("preserves raw HTML attributes, URLs, and CSS", async () => {
    const sender = createMailSender();
    const service = new MailSendingService(sender);
    const html =
      '<a href="javascript:alert(1)" style="position:fixed;background-image:url(https://tracker.test/a)">Link</a>' +
      '<img src="javascript:alert(1)" onerror="alert(1)">';

    await service.send({
      to: "recipient@example.com",
      subject: "HTML subject",
      html,
    });

    assert.deepEqual(sender.sent, [
      {
        to: "recipient@example.com",
        subject: "HTML subject",
        text: "Link [javascript:alert(1)]",
        html,
      },
    ]);
  });

  it("rejects an invalid request before contacting SMTP", async () => {
    const sender = createMailSender();
    const service = new MailSendingService(sender);

    await assert.rejects(
      () => service.send({ to: "not-an-email", subject: "", text: "" }),
      BadRequestException,
    );

    assert.deepEqual(sender.sent, []);
  });

  it("propagates an SMTP failure", async () => {
    const sender = createMailSender(new Error("SMTP unavailable"));
    const service = new MailSendingService(sender);

    await assert.rejects(
      () =>
        service.send({
          to: "recipient@example.com",
          subject: "Test subject",
          text: "Test body",
        }),
      { message: "SMTP unavailable" },
    );
  });
});

function createMailSender(error?: Error): MailSender & {
  readonly sent: Array<{
    to: string;
    subject: string;
    text: string;
    html?: string;
    calendarInvite?: {
      readonly title: string;
      readonly startsAt: Date;
      readonly endsAt: Date;
      readonly location?: string;
      readonly description?: string;
    };
  }>;
} {
  const sent: Array<{
    to: string;
    subject: string;
    text: string;
    html?: string;
    calendarInvite?: {
      readonly title: string;
      readonly startsAt: Date;
      readonly endsAt: Date;
      readonly location?: string;
      readonly description?: string;
    };
  }> = [];

  return {
    sent,
    async send(message) {
      if (error) {
        throw error;
      }

      sent.push(message);
    },
  };
}
