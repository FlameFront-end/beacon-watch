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

@Injectable()
export class MailsService {
  constructor(
    @InjectRepository(MailEntity)
    private readonly mailRepository: Pick<
      Repository<MailEntity>,
      "find" | "findOne" | "create" | "save" | "delete" | "clear"
    >,
  ) {}

  async findAll(query: ListMailsQuery = {}): Promise<StoredMailDto[]> {
    const limit = normalizeLimit(query.limit);
    const offset = normalizeOffset(query.offset);
    const mails = await this.mailRepository.find({
      order: { receivedAt: "DESC" },
      select: MAIL_LIST_SELECT,
      skip: offset,
      take: limit,
    });

    return mails.map(mapStoredMail);
  }

  async acceptMany(payload: unknown): Promise<AcceptMailsResponse> {
    const mailPayload = parseMailPayload(payload);

    if (!Array.isArray(mailPayload)) {
      throw new BadRequestException("Mail payload must be a JSON array");
    }

    for (const mail of mailPayload) {
      this.assertMail(mail);
    }

    let accepted = 0;
    let skipped = 0;

    for (const mail of mailPayload) {
      const existingMail = await this.mailRepository.findOne({
        where: { externalId: mail.id },
      });
      if (existingMail) {
        skipped += 1;
        continue;
      }

      const mailEntity = this.mailRepository.create(this.mapMail(mail));
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

  async deleteOne(id: string): Promise<void> {
    await this.mailRepository.delete({ id });
  }

  async deleteAll(): Promise<void> {
    await this.mailRepository.clear();
  }

  private assertMail(payload: unknown): asserts payload is MailDto {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new BadRequestException("Each mail item must be a JSON object");
    }

    const mail = payload as Record<string, unknown>;
    if (
      !isString(mail.id) ||
      !isString(mail.changeKey) ||
      !isString(mail.subject) ||
      !isString(mail.from) ||
      !isString(mail.fromEmail) ||
      !isValidDateString(mail.date) ||
      typeof mail.hasAttachments !== "boolean" ||
      typeof mail.isRead !== "boolean" ||
      !isValidSize(mail.size) ||
      !isString(mail.body)
    ) {
      throw new BadRequestException("Mail item has invalid shape");
    }
  }

  private mapMail(mail: MailDto): Partial<MailEntity> {
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
      raw: mail as unknown as Record<string, unknown>,
    };
  }
}

function isString(value: unknown): value is string {
  return typeof value === "string";
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
