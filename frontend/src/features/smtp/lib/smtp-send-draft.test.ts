import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildCalendarInviteRequest,
  createEmptySmtpSendDraft,
  normalizeSmtpSendDraft,
  validateCalendarInviteDraft,
} from "./smtp-send-draft";

describe("SMTP send draft calendar validation", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects a calendar invite ending before it starts", () => {
    const draft = createEmptySmtpSendDraft();
    draft.hasCalendarInvite = true;
    draft.calendarTitle = "Project sync";
    draft.calendarStartsAt = "2026-08-01T10:30";
    draft.calendarEndsAt = "2026-08-01T10:00";

    expect(validateCalendarInviteDraft(draft)).toBe("Calendar invite end date must be after the start date");
  });

  it("rejects calendar invites longer than 24 hours", () => {
    const draft = createEmptySmtpSendDraft();
    draft.hasCalendarInvite = true;
    draft.calendarTitle = "Project sync";
    draft.calendarStartsAt = "2026-08-01T10:00";
    draft.calendarEndsAt = "2026-08-02T10:01";

    expect(validateCalendarInviteDraft(draft)).toBe("Calendar invite duration must be 24 hours or shorter");
  });

  it("rejects calendar invites older than the allowed retention window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T12:00:00.000Z"));
    const draft = createEmptySmtpSendDraft();
    draft.hasCalendarInvite = true;
    draft.calendarTitle = "Project sync";
    draft.calendarStartsAt = "2020-08-01T10:00";
    draft.calendarEndsAt = "2020-08-01T10:30";

    expect(validateCalendarInviteDraft(draft)).toBe("Calendar invite start date is too far in the past");
  });

  it("builds a trimmed calendar invite request", () => {
    const draft = createEmptySmtpSendDraft();
    draft.hasCalendarInvite = true;
    draft.calendarTitle = " Project sync ";
    draft.calendarStartsAt = "2026-08-01T10:00";
    draft.calendarEndsAt = "2026-08-01T10:30";
    draft.calendarLocation = " Online ";
    draft.calendarDescription = " Agenda ";

    expect(buildCalendarInviteRequest(draft)).toEqual({
      title: "Project sync",
      startsAt: new Date("2026-08-01T10:00").toISOString(),
      endsAt: new Date("2026-08-01T10:30").toISOString(),
      location: "Online",
      description: "Agenda",
    });
  });
});

describe("SMTP send draft persistence", () => {
  it("normalizes unknown stored values into a safe draft", () => {
    expect(normalizeSmtpSendDraft({ to: "test@example.com", isHtml: true })).toEqual({
      ...createEmptySmtpSendDraft(),
      to: "test@example.com",
      isHtml: true,
    });
  });
});
