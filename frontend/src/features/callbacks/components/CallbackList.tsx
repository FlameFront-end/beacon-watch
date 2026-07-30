import type { JSX } from "react";

import { Link } from "wouter";

import { Badge, Button, EmptyState } from "@/shared/kit";
import type { CallbackEvent, CallbackSortDirection, CallbackSortField } from "@/shared/model/callback";

import { formatDateTime, shortId, statusTone } from "./callback-format";
import styles from "./Callbacks.module.scss";

type CallbackListProps = {
  readonly events: readonly CallbackEvent[];
  readonly isLoading: boolean;
  readonly sortBy: CallbackSortField;
  readonly sortDirection: CallbackSortDirection;
  readonly onSort: (field: CallbackSortField) => void;
  readonly onDelete: (id: string) => void;
};

export function CallbackList({
  events,
  isLoading,
  sortBy,
  sortDirection,
  onSort,
  onDelete,
}: CallbackListProps): JSX.Element {
  if (isLoading) {
    return <EmptyState title="Loading callback events" loading />;
  }

  if (events.length === 0) {
    return <EmptyState title="No callback events yet" description="Send a POST request to /api/callback." />;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <SortableHeader
              field="sourceIp"
              label="IP"
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={onSort}
            />
            <SortableHeader
              field="timestamp"
              label="Timestamp"
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={onSort}
            />
            <SortableHeader
              field="status"
              label="Status"
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={onSort}
            />
            <th>User agent</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>
                <Link href={`/callbacks/${event.id}`} className={styles.idLink}>{shortId(event.id)}</Link>
              </td>
              <td className={styles.monospace}>{event.sourceIp}</td>
              <td>{formatDateTime(event.timestamp)}</td>
              <td><Badge tone={statusTone(event.status)}>{event.status}</Badge></td>
              <td className={styles.userAgent}>{event.userAgent ?? "-"}</td>
              <td className={styles.rowActions}>
                <Button variant="ghost" onClick={() => onDelete(event.id)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortableHeader({
  field,
  label,
  sortBy,
  sortDirection,
  onSort,
}: {
  readonly field: CallbackSortField;
  readonly label: string;
  readonly sortBy: CallbackSortField;
  readonly sortDirection: CallbackSortDirection;
  readonly onSort: (field: CallbackSortField) => void;
}): JSX.Element {
  const isActive = sortBy === field;
  return (
    <th aria-sort={isActive ? toAriaSort(sortDirection) : "none"}>
      <button className={styles.sortButton} type="button" onClick={() => onSort(field)}>
        {label}
        {isActive ? <span aria-hidden="true">{sortDirection === "ASC" ? "↑" : "↓"}</span> : null}
      </button>
    </th>
  );
}

function toAriaSort(sortDirection: CallbackSortDirection): "ascending" | "descending" {
  return sortDirection === "ASC" ? "ascending" : "descending";
}
