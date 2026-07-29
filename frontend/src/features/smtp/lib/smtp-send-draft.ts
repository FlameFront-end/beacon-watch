import type { CalendarInviteRequest } from "@/shared/api/smtp";

export type SmtpSendDraft = {
  to: string;
  subject: string;
  text: string;
  isHtml: boolean;
  hasCalendarInvite: boolean;
  calendarTitle: string;
  calendarStartsAt: string;
  calendarEndsAt: string;
  calendarLocation: string;
  calendarDescription: string;
};

const MAX_CALENDAR_DURATION_MS = 24 * 60 * 60 * 1000;
const CALENDAR_PAST_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CALENDAR_TITLE_LENGTH = 120;
const MAX_CALENDAR_LOCATION_LENGTH = 160;
const MAX_CALENDAR_DESCRIPTION_LENGTH = 2_000;

export function createEmptySmtpSendDraft(): SmtpSendDraft {
  return {
    to: "",
    subject: "",
    text: "",
    isHtml: false,
    hasCalendarInvite: false,
    calendarTitle: "",
    calendarStartsAt: "",
    calendarEndsAt: "",
    calendarLocation: "",
    calendarDescription: "",
  };
}

export function normalizeSmtpSendDraft(value: unknown): SmtpSendDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createEmptySmtpSendDraft();
  }

  const draft = value as Record<string, unknown>;
  return {
    to: readString(draft.to),
    subject: readString(draft.subject),
    text: readString(draft.text),
    isHtml: readBoolean(draft.isHtml),
    hasCalendarInvite: readBoolean(draft.hasCalendarInvite),
    calendarTitle: readString(draft.calendarTitle),
    calendarStartsAt: readString(draft.calendarStartsAt),
    calendarEndsAt: readString(draft.calendarEndsAt),
    calendarLocation: readString(draft.calendarLocation),
    calendarDescription: readString(draft.calendarDescription),
  };
}

export function validateCalendarInviteDraft(draft: SmtpSendDraft): string | null {
  if (!draft.hasCalendarInvite) {
    return null;
  }

  const title = draft.calendarTitle.trim();
  const location = draft.calendarLocation.trim();
  const description = draft.calendarDescription.trim();
  const startsAt = parseLocalDateTime(draft.calendarStartsAt);
  const endsAt = parseLocalDateTime(draft.calendarEndsAt);

  if (!title) {
    return "Calendar invite title is required";
  }
  if (title.length > MAX_CALENDAR_TITLE_LENGTH) {
    return `Calendar invite title must be ${MAX_CALENDAR_TITLE_LENGTH} characters or fewer`;
  }
  if (location.length > MAX_CALENDAR_LOCATION_LENGTH) {
    return `Calendar invite location must be ${MAX_CALENDAR_LOCATION_LENGTH} characters or fewer`;
  }
  if (description.length > MAX_CALENDAR_DESCRIPTION_LENGTH) {
    return `Calendar invite description must be ${MAX_CALENDAR_DESCRIPTION_LENGTH} characters or fewer`;
  }
  if (!startsAt || !endsAt) {
    return "Calendar invite start and end dates are required";
  }
  if (endsAt.getTime() <= startsAt.getTime()) {
    return "Calendar invite end date must be after the start date";
  }
  if (endsAt.getTime() - startsAt.getTime() > MAX_CALENDAR_DURATION_MS) {
    return "Calendar invite duration must be 24 hours or shorter";
  }
  if (startsAt.getTime() < Date.now() - CALENDAR_PAST_WINDOW_MS) {
    return "Calendar invite start date is too far in the past";
  }

  return null;
}

export function buildCalendarInviteRequest(draft: SmtpSendDraft): CalendarInviteRequest | undefined {
  if (!draft.hasCalendarInvite) {
    return undefined;
  }

  const startsAt = parseLocalDateTime(draft.calendarStartsAt);
  const endsAt = parseLocalDateTime(draft.calendarEndsAt);
  if (!startsAt || !endsAt) {
    return undefined;
  }

  return {
    title: draft.calendarTitle.trim(),
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    ...(draft.calendarLocation.trim() ? { location: draft.calendarLocation.trim() } : {}),
    ...(draft.calendarDescription.trim() ? { description: draft.calendarDescription.trim() } : {}),
  };
}

function parseLocalDateTime(value: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readBoolean(value: unknown): boolean {
  return value === true;
}
