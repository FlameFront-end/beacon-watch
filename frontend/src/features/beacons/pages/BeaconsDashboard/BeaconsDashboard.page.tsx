import type { JSX } from "react";

import { Button, Panel } from "@/shared/kit";

import { BeaconList } from "../../components/BeaconList";
import { FilterBar } from "../../components/FilterBar";
import { StatsBar } from "../../components/StatsBar";
import { useBeaconsDashboard } from "../../hooks/use-beacons-dashboard";
import styles from "./BeaconsDashboard.module.scss";

export function BeaconsDashboardPage(): JSX.Element {
  const dashboard = useBeaconsDashboard();

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h1>Events</h1>
          <p>Beacon payloads, heartbeat state, mailbox hints, cookies, and raw request bodies.</p>
        </div>

        <div className={styles.heroStatus}>
          <small>Total</small>
          <span>{dashboard.counts.total}</span>
        </div>
      </section>

      <Panel className={styles.controlPanel}>
        <FilterBar value={dashboard.filter} onChange={dashboard.setFilter} />
        <Button variant="danger" onClick={dashboard.handleClearAll} isLoading={dashboard.isClearing}>
          Clear all
        </Button>
      </Panel>

      <StatsBar
        total={dashboard.counts.total}
        loot={dashboard.counts.loot}
        users={dashboard.counts.users}
        online={dashboard.counts.online}
        offline={dashboard.counts.offline}
      />

      {dashboard.error ? (
        <Panel className={styles.errorPanel}>
          <strong>Failed to load beacons</strong>
          <p>{dashboard.error}</p>
        </Panel>
      ) : null}

      <BeaconList beacons={dashboard.visibleBeacons} isLoading={dashboard.isLoading} />
    </div>
  );
}
