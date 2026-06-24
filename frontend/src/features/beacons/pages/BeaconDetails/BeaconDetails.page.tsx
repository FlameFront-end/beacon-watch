import type { JSX } from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getBeacon } from "@/shared/api/beacons";
import type { Beacon } from "@/shared/model/beacon";
import { EmptyState, Panel } from "@/shared/kit";
import { formatLocalDateTime } from "@/shared/lib/format";

import { BeaconCard } from "../../components/BeaconCard";
import styles from "./BeaconDetails.module.scss";

export function BeaconDetailsPage(): JSX.Element {
  const { beaconId = "" } = useParams();
  const [beacon, setBeacon] = useState<Beacon | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void getBeacon(beaconId)
      .then((loadedBeacon) => {
        if (!isMounted) {
          return;
        }

        setBeacon(loadedBeacon);
      })
      .catch((loadError: unknown) => {
        if (!isMounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load beacon");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [beaconId]);

  if (isLoading) {
    return <EmptyState loading title="Loading beacon" description="Fetching the selected payload." />;
  }

  if (error || !beacon) {
    return (
      <EmptyState title="Beacon not found" description={error ?? "The requested beacon could not be loaded."}>
        <Link className={styles.backLink} to="/">
          Back to dashboard
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className={styles.page}>
      <Panel className={styles.meta}>
        <div>
          <div className={styles.label}>Received at</div>
          <div className={styles.value}>{formatLocalDateTime(beacon.receivedAt)}</div>
        </div>
        <div>
          <div className={styles.label}>Type</div>
          <div className={styles.value}>{beacon.type}</div>
        </div>
        <div>
          <div className={styles.label}>Beacon ID</div>
          <div className={styles.value}>{beacon.id}</div>
        </div>
      </Panel>

      <BeaconCard beacon={beacon} />
    </div>
  );
}
