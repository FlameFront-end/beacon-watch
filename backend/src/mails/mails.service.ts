import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";

import type {
  AcceptMailsResponse,
  ListMailsQuery,
  MailDto,
  StoredMailDto,
} from "./dto/mail.dto.js";
import { MailEntity } from "./mail.entity.js";
import type { ServiceKey } from "../services/service-catalog.js";

const DEFAULT_MAIL_LIST_LIMIT = 200;
const MAX_MAIL_LIST_LIMIT = 500;
const MAIL_LIST_SELECT = {
  id: true,
  receivedAt: true,
  externalId: true,
  changeKey: true,
  subject: true,
  sender: true,
  senderEmail: true,
  mailDate: true,
  hasAttachments: true,
  isRead: true,
  size: true,
  body: true,
} satisfies Record<keyof StoredMailDto, true>;

type AcceptedMail = MailDto & {
  readonly raw: Record<string, unknown>;
};

@Injectable()
export class MailsService {
  constructor(
    @InjectRepository(MailEntity)
    private readonly mailRepository: Pick<
      Repository<MailEntity>,
      "find" | "findOne" | "create" | "save" | "delete"
    >,
  ) {}

  async findAll(
    serviceKey: ServiceKey,
    query: ListMailsQuery = {},
  ): Promise<StoredMailDto[]> {
    const limit = normalizeLimit(query.limit);
    const offset = normalizeOffset(query.offset);
    const mails = await this.mailRepository.find({
      where: { serviceKey },
      order: { receivedAt: "DESC" },
      select: MAIL_LIST_SELECT,
      skip: offset,
      take: limit,
    });

    return mails.map(mapStoredMail);
  }

  async acceptMany(
    serviceKey: ServiceKey,
    payload: unknown,
  ): Promise<AcceptMailsResponse> {
    const mailPayload = parseMailPayload(payload);

    if (!Array.isArray(mailPayload)) {
      throw new BadRequestException("Mail payload must be a JSON array");
    }

    const mails = mailPayload.map(normalizeMail);

    let accepted = 0;
    let skipped = 0;

    for (const mail of mails) {
      const existingMail = await this.mailRepository.findOne({
        where: { serviceKey, externalId: mail.id },
      });
      if (existingMail) {
        skipped += 1;
        continue;
      }

      const mailEntity = this.mailRepository.create({
        ...this.mapMail(mail),
        serviceKey,
      });
      try {
        await this.mailRepository.save(mailEntity);
        accepted += 1;
      } catch (error: unknown) {
        if (isUniqueConstraintError(error)) {
          skipped += 1;
          continue;
        }

        throw error;
      }
    }

    return { accepted, skipped };
  }

  async deleteOne(serviceKey: ServiceKey, id: string): Promise<void> {
    await this.mailRepository.delete({ serviceKey, id });
  }

  async deleteAll(serviceKey: ServiceKey): Promise<void> {
    await this.mailRepository.delete({ serviceKey });
  }

  private mapMail(mail: AcceptedMail): Partial<MailEntity> {
    return {
      externalId: mail.id,
      changeKey: mail.changeKey,
      subject: mail.subject,
      sender: mail.from,
      senderEmail: mail.fromEmail,
      mailDate: new Date(mail.date),
      hasAttachments: mail.hasAttachments,
      isRead: mail.isRead,
      size: mail.size,
      body: mail.body,
      raw: mail.raw,
    };
  }
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function normalizeMail(payload: unknown): AcceptedMail {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new BadRequestException("Each mail item must be a JSON object");
  }

  const mail = payload as Record<string, unknown>;
  if (isOwaMail(mail)) {
    return { ...mail, raw: mail };
  }

  if (isZimbraMail(mail)) {
    return normalizeZimbraMail(mail);
  }

  throw new BadRequestException("Mail item has invalid shape");
}

function isOwaMail(mail: Record<string, unknown>): mail is MailDto {
  return (
    isString(mail.id) &&
    isString(mail.changeKey) &&
    isString(mail.subject) &&
    isString(mail.from) &&
    isString(mail.fromEmail) &&
    isValidDateString(mail.date) &&
    typeof mail.hasAttachments === "boolean" &&
    typeof mail.isRead === "boolean" &&
    isValidSize(mail.size) &&
    isString(mail.body)
  );
}

