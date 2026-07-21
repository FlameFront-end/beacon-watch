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

  it("saves a text/plain JSON mail array", async () => {
    const repository = createMailRepository();
    const service = new MailsService(repository);

    const result = await service.acceptMany(JSON.stringify([createMailPayload()]));

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

  it("returns stored mails ordered by newest intake first", async () => {
    const repository = createMailRepository([], [
      createMailEntity({
        id: "mail-row-1",
        externalId: "external-mail-1",
        receivedAt: new Date("2026-07-18T07:00:00.000Z"),
      }),
    ]);
    const service = new MailsService(repository);

    const result = await service.findAll();

    assert.deepEqual(repository.findOptions, {
      order: { receivedAt: "DESC" },
      select: {
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
      },
      skip: 0,
      take: 200,
    });
    assert.deepEqual(result, [
      {
        id: "mail-row-1",
        receivedAt: new Date("2026-07-18T07:00:00.000Z"),
        externalId: "external-mail-1",
        changeKey: "change-key",
        subject: "Test subject",
        sender: "attacker@cvelab.local",
        senderEmail: "attacker@cvelab.local",
        mailDate: new Date("2026-07-18T02:00:30.000Z"),
        hasAttachments: false,
        isRead: true,
        size: 7583,
        body: "Mail body",
      },
    ]);
  });

  it("caps stored mail list queries", async () => {
    const repository = createMailRepository();
    const service = new MailsService(repository);

    await service.findAll({ limit: 1_000, offset: 20 });

    assert.deepEqual(repository.findOptions, {
      order: { receivedAt: "DESC" },
      select: {
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
      },
      skip: 20,
      take: 500,
    });
  });

  it("deletes one stored mail by id", async () => {
    const repository = createMailRepository();
    const service = new MailsService(repository);

    await service.deleteOne("mail-row-1");

    assert.deepEqual(repository.deletedIds, ["mail-row-1"]);
  });

  it("deletes all stored mails", async () => {
    const repository = createMailRepository();
    const service = new MailsService(repository);

    await service.deleteAll();

    assert.equal(repository.clearCalls, 1);
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

function createMailRepository(
  existingExternalIds: string[] = [],
  foundMails: MailEntity[] = [],
) {
  const existing = new Set(existingExternalIds);
  const saved: Partial<MailEntity>[] = [];
  const deletedIds: string[] = [];
  let findOptions: unknown = null;
  let clearCalls = 0;

  return {
    saved,
    deletedIds,
    get findOptions() {
      return findOptions;
    },
    get clearCalls() {
      return clearCalls;
    },
    find: async (options: unknown) => {
      findOptions = options;
      return foundMails;
    },
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
    delete: async ({ id }: { id: string }) => {
      deletedIds.push(id);
      return { raw: [], affected: 1 };
    },
    clear: async () => {
      clearCalls += 1;
    },
  } as Pick<
    Repository<MailEntity>,
    "find" | "findOne" | "create" | "save" | "delete" | "clear"
  > & {
    saved: Partial<MailEntity>[];
    deletedIds: string[];
    readonly findOptions: unknown;
    readonly clearCalls: number;
  };
}

function createMailEntity(overrides: Partial<MailEntity> = {}): MailEntity {
  return {
    id: "mail-row",
    receivedAt: new Date("2026-07-18T07:00:00.000Z"),
    externalId: "external-mail",
    changeKey: "change-key",
    subject: "Test subject",
    sender: "attacker@cvelab.local",
    senderEmail: "attacker@cvelab.local",
    mailDate: new Date("2026-07-18T02:00:30.000Z"),
    hasAttachments: false,
    isRead: true,
    size: 7583,
    body: "Mail body",
    raw: createMailPayload(),
    ...overrides,
  };
}
