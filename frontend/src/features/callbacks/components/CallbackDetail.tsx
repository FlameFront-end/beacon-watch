import type { JSX } from "react";
import { useState } from "react";

import { Copy } from "lucide-react";

import { Badge, Button, Panel } from "@/shared/kit";
import type { CallbackEvent } from "@/shared/model/callback";

import { eventAsJson, formatDateTime, formatJson, statusTone } from "./callback-format";
import styles from "./Callbacks.module.scss";

type CallbackDetailProps = {
  readonly event: CallbackEvent;
};

export function CallbackDetail({ event }: CallbackDetailProps): JSX.Element {
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const copy = async (copyKey: string, value: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyError(null);
      setCopied(copyKey);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      setCopied(null);
      setCopyError("Copy failed");
      window.setTimeout(() => setCopyError(null), 1200);
    }
  };

  return (
    <div className={styles.detailGrid}>
      <Panel className={styles.detailPanel}>
        <div className={styles.detailHeader}>
          <div>
            <span className={styles.eyebrow}>Callback event</span>
            <h1>{event.id}</h1>
          </div>
          <Badge tone={statusTone(event.status)}>{event.status}</Badge>
        </div>
        {copyError ? <p className={styles.copyError}>{copyError}</p> : null}
        <dl className={styles.factGrid}>
          <div><dt>Timestamp</dt><dd>{formatDateTime(event.timestamp)}</dd></div>
          <div><dt>Processed</dt><dd>{formatDateTime(event.processedAt)}</dd></div>
          <div><dt>Source IP</dt><dd>{event.sourceIp}</dd></div>
          <div><dt>Method</dt><dd>{event.method}</dd></div>
          <div><dt>Target ID</dt><dd>{event.targetId ?? "-"}</dd></div>
          <div><dt>Payload</dt><dd>{event.payload ?? "-"}</dd></div>
          <div className={styles.fullFact}><dt>URL</dt><dd>{event.url}</dd></div>
          <div className={styles.fullFact}><dt>User agent</dt><dd>{event.userAgent ?? "-"}</dd></div>
        </dl>
      </Panel>

      <CodePanel
        title="Headers"
        copyKey="headers"
        copied={copied}
        value={formatJson(event.headers)}
        onCopy={(value) => void copy("headers", value)}
      />
      <CodePanel
        title="Query params"
        copyKey="query"
        copied={copied}
        value={formatJson(event.queryParams)}
        onCopy={(value) => void copy("query", value)}
      />
      <CodePanel
        title="Body"
        copyKey="body"
        copied={copied}
        value={formatBody(event.body)}
        onCopy={(value) => void copy("body", value)}
      />
      <CodePanel
        title="Full event JSON"
        copyKey="event"
        copied={copied}
        value={eventAsJson(event)}
        onCopy={(value) => void copy("event", value)}
      />
    </div>
  );
}

function CodePanel({
  title,
  copyKey,
  value,
  copied,
  onCopy,
}: {
  readonly title: string;
  readonly copyKey: string;
  readonly value: string;
  readonly copied: string | null;
  readonly onCopy: (value: string) => void;
}): JSX.Element {
  return (
    <Panel className={styles.codePanel}>
      <div className={styles.codeHeader}>
        <h2>{title}</h2>
        <Button
          variant="secondary"
          leftIcon={<Copy size={13} aria-hidden="true" />}
          onClick={() => onCopy(value)}
        >
          {copied === copyKey ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre><code>{value}</code></pre>
    </Panel>
  );
}

function formatBody(body: string | null): string {
  if (!body) {
    return "(empty)";
  }
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}
