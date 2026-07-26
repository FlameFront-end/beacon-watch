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
import { Button, Panel } from "@/shared/kit";
import { readHtmlFile } from "@/features/mails/lib/read-html-file";

import styles from "./Smtp.module.scss";

type TlsMode = "none" | "starttls" | "implicit";

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
    </div>
  );
}

function SendMailPanel(): JSX.Element {
  const htmlFileInputRef = useRef<HTMLInputElement>(null);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [isHtml, setIsHtml] = useState(false);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleHtmlFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const fileInput = event.currentTarget;
    const htmlFile = fileInput.files?.[0];

    if (!htmlFile) {
      return;
    }

    setStatus(null);

    try {
      const importedHtml = await readHtmlFile(htmlFile);
      setText(importedHtml);
      setIsHtml(true);
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
    setIsSending(true);
    setStatus(null);
    setError(null);

    try {
      await sendMail(isHtml ? { to, subject, html: text } : { to, subject, text });
      setStatus(`SMTP server accepted the message for ${to}`);
      setText("");
      setImportedFileName(null);
    } catch (sendError: unknown) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
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
            rows={8}
          />
        </label>
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
        <label className={styles.htmlToggle}>
          <input
            name="isHtml"
            type="checkbox"
            checked={isHtml}
            onChange={(event) => setIsHtml(event.target.checked)}
          />
          <span>Render message as HTML</span>
        </label>
        <div className={styles.actions}>
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

function SmtpSettingsPanel(): JSX.Element {
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
