import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type JSX,
} from "react";
import { FileUp, Send, Settings2 } from "lucide-react";

import {
  getSmtpSettings,
  sendMail,
  updateSmtpSettings,
  type SmtpSettings,
} from "@/shared/api/smtp";
import { Button, Checkbox, Panel, Select } from "@/shared/kit";
import { readHtmlFile } from "@/features/mails/lib/read-html-file";
import { DeliveryHistory } from "@/features/smtp/components/DeliveryHistory";
import {
  buildCalendarInviteRequest,
  createEmptySmtpSendDraft,
  normalizeSmtpSendDraft,
  validateCalendarInviteDraft,
  type SmtpSendDraft,
} from "@/features/smtp/lib/smtp-send-draft";

import styles from "./Smtp.module.scss";

type TlsMode = "none" | "starttls" | "implicit";
const SMTP_SEND_DRAFT_STORAGE_KEY = "beaconwatch:smtp-send-draft";

const TLS_MODE_OPTIONS = [
  { value: "none", label: "None (anonymous relay only)" },
  { value: "starttls", label: "STARTTLS required (usually port 587)" },
  { value: "implicit", label: "Implicit TLS (usually port 465)" },
] as const;

export function SmtpPage(): JSX.Element {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h1>SMTP</h1>
          <p>Global mail delivery and relay configuration shared by every service.</p>
        </div>
      </section>

      <div className={styles.panels}>
        <SendMailPanel />
        <SmtpSettingsPanel />
      </div>
      <DeliveryHistory />
    </div>
  );
}

