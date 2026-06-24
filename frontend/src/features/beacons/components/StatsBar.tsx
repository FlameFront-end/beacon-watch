import type { JSX } from "react";

import { Panel, Badge } from "@/shared/kit";

import styles from "./stats-bar.module.scss";

type StatsBarProps = {
  total: number;
  loot: number;
  heartbeat: number;
  online: number;
  offline: number;
};

export function StatsBar({ total, loot, heartbeat, online, offline }: StatsBarProps): JSX.Element {
  return (
    <div className={styles.statsGrid}>
      <Panel className={styles.statCard}>
        <Badge tone="neutral">Total</Badge>
        <strong>{total}</strong>
      </Panel>
      <Panel className={styles.statCard}>
        <Badge tone="warning">Loot</Badge>
        <strong>{loot}</strong>
      </Panel>
      <Panel className={styles.statCard}>
        <Badge tone="neutral">Heartbeat</Badge>
        <strong>{heartbeat}</strong>
      </Panel>
      <Panel className={styles.statCard}>
        <Badge tone="success">Online</Badge>
        <strong>{online}</strong>
      </Panel>
      <Panel className={styles.statCard}>
        <Badge tone="danger">Offline</Badge>
        <strong>{offline}</strong>
      </Panel>
    </div>
  );
}
