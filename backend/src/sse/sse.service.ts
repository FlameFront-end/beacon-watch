import { Injectable } from "@nestjs/common";
import { filter, Subject } from "rxjs";

import type { BeaconEntity } from "../beacons/beacon.entity.js";

type BeaconEvent = {
  event: "beacon";
  data: BeaconEntity;
};

export type VulnerabilityMonitoringEvent = {
  event:
    | "new_interesting_vulnerability"
    | "vulnerability_score_increased"
    | "public_poc_detected"
    | "vulnerability_added_to_kev"
    | "affected_versions_updated"
    | "vendor_patch_published"
    | "collector_failed";
  data: Record<string, unknown>;
};

export type DeliveryEvent = {
  event: "smtp_delivery";
  data: Record<string, unknown>;
};

@Injectable()
export class SseService {
  private readonly beaconStream = new Subject<BeaconEvent>();
  private readonly vulnerabilityMonitoringStream = new Subject<VulnerabilityMonitoringEvent>();
  private readonly deliveryStream = new Subject<DeliveryEvent>();

  readonly events$ = this.beaconStream.asObservable();
  readonly vulnerabilityMonitoringEvents$ = this.vulnerabilityMonitoringStream.asObservable();
  readonly deliveryEvents$ = this.deliveryStream.asObservable();

  eventsFor(serviceKey: string) {
    return this.events$.pipe(
      filter(({ data }) => data.serviceKey === serviceKey),
    );
  }

  emitBeacon(beacon: BeaconEntity): void {
    this.beaconStream.next({ event: "beacon", data: beacon });
  }

  emitVulnerabilityMonitoringEvent(event: VulnerabilityMonitoringEvent): void {
    this.vulnerabilityMonitoringStream.next(event);
  }

  emitDeliveryEvent(data: Record<string, unknown>): void {
    this.deliveryStream.next({ event: "smtp_delivery", data });
  }
}
