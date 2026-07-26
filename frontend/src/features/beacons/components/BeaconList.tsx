import type { JSX } from "react";
import { Link } from "wouter";

import type { ServiceKey } from "@/shared/config/services";
import type { Beacon } from "@/shared/model/beacon";
import { EmptyState } from "@/shared/kit";

import { BeaconCard } from "./BeaconCard";
import styles from "./beacon-list.module.scss";

type BeaconListProps = {
  serviceKey: ServiceKey;
  beacons: Beacon[];
  isLoading: boolean;
};

export function BeaconList({ serviceKey, beacons, isLoading }: BeaconListProps): JSX.Element {
  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <EmptyState loading title="Loading beacons" description="Fetching recent beacon history and opening the live stream." />
      </div>
    );
  }

  if (beacons.length === 0) {
    return (
      <EmptyState title="No beacons yet" description="Waiting for the first payload from the test OWA server." />
    );
  }

  return (
    <div className={styles.list}>
      {beacons.map((beacon) => (
        <Link
          key={beacon.id}
          href={`/${serviceKey}/beacons/${encodeURIComponent(beacon.id)}`}
          className={styles.linkCard}
        >
          <BeaconCard beacon={beacon} />
        </Link>
      ))}
    </div>
  );
}
