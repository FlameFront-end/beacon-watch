import type { JSX } from "react";

import { Link } from "wouter";

import { Badge, Panel } from "@/shared/kit";
import type { CallbackEvent } from "@/shared/model/callback";

import { formatDateTime, shortId, statusTone } from "./callback-format";
import styles from "./Callbacks.module.scss";

type CallbackCardProps = {
  readonly event: CallbackEvent;
};

export function CallbackCard({ event }: CallbackCardProps): JSX.Element {
  return (
    <Link href={`/callbacks/${event.id}`} className={styles.cardLink}>
      <Panel className={styles.callbackCard}>
        <div className={styles.cardHeader}>
          <strong>{shortId(event.id)}</strong>
          <Badge tone={statusTone(event.status)}>{event.status}</Badge>
        </div>
        <dl className={styles.compactFacts}>
          <div><dt>IP</dt><dd>{event.sourceIp}</dd></div>
          <div><dt>Time</dt><dd>{formatDateTime(event.timestamp)}</dd></div>
          <div><dt>Target</dt><dd>{event.targetId ?? "-"}</dd></div>
          <div><dt>Payload</dt><dd>{event.payload ?? "-"}</dd></div>
        </dl>
      </Panel>
    </Link>
  );
}