function SendMailPanel(): JSX.Element {
  const htmlFileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<SmtpSendDraft>(readStoredSmtpSendDraft);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(SMTP_SEND_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  async function handleHtmlFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const fileInput = event.currentTarget;
    const htmlFile = fileInput.files?.[0];

    if (!htmlFile) {
      return;
    }

    setStatus(null);

    try {
      const importedHtml = await readHtmlFile(htmlFile);
      updateDraft({ text: importedHtml, isHtml: true });
      setImportedFileName(htmlFile.name);
      setError(null);
    } catch {
      setError("Failed to read HTML file");
    } finally {
      fileInput.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const calendarError = validateCalendarInviteDraft(draft);
    if (calendarError) {
      setStatus(null);
      setError(calendarError);
      return;
    }

    setIsSending(true);
    setStatus(null);
    setError(null);

    try {
      const calendarInvite = buildCalendarInviteRequest(draft);
      await sendMail({
        to: draft.to,
        subject: draft.subject,
        ...(draft.isHtml ? { html: draft.text } : { text: draft.text }),
        ...(calendarInvite ? { calendarInvite } : {}),
      });
      setStatus(`SMTP server accepted the message for ${draft.to}`);
      window.dispatchEvent(new Event("smtp-delivery-created"));
    } catch (sendError: unknown) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  function resetForm(): void {
    const emptyDraft = createEmptySmtpSendDraft();
    setDraft(emptyDraft);
    setImportedFileName(null);
    setStatus(null);
    setError(null);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(SMTP_SEND_DRAFT_STORAGE_KEY);
    }
  }

  function updateDraft(patch: Partial<SmtpSendDraft>): void {
    setDraft((currentDraft) => ({ ...currentDraft, ...patch }));
  }

  return (
    <Panel className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <h2>Send email</h2>
          <p>Send a plain-text or raw HTML message through SMTP.</p>
        </div>
        <Send size={18} aria-hidden="true" />
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <fieldset className={styles.formSection}>
          <legend>Message envelope</legend>
          <div className={styles.formSectionGrid}>
            <label>
              <span>Recipient</span>
              <input
                name="recipient"
                type="email"
                required
                value={draft.to}
                onChange={(event) => updateDraft({ to: event.target.value })}
                placeholder="recipient@example.com"
              />
            </label>
            <label>
              <span>Subject</span>
              <input
                name="subject"
                required
                value={draft.subject}
                onChange={(event) => updateDraft({ subject: event.target.value })}
                placeholder="Subject"
              />
            </label>
            <label className={styles.messageField}>
              <span>Message</span>
              <textarea
                name="message"
                required
                value={draft.text}
                onChange={(event) => updateDraft({ text: event.target.value })}
                placeholder={draft.isHtml ? "<p>Write an HTML message</p>" : "Write a message"}
                rows={8}
              />
            </label>
          </div>
        </fieldset>
        <div className={styles.importRow}>
          <input
            ref={htmlFileInputRef}
            className={styles.htmlFileInput}
            type="file"
            accept=".html,.htm,text/html"
            onChange={(event) => {
              void handleHtmlFileChange(event);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            leftIcon={<FileUp size={15} aria-hidden="true" />}
            onClick={() => htmlFileInputRef.current?.click()}
          >
            Import HTML
          </Button>
          {importedFileName ? (
            <span className={styles.importedFileName}>{importedFileName}</span>
          ) : null}
        </div>
        <Checkbox
          className={styles.htmlToggle}
          name="isHtml"
          label="Render message as HTML"
          checked={draft.isHtml}
          onChange={(event) => updateDraft({ isHtml: event.target.checked })}
        />
        <fieldset className={`${styles.calendarInvite} ${draft.hasCalendarInvite ? styles.calendarInviteActive : ""}`}>
          <Checkbox
            className={styles.calendarToggle}
            name="hasCalendarInvite"
            label="Add Outlook calendar invite (.ics)"
            checked={draft.hasCalendarInvite}
            onChange={(event) => updateDraft({ hasCalendarInvite: event.target.checked })}
          />
          <p className={styles.calendarHint}>
            Attaches a standard iCalendar request so Outlook and other clients can create a calendar event.
          </p>
          {draft.hasCalendarInvite ? (
            <div className={styles.calendarFields}>
              <label>
                <span>Meeting title</span>
                <input
                  name="calendarTitle"
                  required
                  maxLength={120}
                  value={draft.calendarTitle}
                  onChange={(event) => updateDraft({ calendarTitle: event.target.value })}
                  placeholder={draft.subject || "Meeting title"}
                />
              </label>
              <label>
                <span>Start</span>
                <input
                  name="calendarStartsAt"
                  type="datetime-local"
                  required
                  value={draft.calendarStartsAt}
                  onChange={(event) => updateDraft({ calendarStartsAt: event.target.value })}
                />
              </label>
              <label>
                <span>End</span>
                <input
                  name="calendarEndsAt"
                  type="datetime-local"
                  required
                  value={draft.calendarEndsAt}
                  onChange={(event) => updateDraft({ calendarEndsAt: event.target.value })}
                />
              </label>
              <label>
                <span>Location</span>
                <input
                  name="calendarLocation"
                  maxLength={160}
                  value={draft.calendarLocation}
                  onChange={(event) => updateDraft({ calendarLocation: event.target.value })}
                  placeholder="Optional"
                />
              </label>
              <label className={styles.messageField}>
                <span>Calendar description</span>
                <textarea
                  name="calendarDescription"
                  maxLength={2000}
                  value={draft.calendarDescription}
                  onChange={(event) => updateDraft({ calendarDescription: event.target.value })}
                  placeholder="Optional agenda or joining instructions"
                  rows={3}
                />
              </label>
            </div>
          ) : null}
        </fieldset>
        <div className={styles.actions}>
          <Button type="submit" isLoading={isSending}>
            Send message
          </Button>
          <Button type="button" variant="secondary" onClick={resetForm}>
            Reset form
          </Button>
          {status ? <span className={styles.successMessage}>{status}</span> : null}
          {error ? <span className={styles.formError}>{error}</span> : null}
        </div>
      </form>
    </Panel>
  );
}

function readStoredSmtpSendDraft(): SmtpSendDraft {
  if (typeof localStorage === "undefined") {
    return createEmptySmtpSendDraft();
  }

  const storedDraft = localStorage.getItem(SMTP_SEND_DRAFT_STORAGE_KEY);
  if (!storedDraft) {
    return createEmptySmtpSendDraft();
  }

  try {
    return normalizeSmtpSendDraft(JSON.parse(storedDraft));
  } catch {
    return createEmptySmtpSendDraft();
  }
}

function SmtpSettingsPanel(): JSX.Element {
  const [settings, setSettings] = useState<SmtpSettings | null>(null);
  const [host, setHost] = useState("");
  const [port, setPort] = useState("25");
  const [tlsMode, setTlsMode] = useState<TlsMode>("none");
  const [from, setFrom] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [proxyHost, setProxyHost] = useState("");
  const [proxyPort, setProxyPort] = useState("1080");
  const [proxyUser, setProxyUser] = useState("");
  const [proxyPassword, setProxyPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canReuseStoredPassword = Boolean(
    user && settings?.hasPassword && user === settings.user,
  );
  const isPasswordRequired = Boolean(user) && !canReuseStoredPassword;
  const canReuseProxyPassword = Boolean(
    proxyUser && settings?.hasProxyPassword && proxyUser === settings.proxyUser,
  );
  const isProxyPasswordRequired = Boolean(proxyUser) && !canReuseProxyPassword;

  useEffect(() => {
    void getSmtpSettings()
      .then((currentSettings) => {
        setSettings(currentSettings);
        setHost(currentSettings.host);
        setPort(String(currentSettings.port));
        setTlsMode(toTlsMode(currentSettings));
        setFrom(currentSettings.from);
        setUser(currentSettings.user);
        setProxyHost(currentSettings.proxyHost);
        setProxyPort(String(currentSettings.proxyPort));
        setProxyUser(currentSettings.proxyUser);
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
        proxyHost,
        proxyPort: Number(proxyPort),
        proxyUser,
        proxyPassword,
      });
      setSettings(updated);
      setHost(updated.host);
      setPort(String(updated.port));
      setTlsMode(toTlsMode(updated));
      setFrom(updated.from);
      setUser(updated.user);
      setPassword("");
      setProxyHost(updated.proxyHost);
      setProxyPort(String(updated.proxyPort));
      setProxyUser(updated.proxyUser);
      setProxyPassword("");
      setStatus("SMTP settings saved");
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save SMTP settings");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Panel className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <h2>SMTP settings</h2>
          <p>Password is write-only and is never returned to the browser.</p>
        </div>
        <Settings2 size={18} aria-hidden="true" />
      </div>
      {isLoading ? <p className={styles.settingsHint}>Loading settings...</p> : null}
      {!isLoading ? (
        <form className={styles.form} onSubmit={handleSubmit}>
          <fieldset className={styles.formSection}>
            <legend>Connection</legend>
            <div className={styles.formSectionGrid}>
              <label>
                <span>SMTP host</span>
                <input
                  name="smtpHost"
                  required
                  value={host}
                  onChange={(event) => setHost(event.target.value)}
                />
              </label>
              <label>
                <span>Port</span>
                <input
                  name="smtpPort"
                  required
                  type="number"
                  min="1"
                  max="65535"
                  value={port}
                  onChange={(event) => setPort(event.target.value)}
                />
              </label>
              <div className={styles.selectField}>
                <span>Connection security</span>
                <Select
                  name="smtpTlsMode"
                  value={tlsMode}
                  options={TLS_MODE_OPTIONS}
                  ariaLabel="Connection security"
                  onChange={setTlsMode}
                />
              </div>
            </div>
          </fieldset>
          <fieldset className={styles.formSection}>
            <legend>Sender authentication</legend>
            <div className={styles.formSectionGrid}>
              <label>
                <span>From</span>
                <input
                  name="smtpFrom"
                  required
                  type="email"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
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
            </div>
          </fieldset>
          <fieldset className={styles.formSection}>
            <legend>SOCKS5 proxy</legend>
            <div className={styles.formSectionGrid}>
              <label>
                <span>SOCKS5 proxy host</span>
                <input
                  name="proxyHost"
                  value={proxyHost}
                  onChange={(event) => setProxyHost(event.target.value)}
                  placeholder="Optional"
                />
              </label>
              <label>
                <span>SOCKS5 proxy port</span>
                <input
                  name="proxyPort"
                  type="number"
                  min="1"
                  max="65535"
                  value={proxyPort}
                  onChange={(event) => setProxyPort(event.target.value)}
                />
              </label>
              <label>
                <span>SOCKS5 proxy user</span>
                <input
                  name="proxyUser"
                  value={proxyUser}
                  onChange={(event) => {
                    const nextUser = event.target.value;
                    setProxyUser(nextUser);
                    if (!nextUser) {
                      setProxyPassword("");
                    }
                  }}
                />
              </label>
              <label>
                <span>
                  SOCKS5 proxy password {canReuseProxyPassword ? "(leave blank to keep)" : proxyUser ? "(required)" : ""}
                </span>
                <input
                  name="proxyPassword"
                  type="password"
                  value={proxyPassword}
                  required={isProxyPasswordRequired}
                  disabled={!proxyUser}
                  onChange={(event) => setProxyPassword(event.target.value)}
                />
              </label>
            </div>
          </fieldset>
          <p className={styles.settingsHint}>
            Authentication requires STARTTLS or implicit TLS. Clearing the SMTP
            user also removes the stored password. SOCKS5 is disabled when its host is empty.
          </p>
          <div className={styles.actions}>
            <Button type="submit" isLoading={isSaving}>
              Save SMTP settings
            </Button>
            {status ? <span className={styles.successMessage}>{status}</span> : null}
            {error ? <span className={styles.formError}>{error}</span> : null}
          </div>
        </form>
      ) : null}
    </Panel>
  );
}

function toTlsMode(settings: SmtpSettings): TlsMode {
  if (settings.secure) {
    return "implicit";
  }

  return settings.requireTls ? "starttls" : "none";
}
