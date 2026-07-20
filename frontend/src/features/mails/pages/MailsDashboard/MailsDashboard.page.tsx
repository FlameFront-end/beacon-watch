import type { JSX } from "react";
import { ChevronsDown, MailOpen, Paperclip, Search } from "lucide-react";
import clsx from "clsx";

import { Badge, Button, EmptyState, Panel, Tabs, type TabItem } from "@/shared/kit";
import type { Mail, MailFilter } from "@/shared/model/mail";
import { formatLocalDateTime } from "@/shared/lib/format";

import { useMailsDashboard } from "../../hooks/use-mails-dashboard";
import styles from "./MailsDashboard.module.scss";

const FILTER_ITEMS: readonly TabItem<MailFilter>[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" },
  { id: "attachments", label: "Attachments" },
];

export function MailsDashboardPage(): JSX.Element {
  const dashboard = useMailsDashboard();

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h1>Mails</h1>
          <p>Captured mailbox messages, senders, read state, attachments, and message bodies.</p>
        </div>

        <div className={styles.heroStatus}>
          <small>Loaded</small>
          <span>{dashboard.counts.total}</span>
        </div>
      </section>

      <div className={styles.statsGrid}>
        <StatCard label="Loaded" value={dashboard.counts.total} tone="neutral" />
        <StatCard label="Unread" value={dashboard.counts.unread} tone="warning" />
        <StatCard label="Attachments" value={dashboard.counts.attachments} tone="success" />
        <StatCard label="Senders" value={dashboard.counts.senders} tone="neutral" />
      </div>

      <Panel className={styles.controlPanel}>
        <Tabs
          ariaLabel="Mail filters"
          items={FILTER_ITEMS}
          value={dashboard.filter}
          onChange={dashboard.setFilter}
        />

        <label className={styles.searchField}>
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search subject, sender, body"
            value={dashboard.query}
            onChange={(event) => dashboard.setQuery(event.target.value)}
          />
        </label>
      </Panel>

      {dashboard.error ? (
        <Panel className={styles.errorPanel}>
          <strong>Failed to load mails</strong>
          <p>{dashboard.error}</p>
        </Panel>
      ) : null}

      <MailWorkspace
        mails={dashboard.visibleMails}
        selectedMail={dashboard.selectedMail}
        selectedMailId={dashboard.selectedMailId}
        isLoading={dashboard.isLoading}
        onSelect={dashboard.setSelectedMailId}
      />

      {dashboard.hasMoreMails ? (
        <div className={styles.paginationBar}>
          <Button
            variant="secondary"
            isLoading={dashboard.isLoadingMore}
            leftIcon={<ChevronsDown size={15} aria-hidden="true" />}
            onClick={dashboard.loadMoreMails}
          >
            Load more
          </Button>
          <span>Showing {dashboard.mails.length} newest messages</span>
        </div>
      ) : null}
    </div>
  );
}

type StatCardProps = {
  readonly label: string;
  readonly value: number;
  readonly tone: "neutral" | "success" | "warning" | "danger";
};

function StatCard({ label, value, tone }: StatCardProps): JSX.Element {
  return (
    <Panel className={styles.statCard}>
      <Badge tone={tone}>{label}</Badge>
      <strong>{value}</strong>
    </Panel>
  );
}

type MailWorkspaceProps = {
  readonly mails: Mail[];
  readonly selectedMail: Mail | null;
  readonly selectedMailId: string | null;
  readonly isLoading: boolean;
  readonly onSelect: (mailId: string) => void;
};

function MailWorkspace({
  mails,
  selectedMail,
  selectedMailId,
  isLoading,
  onSelect,
}: MailWorkspaceProps): JSX.Element {
  if (isLoading) {
    return (
      <EmptyState
        loading
        title="Loading mails"
        description="Fetching stored mailbox messages."
      />
    );
  }

  if (mails.length === 0) {
    return (
      <EmptyState
        title="No mails found"
        description="Waiting for mailbox payloads or a broader filter."
      />
    );
  }

  return (
    <div className={styles.workspace}>
      <Panel className={styles.mailList} aria-label="Stored mails">
        {mails.map((mail) => (
          <MailListItem
            key={mail.id}
            mail={mail}
            isActive={mail.id === selectedMailId}
            onSelect={onSelect}
          />
        ))}
      </Panel>

      {selectedMail ? <MailDetail mail={selectedMail} /> : null}
    </div>
  );
}

type MailListItemProps = {
  readonly mail: Mail;
  readonly isActive: boolean;
  readonly onSelect: (mailId: string) => void;
};

function MailListItem({
  mail,
  isActive,
  onSelect,
}: MailListItemProps): JSX.Element {
  return (
    <button
      type="button"
      className={clsx(styles.mailItem, isActive && styles.activeMailItem)}
      aria-pressed={isActive}
      onClick={() => onSelect(mail.id)}
    >
      <span className={styles.mailItemHeader}>
        <strong>{mail.subject || "(no subject)"}</strong>
        {mail.hasAttachments ? <Paperclip size={14} aria-label="Has attachments" /> : null}
      </span>
      <span className={styles.mailSender}>{mail.senderEmail}</span>
      <span className={styles.mailPreview}>{mail.body.trim() || "Empty body"}</span>
      <span className={styles.mailItemFooter}>
        <Badge tone={mail.isRead ? "neutral" : "warning"}>
          {mail.isRead ? "Read" : "Unread"}
        </Badge>
        <time dateTime={mail.mailDate}>{formatLocalDateTime(mail.mailDate)}</time>
      </span>
    </button>
  );
}

type MailDetailProps = {
  readonly mail: Mail;
};

function MailDetail({ mail }: MailDetailProps): JSX.Element {
  return (
    <Panel className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <div>
          <div className={styles.detailKicker}>
            <MailOpen size={15} />
            <span>{mail.senderEmail}</span>
          </div>
          <h2>{mail.subject || "(no subject)"}</h2>
        </div>
        <div className={styles.detailBadges}>
          <Badge tone={mail.isRead ? "neutral" : "warning"}>
            {mail.isRead ? "Read" : "Unread"}
          </Badge>
          {mail.hasAttachments ? <Badge tone="success">Attachment</Badge> : null}
        </div>
      </div>

      <dl className={styles.metaGrid}>
        <div>
          <dt>Sender</dt>
          <dd>{mail.sender}</dd>
        </div>
        <div>
          <dt>Mail date</dt>
          <dd>{formatLocalDateTime(mail.mailDate)}</dd>
        </div>
        <div>
          <dt>Captured</dt>
          <dd>{formatLocalDateTime(mail.receivedAt)}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{formatBytes(mail.size)}</dd>
        </div>
      </dl>

      <section className={styles.bodySection}>
        <h3>Body</h3>
        <pre>{mail.body || "(empty)"}</pre>
      </section>

      <section className={styles.identitySection}>
        <h3>Identifiers</h3>
        <div>
          <span>External ID</span>
          <code>{mail.externalId}</code>
        </div>
        <div>
          <span>Change key</span>
          <code>{mail.changeKey}</code>
        </div>
      </section>
    </Panel>
  );
}

function formatBytes(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    style: "unit",
    unit: "byte",
    unitDisplay: "short",
  }).format(value);
}