function isZimbraMail(mail: Record<string, unknown>): boolean {
  return (
    isString(mail.id) &&
    isString(mail.sender) &&
    isString(mail.date) &&
    parseZimbraDate(mail.date) !== null &&
    isValidSize(mail.size)
  );
}

function normalizeZimbraMail(mail: Record<string, unknown>): AcceptedMail {
  const mailDate = parseZimbraDate(mail.date);
  if (!mailDate || !isString(mail.id) || !isString(mail.sender) || !isValidSize(mail.size)) {
    throw new BadRequestException("Mail item has invalid shape");
  }

  return {
    id: mail.id,
    changeKey: readOptionalString(mail.conversationId) ?? mail.id,
    subject: readOptionalString(mail.subject) ?? "",
    from: readOptionalString(mail.senderName) ?? mail.sender,
    fromEmail: mail.sender,
    date: mailDate.toISOString(),
    hasAttachments: hasZimbraAttachments(mail.mimeParts),
    isRead: !readOptionalString(mail.flags)?.includes("u"),
    size: mail.size,
    body: readZimbraBody(mail),
    raw: mail,
  };
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readZimbraBody(mail: Record<string, unknown>): string {
  const parts = Array.isArray(mail.mimeParts) ? mail.mimeParts : [];
  const bodyPart = parts.find((part) => {
    if (!part || typeof part !== "object" || Array.isArray(part)) {
      return false;
    }

    const mimePart = part as Record<string, unknown>;
    return mimePart.body === true && typeof mimePart.content === "string";
  });

  if (bodyPart && typeof bodyPart === "object" && !Array.isArray(bodyPart)) {
    const content = (bodyPart as Record<string, unknown>).content;
    if (typeof content === "string") {
      return content;
    }
  }

  const textPart = parts.find((part) => {
    if (!part || typeof part !== "object" || Array.isArray(part)) {
      return false;
    }

    const mimePart = part as Record<string, unknown>;
    return mimePart.contentType === "text/plain" && typeof mimePart.content === "string";
  });

  if (textPart && typeof textPart === "object" && !Array.isArray(textPart)) {
    const content = (textPart as Record<string, unknown>).content;
    if (typeof content === "string") {
      return content;
    }
  }

  return readOptionalString(mail.snippet) ?? "";
}

function hasZimbraAttachments(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.some((part) => {
    if (!part || typeof part !== "object" || Array.isArray(part)) {
      return false;
    }

    const mimePart = part as Record<string, unknown>;
    return (
      readOptionalString(mimePart.filename) !== null ||
      mimePart.disposition === "attachment"
    );
  });
}

function parseZimbraDate(value: unknown): Date | null {
  if (!isString(value)) {
    return null;
  }

  const match = value.match(
    /^(\d{2})\.(\d{2})\.(\d{4}),\s*(\d{2}):(\d{2}):(\d{2})$/,
  );
  if (!match) {
    return null;
  }

  const [, day, month, year, hour, minute, second] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`);

  return Number.isFinite(date.getTime()) ? date : null;
}

function parseMailPayload(payload: unknown): unknown {
  if (typeof payload !== "string") {
    return payload;
  }

  try {
    return JSON.parse(payload) as unknown;
  } catch {
    throw new BadRequestException("Mail payload must be a JSON array");
  }
}

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isValidSize(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function normalizeLimit(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    return DEFAULT_MAIL_LIST_LIMIT;
  }

  return Math.min(value, MAX_MAIL_LIST_LIMIT);
}

function normalizeOffset(value: number | undefined): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : 0;
}

function mapStoredMail(mail: MailEntity): StoredMailDto {
  return {
    id: mail.id,
    receivedAt: mail.receivedAt,
    externalId: mail.externalId,
    changeKey: mail.changeKey,
    subject: mail.subject,
    sender: mail.sender,
    senderEmail: mail.senderEmail,
    mailDate: mail.mailDate,
    hasAttachments: mail.hasAttachments,
    isRead: mail.isRead,
    size: mail.size,
    body: mail.body,
  };
}
