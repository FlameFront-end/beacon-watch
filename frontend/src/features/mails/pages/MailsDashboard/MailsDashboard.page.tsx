import { useEffect, useState, type FormEvent, type JSX } from "react";
import { ChevronsDown, MailOpen, Paperclip, Search, Trash2 } from "lucide-react";
import clsx from "clsx";

import { Badge, Button, EmptyState, Panel, Tabs, type TabItem } from "@/shared/kit";
import type { Mail, MailFilter } from "@/shared/model/mail";
import { formatLocalDateTime } from "@/shared/lib/format";
import {
  getSmtpSettings,
  sendMail,
  updateSmtpSettings,
  type SmtpSettings,
} from "@/shared/api/mails";

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

      <SendMailPanel />
      <SmtpSettingsPanel />

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
            name="mailSearch"
            type="search"
            placeholder="Search subject, sender, body"
            value={dashboard.query}
            onChange={(event) => dashboard.setQuery(event.target.value)}
          />
        </label>

        <Button
          variant="danger"
          isLoading={dashboard.isDeletingAll}
          leftIcon={<Trash2 size={15} aria-hidden="true" />}
          disabled={dashboard.mails.length === 0}
          onClick={() => {
            if (window.confirm("Delete all stored mails?")) {
              void dashboard.removeAllMails();
            }
          }}
        >
          Delete all
        </Button>
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
        deletingMailId={dashboard.deletingMailId}
        onSelect={dashboard.setSelectedMailId}
        onDelete={dashboard.removeMail}
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

