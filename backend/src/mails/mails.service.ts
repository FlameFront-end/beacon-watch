import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";

import type { AcceptMailsResponse, MailDto } from "./dto/mail.dto.js";
import { MailEntity } from "./mail.entity.js";

@Injectable()
export class MailsService {
  constructor(
    @InjectRepository(MailEntity)
    private readonly mailRepository: Pick<
      Repository<MailEntity>,
      "findOne" | "create" | "save"
    >,
  ) {}

  async acceptMany(payload: unknown): Promise<AcceptMailsResponse> {
    if (!Array.isArray(payload)) {
      throw new BadRequestException("Mail payload must be a JSON array");
    }

    for (const mail of payload) {
      this.assertMail(mail);
    }

    let accepted = 0;
    let skipped = 0;

    for (const mail of payload) {
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
