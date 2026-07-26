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

  it("passes safe HTML to the mail sender", async () => {
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

  it("sanitizes executable HTML before sending", async () => {
    const sender = createMailSender();
    const service = new MailSendingService(sender);

    await service.send({
      to: "recipient@example.com",
      subject: "HTML subject",
      text: "Fallback text",
      html: "<p onclick=\"alert(1)\">Hello</p>",
    });

    assert.deepEqual(sender.sent, [
      {
        to: "recipient@example.com",
        subject: "HTML subject",
        text: "Fallback text",
        html: "<p>Hello</p>",
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
          '<tr><td><img src="https://example.com/logo.png" alt="Logo" width="120" /></td></tr>' +
          "</table>",
      },
    ]);
  });

  it("removes dangerous HTML attributes, URLs, and CSS", async () => {
    const sender = createMailSender();
    const service = new MailSendingService(sender);

    await service.send({
      to: "recipient@example.com",
      subject: "HTML subject",
      html:
        '<a href="javascript:alert(1)" style="position:fixed;background-image:url(https://tracker.test/a)">Link</a>' +
        '<img src="javascript:alert(1)" onerror="alert(1)">',
    });

    assert.deepEqual(sender.sent, [
      {
        to: "recipient@example.com",
        subject: "HTML subject",
        text: "Link",
        html: "<a>Link</a><img />",
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
  }>;
} {
  const sent: Array<{
    to: string;
    subject: string;
    text: string;
    html?: string;
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
