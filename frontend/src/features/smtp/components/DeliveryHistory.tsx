import { Fragment, useEffect, useState, type JSX } from "react";

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

const PAGE_SIZE = 8;

export function DeliveryHistory(): JSX.Element {
  const [items, setItems] = useState<DeliveryRecord[]>([]);
  const [selected, setSelected] = useState<DeliveryRecord | null>(null);
  const [events, setEvents] = useState<DeliveryEvent[]>([]);
  const [status, setStatus] = useState<DeliveryStatus | "">("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function load(): Promise<void> {
    try {
      const result = await getDeliveries({
        status: status || undefined,
        offset: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
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
  }, [page, status]);

  async function openDetails(item: DeliveryRecord): Promise<void> {
    if (selected?.id === item.id) {
      setSelected(null);
      setEvents([]);
      return;
    }

    try {
      const details = await getDeliveryDetails(item.id);
      setSelected(details.delivery);
      setEvents(details.events);
      setDetailsError(null);
    } catch {
      setDetailsError("Failed to load delivery details");
    }
  }

  async function cancel(item: DeliveryRecord): Promise<void> {
    await cancelDelivery(item.id);
    await load();
    setSelected(null);
  }

  function selectStatus(nextStatus: DeliveryStatus | ""): void {
    setStatus(nextStatus);
    setPage(1);
    setSelected(null);
    setEvents([]);
  }

  return (
    <section className={styles.historyPanel}>
      <div className={styles.panelHeading}>
        <div>
          <h2>Delivery history</h2>
          <p>Track SMTP acceptance, Mailcow queue state, retries, and delivery errors.</p>
        </div>
        <select value={status} onChange={(event) => selectStatus(event.target.value as DeliveryStatus | "")}>
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
      {detailsError ? <p className={styles.formError}>{detailsError}</p> : null}
      {items.length === 0 ? <p className={styles.settingsHint}>No deliveries yet.</p> : (
        <>
          <div className={styles.historyTableWrap}>
            <table className={styles.historyTable}>
              <thead>
                <tr><th>Time</th><th>Recipient</th><th>Subject</th><th>Status</th><th>Attempts</th><th /></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <Fragment key={item.id}>
                    <tr
                      className={`${styles.historyRow} ${selected?.id === item.id ? styles.historyRowActive : ""}`}
                      onClick={() => void openDetails(item)}
                    >
                      <td>{formatDate(item.createdAt)}</td>
                      <td>{item.recipient}</td>
                      <td className={styles.subjectCell}>{item.subject}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[`status_${item.status}`]}`}>
                          {STATUS_LABELS[item.status]}
                        </span>
                      </td>
                      <td>{item.attemptCount}</td>
                      <td className={styles.historyActions}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openDetails(item);
                          }}
                        >
                          {selected?.id === item.id ? "Hide" : "Details"}
                        </button>
                        {(item.status === "queued" || item.status === "deferred") ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void cancel(item);
                            }}
                          >
                            Cancel
                          </button>
                        ) : null}
                      </td>
                    </tr>
                    {selected?.id === item.id ? (
                      <tr className={styles.detailsRow}>
                        <td colSpan={6}>
                          <DeliveryDetails delivery={selected} events={events} onClose={() => setSelected(null)} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div>
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                Previous
              </button>
              <strong>{page} / {totalPages}</strong>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function DeliveryDetails(props: {
  readonly delivery: DeliveryRecord;
  readonly events: readonly DeliveryEvent[];
  readonly onClose: () => void;
}): JSX.Element {
  const deliveredEvent = props.events.find((event) => event.status === "delivered");

  return (
    <div className={styles.detailsPanel}>
      <div className={styles.detailsHeader}>
        <div>
          <h3>{props.delivery.subject}</h3>
          <p>{props.delivery.recipient} · {props.delivery.messageId}</p>
        </div>
        <button type="button" onClick={props.onClose}>Close</button>
      </div>
      <div className={styles.deliverySummary}>
        <span className={`${styles.statusBadge} ${styles[`status_${props.delivery.status}`]}`}>
          {STATUS_LABELS[props.delivery.status]}
        </span>
        {props.delivery.queueId ? <span>Queue ID: {props.delivery.queueId}</span> : null}
        {deliveredEvent?.mxHost ? <span>Recipient MX: {deliveredEvent.mxHost}</span> : null}
      </div>
      {props.delivery.preview ? <p className={styles.previewText}>{props.delivery.preview}</p> : null}
      {props.delivery.errorMessage ? (
        <p className={styles.formError}>{props.delivery.errorCategory}: {props.delivery.errorMessage}</p>
      ) : null}
      <ol className={styles.timeline}>
        {props.events.map((event) => (
          <li key={event.id}>
            <strong>{eventTitle(event)}</strong>
            <span>{formatDate(event.createdAt)} · {event.source}</span>
            <p>{event.message ?? eventDescription(event)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function eventTitle(event: DeliveryEvent): string {
  if (event.status === "delivered" && event.smtpCode && event.smtpCode >= 200 && event.smtpCode < 300) {
    return "Accepted by recipient MX";
  }
  return STATUS_LABELS[event.status];
}

function eventDescription(event: DeliveryEvent): string {
  if (event.status === "delivered") {
    return "Recipient mail server accepted the message. Inbox placement is decided by the recipient.";
  }
  return "No additional details";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}
