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

    const result = await service.acceptMany("owa", [createMailPayload()]);

    assert.deepEqual(result, { accepted: 1, skipped: 0 });
    assert.equal(repository.saved.length, 1);
    assert.equal(repository.saved[0]?.serviceKey, "owa");
  });

  it("saves a text/plain JSON mail array", async () => {
    const repository = createMailRepository();
    const service = new MailsService(repository);

    const result = await service.acceptMany("owa", JSON.stringify([createMailPayload()]));

    assert.deepEqual(result, { accepted: 1, skipped: 0 });
    assert.equal(repository.saved.length, 1);
  });

  it("saves a normalized Zimbra mail array", async () => {
    const repository = createMailRepository();
    const service = new MailsService(repository);
    const zimbraMail = createZimbraMailPayload();

    const result = await service.acceptMany("zimbra", [zimbraMail]);

    assert.deepEqual(result, { accepted: 1, skipped: 0 });
    assert.deepEqual(repository.saved[0], {
      serviceKey: "zimbra",
      externalId: "271",
      changeKey: "-271",
      subject: "CVE-2025-27915 ICS safe alert test",
      sender: "user2",
      senderEmail: "user2@zimbra.lab",
      mailDate: new Date("2026-07-26T22:18:50.000Z"),
      hasAttachments: true,
      isRead: true,
      size: 17240,
      body: "CVE-2025-27915 ICS safe alert test\r\n",
      raw: zimbraMail,
    });
  });

  it("skips mails that already exist by external id", async () => {
    const repository = createMailRepository(["mail-id"]);
    const service = new MailsService(repository);

    const result = await service.acceptMany("owa", [createMailPayload({ id: "mail-id" })]);

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

    const result = await service.findAll("owa");

    assert.deepEqual(repository.findOptions, {
      where: { serviceKey: "owa" },
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

    await service.findAll("owa", { limit: 1_000, offset: 20 });

    assert.deepEqual(repository.findOptions, {
      where: { serviceKey: "owa" },
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

    await service.deleteOne("owa", "mail-row-1");

    assert.deepEqual(repository.deleteCriteria, [
      { serviceKey: "owa", id: "mail-row-1" },
    ]);
  });

  it("deletes all stored mails", async () => {
    const repository = createMailRepository();
    const service = new MailsService(repository);

    await service.deleteAll("owa");

    assert.deepEqual(repository.deleteCriteria, [{ serviceKey: "owa" }]);
  });

  it("rejects non-array payloads", async () => {
    const service = new MailsService(createMailRepository());

    await assert.rejects(
      () => service.acceptMany("owa", { id: "mail-id" }),
      BadRequestException,
    );
  });

  it("rejects mail items with invalid shape", async () => {
    const service = new MailsService(createMailRepository());

    await assert.rejects(
      () => service.acceptMany("owa", [{ id: "mail-id", size: "7583" }]),
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

function createZimbraMailPayload() {
  return {
    id: "271",
    conversationId: "-271",
    subject: "CVE-2025-27915 ICS safe alert test",
    sender: "user2@zimbra.lab",
    senderName: "user2",
    recipients: ["test@zimbra.lab"],
    date: "27.07.2026, 01:18:50",
    folderId: "2",
    size: 17240,
    flags: "v",
    snippet: "CVE-2025-27915 ICS safe alert test",
    mimeParts: [
      {
        part: "1",
        contentType: "text/plain",
        filename: null,
        size: 36,
        disposition: null,
        body: true,
        content: "CVE-2025-27915 ICS safe alert test\r\n",
      },
      {
        part: "2",
        contentType: "text/calendar",
        filename: "cve-2025-27915-ics-safe-alert.ics",
        size: 16286,
        disposition: "inline",
        body: false,
        content: null,
      },
    ],
    calendarInvites: [],
  };
}

function createMailRepository(
  existingExternalIds: string[] = [],
  foundMails: MailEntity[] = [],
) {
  const existing = new Set(existingExternalIds);
  const saved: Partial<MailEntity>[] = [];
  const deleteCriteria: unknown[] = [];
  let findOptions: unknown = null;

  return {
    saved,
    deleteCriteria,
    get findOptions() {
      return findOptions;
    },
    find: async (options: unknown) => {
      findOptions = options;
      return foundMails;
    },
    findOne: async ({
      where,
    }: {
      where: { serviceKey: string; externalId: string };
    }) =>
      where.serviceKey === "owa" && existing.has(where.externalId)
        ? ({ serviceKey: where.serviceKey, externalId: where.externalId } as MailEntity)
        : null,
    create: (mail: Partial<MailEntity>) => mail as MailEntity,
    save: async (mail: MailEntity) => {
      saved.push(mail);
      existing.add(mail.externalId);
      return mail;
    },
    delete: async (criteria: unknown) => {
      deleteCriteria.push(criteria);
      return { raw: [], affected: 1 };
    },
  } as Pick<
    Repository<MailEntity>,
    "find" | "findOne" | "create" | "save" | "delete"
  > & {
    saved: Partial<MailEntity>[];
    deleteCriteria: unknown[];
    readonly findOptions: unknown;
  };
}

function createMailEntity(overrides: Partial<MailEntity> = {}): MailEntity {
  return {
    id: "mail-row",
    serviceKey: "owa",
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
