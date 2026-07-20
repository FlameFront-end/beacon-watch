import { useCallback, useEffect, useMemo, useState } from "react";

import { getMails, MAIL_PAGE_LIMIT } from "@/shared/api/mails";
import type { Mail, MailFilter } from "@/shared/model/mail";

const DEFAULT_FILTER: MailFilter = "all";
type LoadMode = "replace" | "append";

export function useMailsDashboard() {
  const [mails, setMails] = useState<Mail[]>([]);
  const [filter, setFilter] = useState<MailFilter>(DEFAULT_FILTER);
  const [query, setQuery] = useState("");
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMails, setHasMoreMails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMailsPage = useCallback(
    async (
      offset: number,
      mode: LoadMode,
      isCurrent: () => boolean = () => true,
    ): Promise<void> => {
      if (mode === "append") {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const loadedMails = await getMails({ limit: MAIL_PAGE_LIMIT, offset });
        if (!isCurrent()) {
          return;
        }

        setMails((currentMails) =>
          mode === "append" ? mergeMails(currentMails, loadedMails) : loadedMails,
        );
        setSelectedMailId((currentMailId) => currentMailId ?? loadedMails[0]?.id ?? null);
        setHasMoreMails(loadedMails.length === MAIL_PAGE_LIMIT);
        setError(null);
      } catch (loadError: unknown) {
        if (!isCurrent()) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load mails");
      } finally {
        if (!isCurrent()) {
          return;
        }

        if (mode === "append") {
          setIsLoadingMore(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    void loadMailsPage(0, "replace", () => isMounted);

    return () => {
      isMounted = false;
    };
  }, [loadMailsPage]);

  const loadMoreMails = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMoreMails) {
      return;
    }

    void loadMailsPage(mails.length, "append");
  }, [hasMoreMails, isLoading, isLoadingMore, loadMailsPage, mails.length]);

  const visibleMails = useMemo(
    () => filterMails(mails, filter, query),
    [mails, filter, query],
  );

  const selectedMail = useMemo(() => {
    const visibleSelectedMail = visibleMails.find((mail) => mail.id === selectedMailId);
    return visibleSelectedMail ?? visibleMails[0] ?? null;
  }, [selectedMailId, visibleMails]);

  const counts = useMemo(() => {
    const senderEmails = new Set(mails.map((mail) => mail.senderEmail));

    return {
      total: mails.length,
      unread: mails.filter((mail) => !mail.isRead).length,
      attachments: mails.filter((mail) => mail.hasAttachments).length,
      senders: senderEmails.size,
    };
  }, [mails]);

  return {
    mails,
    visibleMails,
    selectedMail,
    selectedMailId: selectedMail?.id ?? selectedMailId,
    setSelectedMailId,
    filter,
    setFilter,
    query,
    setQuery,
    isLoading,
    isLoadingMore,
    hasMoreMails,
    loadMoreMails,
    error,
    counts,
  };
}

function mergeMails(currentMails: readonly Mail[], loadedMails: readonly Mail[]): Mail[] {
  const seenMailIds = new Set(currentMails.map((mail) => mail.id));
  const nextMails = [...currentMails];

  for (const mail of loadedMails) {
    if (seenMailIds.has(mail.id)) {
      continue;
    }

    seenMailIds.add(mail.id);
    nextMails.push(mail);
  }

  return nextMails;
}

function filterMails(
  mails: readonly Mail[],
  filter: MailFilter,
  query: string,
): Mail[] {
  const normalizedQuery = query.trim().toLowerCase();

  return mails.filter((mail) => {
    if (filter === "unread" && mail.isRead) {
      return false;
    }

    if (filter === "read" && !mail.isRead) {
      return false;
    }

    if (filter === "attachments" && !mail.hasAttachments) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      mail.subject,
      mail.sender,
      mail.senderEmail,
      mail.body,
      mail.externalId,
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  });
}
