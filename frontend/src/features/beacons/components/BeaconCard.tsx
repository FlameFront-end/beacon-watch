import type { JSX } from "react";
import clsx from "clsx";

import type { Beacon } from "@/shared/model/beacon";
import { Badge, Panel } from "@/shared/kit";
import { formatFieldLabel, formatLocalDateTime } from "@/shared/lib/format";

import styles from "./beacon-card.module.scss";

type BeaconCardProps = {
  beacon: Beacon;
};

function getTone(beacon: Beacon) {
  if (beacon.heartbeat === "ONLINE") {
    return "success" as const;
  }

  if (beacon.heartbeat === "OFFLINE") {
    return "danger" as const;
  }

  return beacon.type === "loot" ? ("warning" as const) : ("neutral" as const);
}

function formatValue(key: string, value: unknown): JSX.Element | string {
  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export function BeaconCard({ beacon }: BeaconCardProps): JSX.Element {
  const fieldEntries = Object.entries({
    mbxGuid: beacon.mbxGuid,
    forest: beacon.forest,
    heartbeat: beacon.heartbeat,
    httpStatus: beacon.httpStatus,
  }).filter(([, value]) => value !== null && value !== undefined && value !== "");
  const cookieRows = typeof beacon.cookies === "string" ? beacon.cookies.split(";").map((cookie) => cookie.trim()).filter(Boolean) : [];
  const statusLabel = beacon.heartbeat ?? beacon.type;

  return (
    <Panel className={clsx(styles.card, styles[getTone(beacon)])}>
      <div className={styles.header}>
        <div>
          <div className={styles.time}>{formatLocalDateTime(beacon.receivedAt)}</div>
          <div className={styles.subtitle}>Beacon {beacon.id.slice(0, 8)}</div>
        </div>
        <div className={styles.badges}>
          <Badge tone={getTone(beacon)}>{statusLabel}</Badge>
          <Badge>{beacon.type}</Badge>
        </div>
      </div>

      <div className={styles.table}>
        {fieldEntries.map(([key, value]) => {
          return (
            <div key={key} className={styles.row}>
              <div className={styles.key}>{formatFieldLabel(key)}</div>
              <div className={styles.value}>{formatValue(key, value)}</div>
            </div>
          );
        })}
      </div>

      {cookieRows.length > 0 ? (
        <div className={styles.cookieSection}>
          <div className={styles.key}>Cookies</div>
          <div className={styles.valueGroup}>
            {cookieRows.map((cookie) => {
              const isCanary = cookie.startsWith("X-OWA-CANARY=");
              return (
                <div key={cookie} className={clsx(styles.cookieRow, isCanary && styles.canaryRow)}>
                  {cookie}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <details className={styles.rawPayload}>
        <summary>Raw payload</summary>
        <pre>{JSON.stringify(beacon.raw, null, 2)}</pre>
      </details>
    </Panel>
  );
}
