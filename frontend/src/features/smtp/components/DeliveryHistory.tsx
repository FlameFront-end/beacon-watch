import { useEffect, useState, type JSX } from "react";

import {
  cancelDelivery,
  getDeliveries,
  getDeliveryDetails,
  type DeliveryEvent,
  type DeliveryRecord,
  type DeliveryStatus,
} from "@/shared/api/smtp";
import { API_ORIGIN } from "@/shared/config/api";

import styles from "../pages/Smtp/Smtp.module.scss";

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  created: "Created",
  submitting: "Submitting",
  accepted: "Accepted",
  queued: "Queued",
  retrying: "Retrying",
  delivered: "Delivered",
  deferred: "Deferred",
  bounced: "Bounced",
  failed: "Failed",
  cancelled: "Cancelled",
  stale: "Stale",
  sync_pending: "Sync pending",
};

export function DeliveryHistory(): JSX.Element {
  const [items, setItems] = useState<DeliveryRecord[]>([]);
  const [selected, setSelected] = useState<DeliveryRecord | null>(null);
  const [events, setEvents] = useState<DeliveryEvent[]>([]);
  const [status, setStatus] = useState<DeliveryStatus | "">("");
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    try {
      const result = await getDeliveries(status || undefined);
      setItems(result.items);
      setError(null);
    } catch {
      setError("Failed to load delivery history");
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    const refresh = () => void load();
    window.addEventListener("smtp-delivery-created", refresh);
    const eventSource = new EventSource(
      new URL("/api/smtp/deliveries/events", API_ORIGIN || window.location.origin),
      { withCredentials: true },
    );
    eventSource.addEventListener("smtp_delivery", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("smtp-delivery-created", refresh);
      eventSource.close();
    };
  }, [status]);

  async function openDetails(item: DeliveryRecord): Promise<void> {
    const details = await getDeliveryDetails(item.id);
    setSelected(details.delivery);
    setEvents(details.events);
  }

  async function cancel(item: DeliveryRecord): Promise<void> {
    await cancelDelivery(item.id);
    await load();
    setSelected(null);
  }

  return (
    <section className={styles.historyPanel}>
      <div className={styles.panelHeading}>
        <div>
          <h2>Delivery history</h2>
          <p>Track SMTP acceptance, Mailcow queue state, retries, and delivery errors.</p>
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value as DeliveryStatus | "")}>
          <option value="">All statuses</option>
          <option value="accepted">Accepted</option>
          <option value="queued">Queued</option>
          <option value="deferred">Deferred</option>
          <option value="delivered">Delivered</option>
          <option value="bounced">Bounced</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      {error ? <p className={styles.formError}>{error}</p> : null}
      {items.length === 0 ? <p className={styles.settingsHint}>No deliveries yet.</p> : (
        <div className={styles.historyTableWrap}>
          <table className={styles.historyTable}>
            <thead>
              <tr><th>Time</th><th>Recipient</th><th>Subject</th><th>Status</th><th>Attempts</th><th /></tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>{item.recipient}</td>
                  <td>{item.subject}</td>
                  <td><span className={`${styles.statusBadge} ${styles[`status_${item.status}`]}`}>{STATUS_LABELS[item.status]}</span></td>
                  <td>{item.attemptCount}</td>
                  <td className={styles.historyActions}>
                    <button type="button" onClick={() => void openDetails(item)}>Details</button>
                    {(item.status === "queued" || item.status === "deferred") ? <button type="button" onClick={() => void cancel(item)}>Cancel</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected ? (
        <div className={styles.detailsPanel}>
          <div className={styles.panelHeading}><div><h3>{selected.subject}</h3><p>{selected.recipient} · {selected.messageId}</p></div><button type="button" onClick={() => setSelected(null)}>Close</button></div>
          <p>{selected.preview}</p>
          {selected.errorMessage ? <p className={styles.formError}>{selected.errorCategory}: {selected.errorMessage}</p> : null}
          <ol className={styles.timeline}>{events.map((event) => <li key={event.id}><strong>{STATUS_LABELS[event.status]}</strong><span>{formatDate(event.createdAt)} · {event.source}</span><p>{event.message ?? "No additional details"}</p></li>)}</ol>
        </div>
      ) : null}
    </section>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}
