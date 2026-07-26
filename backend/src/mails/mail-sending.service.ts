import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { convert } from "html-to-text";
import sanitizeHtml from "sanitize-html";

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
  const requestedHtml = readTrimmedString(value.html);
  const html = requestedHtml ? sanitizeMailHtml(requestedHtml) : "";
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

function sanitizeMailHtml(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [
      "a",
      "b",
      "blockquote",
      "body",
      "br",
      "div",
      "em",
      "h1",
      "h2",
      "h3",
      "html",
      "i",
      "img",
      "li",
      "ol",
      "p",
      "span",
      "strong",
      "table",
      "tbody",
      "td",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
    ],
    allowedAttributes: {
      "*": ["dir", "lang", "style", "title"],
      a: ["href", "rel", "target"],
      img: ["alt", "height", "src", "width"],
      table: ["align", "border", "cellpadding", "cellspacing", "height", "width"],
      td: ["align", "bgcolor", "colspan", "height", "rowspan", "valign", "width"],
      th: ["align", "bgcolor", "colspan", "height", "rowspan", "valign", "width"],
    },
    allowedSchemes: ["cid", "http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
    allowedStyles: {
      "*": {
        "background-color": [CSS_COLOR],
        "border": [CSS_BORDER],
        "border-bottom": [CSS_BORDER],
        "border-collapse": [/^(?:collapse|separate)$/],
        "border-left": [CSS_BORDER],
        "border-radius": [CSS_SPACING],
        "border-right": [CSS_BORDER],
        "border-top": [CSS_BORDER],
        "color": [CSS_COLOR],
        "display": [
          /^(?:none|block|inline|inline-block|table|table-row|table-cell)$/,
        ],
        "font-family": [/^[a-z0-9 ,'".-]+$/i],
        "font-size": [CSS_SPACING],
        "font-style": [/^(?:normal|italic|oblique)$/],
        "font-weight": [/^(?:normal|bold|bolder|lighter|[1-9]00)$/],
        "height": [CSS_SPACING],
        "line-height": [CSS_SPACING],
        "margin": [CSS_SPACING_LIST],
        "margin-bottom": [CSS_SPACING],
        "margin-left": [CSS_SPACING],
        "margin-right": [CSS_SPACING],
        "margin-top": [CSS_SPACING],
        "max-height": [CSS_SPACING],
        "max-width": [CSS_SPACING],
        "min-height": [CSS_SPACING],
        "min-width": [CSS_SPACING],
        "overflow": [/^(?:hidden|visible)$/],
        "padding": [CSS_SPACING_LIST],
        "padding-bottom": [CSS_SPACING],
        "padding-left": [CSS_SPACING],
        "padding-right": [CSS_SPACING],
        "padding-top": [CSS_SPACING],
        "text-align": [/^(?:left|right|center|justify)$/],
        "text-decoration": [/^(?:none|underline|line-through)$/],
        "vertical-align": [/^(?:baseline|bottom|middle|sub|super|text-bottom|text-top|top)$/],
        "white-space": [/^(?:normal|nowrap|pre|pre-line|pre-wrap)$/],
        "width": [CSS_SPACING],
      },
    },
  });
}

const CSS_COLOR =
  /^(?:#[0-9a-f]{3,8}|[a-z]+|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/i;
const CSS_SPACING = /^(?:auto|0|\d+(?:\.\d+)?(?:px|pt|em|rem|%))$/;
const CSS_SPACING_LIST =
  /^(?:(?:auto|0|\d+(?:\.\d+)?(?:px|pt|em|rem|%))(?:\s+|$)){1,4}$/;
const CSS_BORDER =
  /^(?:0|(?:\d+(?:\.\d+)?(?:px|pt))\s+(?:dashed|dotted|double|solid)\s+(?:#[0-9a-f]{3,8}|[a-z]+))$/i;

function convertMailHtmlToText(html: string): string {
  return convert(html, {
    selectors: [{ selector: "img", format: "skip" }],
    wordwrap: false,
  }).trim();
}
