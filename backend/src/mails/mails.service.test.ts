import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { BadRequestException } from "@nestjs/common";
import type { Repository } from "typeorm";

import type { MailEntity } from "./mail.entity.js";
import { MailsService } from "./mails.service.js";

describe("MailsService", () => {
  it("saves a new mail array and returns accepted count", async () => {
    const repository = createMailRepository();
    const service = new MailsService(repository);

    const result = await service.acceptMany([createMailPayload()]);

    assert.deepEqual(result, { accepted: 1, skipped: 0 });
    assert.equal(repository.saved.length, 1);
  });

  it("skips mails that already exist by external id", async () => {
    const repository = createMailRepository(["mail-id"]);
    const service = new MailsService(repository);

    const result = await service.acceptMany([createMailPayload({ id: "mail-id" })]);

    assert.deepEqual(result, { accepted: 0, skipped: 1 });
    assert.equal(repository.saved.length, 0);
  });

  it("rejects non-array payloads", async () => {
    const service = new MailsService(createMailRepository());

    await assert.rejects(
      () => service.acceptMany({ id: "mail-id" }),
      BadRequestException,
    );
  });

  it("rejects mail items with invalid shape", async () => {
    const service = new MailsService(createMailRepository());

    await assert.rejects(
      () => service.acceptMany([{ id: "mail-id", size: "7583" }]),
      BadRequestException,
    );
  });
});

function createMailPayload(
  overrides: Partial<{
    id: string;
    changeKey: string;
    subject: string;
    from: string;
    fromEmail: string;
    date: string;
    hasAttachments: boolean;
    isRead: boolean;
    size: number;
    body: string;
  }> = {},
) {
  return {
    id: "AAMkADRhZjE0NDFmLWUxZWUtNGU5Ny04NWExLWI5MzVlMDJmMmY2YQ==",
    changeKey: "CQAAABYAAADO0jW5al5XTZW/KuAeM9WsAAAQXn6X",
    subject: "Test subject",
    from: "attacker@cvelab.local",
    fromEmail: "attacker@cvelab.local",
    date: "2026-07-18T05:00:30+03:00",
    hasAttachments: false,
    isRead: true,
    size: 7583,
    body: "Mail body",
    ...overrides,
  };
}

function createMailRepository(existingExternalIds: string[] = []) {
  const existing = new Set(existingExternalIds);
  const saved: Partial<MailEntity>[] = [];

  return {
    saved,
    findOne: async ({ where }: { where: { externalId: string } }) =>
      existing.has(where.externalId)
        ? ({ externalId: where.externalId } as MailEntity)
        : null,
    create: (mail: Partial<MailEntity>) => mail as MailEntity,
    save: async (mail: MailEntity) => {
      saved.push(mail);
      existing.add(mail.externalId);
      return mail;
    },
  } as Pick<Repository<MailEntity>, "findOne" | "create" | "save"> & {
    saved: Partial<MailEntity>[];
  };
}
