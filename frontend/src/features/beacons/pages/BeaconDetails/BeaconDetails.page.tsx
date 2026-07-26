import type { JSX } from "react";
import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";

import { getBeacon } from "@/shared/api/beacons";
import type { ServiceKey } from "@/shared/config/services";
import type { Beacon } from "@/shared/model/beacon";
import { EmptyState, Panel } from "@/shared/kit";
import { formatLocalDateTime } from "@/shared/lib/format";

import { BeaconCard } from "../../components/BeaconCard";
import styles from "./BeaconDetails.module.scss";

type BeaconDetailsPageProps = {
  readonly serviceKey: ServiceKey;
};

export function BeaconDetailsPage({ serviceKey }: BeaconDetailsPageProps): JSX.Element {
  const [, params] = useRoute(`/${serviceKey}/beacons/:beaconId`);
  const beaconId = params?.beaconId ?? "";
  const [beacon, setBeacon] = useState<Beacon | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void getBeacon(serviceKey, beaconId)
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
  }, [beaconId, serviceKey]);

  if (isLoading) {
    return <EmptyState loading title="Loading beacon" description="Fetching the selected payload." />;
  }

  if (error || !beacon) {
    return (
      <EmptyState title="Beacon not found" description={error ?? "The requested beacon could not be loaded."}>
        <Link className={styles.backLink} href={`/${serviceKey}/beacons`}>
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