function SmtpSettingsPanel(): JSX.Element {
  type TlsMode = "none" | "starttls" | "implicit";

  const [settings, setSettings] = useState<SmtpSettings | null>(null);
  const [host, setHost] = useState("");
  const [port, setPort] = useState("25");
  const [tlsMode, setTlsMode] = useState<TlsMode>("none");
  const [from, setFrom] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canReuseStoredPassword = Boolean(
    user && settings?.hasPassword && user === settings.user,
  );
  const isPasswordRequired = Boolean(user) && !canReuseStoredPassword;

  useEffect(() => {
    void getSmtpSettings()
      .then((currentSettings) => {
        setSettings(currentSettings);
        setHost(currentSettings.host);
        setPort(String(currentSettings.port));
        setTlsMode(toTlsMode(currentSettings));
        setFrom(currentSettings.from);
        setUser(currentSettings.user);
      })
      .catch(() => setError("Failed to load SMTP settings"))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);
    setError(null);

    try {
      const updated = await updateSmtpSettings({
        host,
        port: Number(port),
        secure: tlsMode === "implicit",
        requireTls: tlsMode === "starttls",
        from,
        user,
        password,
      });
      setSettings(updated);
      setHost(updated.host);
      setPort(String(updated.port));
      setTlsMode(toTlsMode(updated));
      setFrom(updated.from);
      setUser(updated.user);
      setPassword("");
      setStatus("SMTP settings saved");
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save SMTP settings");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Panel className={styles.sendPanel}>
      <div className={styles.panelHeading}>
        <div>
          <h2>SMTP settings</h2>
          <p>Password is write-only and is never returned to the browser.</p>
        </div>
      </div>
      {isLoading ? <p className={styles.settingsHint}>Loading settings...</p> : null}
      {!isLoading ? (
        <form className={styles.settingsForm} onSubmit={handleSubmit}>
          <label>
            <span>SMTP host</span>
            <input name="smtpHost" required value={host} onChange={(event) => setHost(event.target.value)} />
          </label>
          <label>
            <span>Port</span>
            <input name="smtpPort" required type="number" min="1" max="65535" value={port} onChange={(event) => setPort(event.target.value)} />
          </label>
          <label>
            <span>From</span>
            <input name="smtpFrom" required type="email" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label>
            <span>SMTP user</span>
            <input
              name="smtpUser"
              value={user}
              onChange={(event) => {
                const nextUser = event.target.value;
                setUser(nextUser);
                if (!nextUser) {
                  setPassword("");
                }
              }}
            />
          </label>
          <label>
            <span>
              New password{" "}
              {canReuseStoredPassword ? "(leave blank to keep)" : user ? "(required)" : ""}
            </span>
            <input
              name="smtpPassword"
              type="password"
              value={password}
              required={isPasswordRequired}
              disabled={!user}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            <span>Connection security</span>
            <select
              name="smtpTlsMode"
              value={tlsMode}
              onChange={(event) => setTlsMode(event.target.value as TlsMode)}
            >
              <option value="none">None (anonymous relay only)</option>
              <option value="starttls">STARTTLS required (usually port 587)</option>
              <option value="implicit">Implicit TLS (usually port 465)</option>
            </select>
          </label>
          <p className={styles.settingsHint}>
            Authentication requires STARTTLS or implicit TLS. Clearing the SMTP
            user also removes the stored password.
          </p>
          <div className={styles.sendActions}>
            <Button type="submit" isLoading={isSaving}>Save SMTP settings</Button>
            {status ? <span className={styles.successMessage}>{status}</span> : null}
            {error ? <span className={styles.formError}>{error}</span> : null}
          </div>
        </form>
      ) : null}
    </Panel>
  );
}

function toTlsMode(settings: SmtpSettings): "none" | "starttls" | "implicit" {
  if (settings.secure) {
    return "implicit";
  }

  return settings.requireTls ? "starttls" : "none";
}

function SendMailPanel(): JSX.Element {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [isHtml, setIsHtml] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSending(true);
    setStatus(null);
    setError(null);

    try {
      await sendMail(
        isHtml
          ? { to, subject, html: text }
          : { to, subject, text },
      );
      setStatus(`SMTP server accepted the message for ${to}`);
      setText("");
    } catch (sendError: unknown) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Panel className={styles.sendPanel}>
      <div className={styles.panelHeading}>
        <div>
          <h2>Send email</h2>
          <p>Send a plain-text or safely rendered HTML message through SMTP.</p>
        </div>
      </div>

      <form className={styles.sendForm} onSubmit={handleSubmit}>
        <label>
          <span>Recipient</span>
          <input
            name="recipient"
            type="email"
            required
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="recipient@example.com"
          />
        </label>
        <label>
          <span>Subject</span>
          <input
            name="subject"
            required
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Subject"
          />
        </label>
        <label className={styles.messageField}>
          <span>Message</span>
          <textarea
            name="message"
            required
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={isHtml ? "<p>Write an HTML message</p>" : "Write a message"}
            rows={5}
          />
        </label>
        <label className={styles.htmlToggle}>
          <input
            name="isHtml"
            type="checkbox"
            checked={isHtml}
            onChange={(event) => setIsHtml(event.target.checked)}
          />
          <span>Render message as HTML</span>
        </label>
        <div className={styles.sendActions}>
          <Button type="submit" isLoading={isSending}>
            Send message
          </Button>
          {status ? <span className={styles.successMessage}>{status}</span> : null}
          {error ? <span className={styles.formError}>{error}</span> : null}
        </div>
      </form>
    </Panel>
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
  readonly deletingMailId: string | null;
  readonly onSelect: (mailId: string) => void;
  readonly onDelete: (mailId: string) => void;
};

function MailWorkspace({
  mails,
  selectedMail,
  selectedMailId,
  isLoading,
  deletingMailId,
  onSelect,
  onDelete,
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

      {selectedMail ? (
        <MailDetail
          mail={selectedMail}
          isDeleting={deletingMailId === selectedMail.id}
          onDelete={onDelete}
        />
      ) : null}
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
  readonly isDeleting: boolean;
  readonly onDelete: (mailId: string) => void;
};

function MailDetail({ mail, isDeleting, onDelete }: MailDetailProps): JSX.Element {
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
          <Button
            variant="danger"
            isLoading={isDeleting}
            leftIcon={<Trash2 size={15} aria-hidden="true" />}
            onClick={() => {
              if (window.confirm("Delete this mail?")) {
                void onDelete(mail.id);
              }
            }}
          >
            Delete
          </Button>
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
