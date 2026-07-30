import type { JSX } from "react";

import { Activity, Clock3, Database } from "lucide-react";

import { Badge, Panel } from "@/shared/kit";
import type { CallbackStatsResponse } from "@/shared/model/callback";

import { formatDateTime, statusTone } from "./callback-format";
import styles from "./Callbacks.module.scss";

type CallbackStatsProps = {
  readonly stats: CallbackStatsResponse | null;
};

export function CallbackStats({ stats }: CallbackStatsProps): JSX.Element {
  return (
    <Panel className={styles.statsPanel}>
      <div className={styles.statItem}>
        <Database size={14} aria-hidden="true" />
        <span>Total</span>
        <strong>{stats?.total ?? "—"}</strong>
      </div>
      <div className={styles.statItem}>
        <Clock3 size={14} aria-hidden="true" />
        <span>Last hour</span>
        <strong>{stats?.lastHour ?? "—"}</strong>
      </div>
      <div className={styles.latestStat}>
        <Activity size={14} aria-hidden="true" />
        <div>
          <span>Latest callback</span>
          <strong>{stats?.latest ? formatDateTime(stats.latest.timestamp) : "No callbacks yet"}</strong>
        </div>
        {stats?.latest ? <Badge tone={statusTone(stats.latest.status)}>{stats.latest.status}</Badge> : null}
      </div>
    </Panel>
  );
}
