import type { JSX } from "react";
import { AlertCircle, CheckCircle2, Clock3, Trash2 } from "lucide-react";

import type { ServiceKey } from "@/shared/config/services";
import { Badge, Button, EmptyState, Panel } from "@/shared/kit";
import type { AdminNotificationType } from "@/shared/api/admin-notifications";

import { useAdminNotificationLogs } from "../../hooks/use-admin-notification-logs";
import styles from "./AdminNotificationLogs.module.scss";

type AdminNotificationLogsPageProps = {
  readonly serviceKey: ServiceKey;
};

export function AdminNotificationLogsPage({ serviceKey }: AdminNotificationLogsPageProps): JSX.Element {
  const { logs, isLoading, error, clearing, clearLog, clearAll } = useAdminNotificationLogs(serviceKey);

  const handleClear = async (type: AdminNotificationType): Promise<void> => {
    if (!window.confirm(`Clear ${type} admin notification logs?`)) {
      return;
    }

    await clearLog(type).catch(() => undefined);
  };

  const handleClearAll = async (): Promise<void> => {
    if (!window.confirm("Clear all admin notification logs?")) {
      return;
    }

    await clearAll().catch(() => undefined);
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h1>Admin notifications</h1>
          <p>Successful admin creation events and errors received from OWA.</p>
        </div>
        <div className={styles.heroActions}>
          <Badge tone="neutral">{logs.success.length + logs.error.length} entries</Badge>
          <Button
            variant="danger"
            leftIcon={<Trash2 size={14} />}
            isLoading={clearing === "all"}
            onClick={() => void handleClearAll()}
          >
            Clear all
          </Button>
        </div>
      </section>

      {error ? <Panel className={styles.errorPanel}><strong>Failed to load logs</strong><p>{error}</p></Panel> : null}

      {isLoading ? <EmptyState title="Loading logs" loading /> : (
        <div className={styles.columns}>
          <LogPanel title="Success" icon={<CheckCircle2 size={17} />} entries={logs.success} tone="success" isClearing={clearing === "success"} onClear={() => void handleClear("success")} />
          <LogPanel title="Errors" icon={<AlertCircle size={17} />} entries={logs.error} tone="danger" isClearing={clearing === "error"} onClear={() => void handleClear("error")} />
        </div>
      )}
    </div>
  );
}

function LogPanel({
  title,
  icon,
  entries,
  tone,
  isClearing,
  onClear,
}: {
  readonly title: string;
  readonly icon: JSX.Element;
  readonly entries: readonly string[];
  readonly tone: "success" | "danger";
  readonly isClearing: boolean;
  readonly onClear: () => void;
}): JSX.Element {
  return (
    <Panel className={styles.logPanel}>
      <div className={styles.panelHeader}>
        <span className={styles.title}>{icon}{title}</span>
        <div className={styles.panelActions}>
          <Badge tone={tone}>{entries.length}</Badge>
          <Button
            variant="ghost"
            leftIcon={<Trash2 size={13} />}
            isLoading={isClearing}
            onClick={onClear}
          >
            Clear
          </Button>
        </div>
      </div>
      {entries.length === 0 ? <EmptyState title="No entries" description="Nothing has been received yet." /> : (
        <div className={styles.entries}>
          {entries.map((entry, index) => <LogEntry key={`${entry}-${index}`} entry={entry} />)}
        </div>
      )}
    </Panel>
  );
}

function LogEntry({ entry }: { readonly entry: string }): JSX.Element {
  let parsedEntry: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(entry);
    if (typeof parsed === "object" && parsed !== null) {
      parsedEntry = parsed as Record<string, unknown>;
    }
  } catch {
    parsedEntry = null;
  }

  return (
    <article className={styles.entry}>
      <div className={styles.timestamp}><Clock3 size={13} aria-hidden="true" />{formatTimestamp(parsedEntry?.timestamp)} </div>
      <pre>{parsedEntry ? JSON.stringify(parsedEntry, null, 2) : entry}</pre>
    </article>
  );
}

function formatTimestamp(value: unknown): string {
  if (typeof value !== "string") {
    return "Unknown time";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
