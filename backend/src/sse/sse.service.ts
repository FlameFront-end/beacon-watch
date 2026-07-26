import { Injectable } from "@nestjs/common";
import { filter, Subject } from "rxjs";

import type { BeaconEntity } from "../beacons/beacon.entity.js";

type BeaconEvent = {
  event: "beacon";
  data: BeaconEntity;
};

@Injectable()
export class SseService {
  private readonly beaconStream = new Subject<BeaconEvent>();

  readonly events$ = this.beaconStream.asObservable();

  eventsFor(serviceKey: string) {
    return this.events$.pipe(
      filter(({ data }) => data.serviceKey === serviceKey),
    );
  }

  emitBeacon(beacon: BeaconEntity): void {
    this.beaconStream.next({ event: "beacon", data: beacon });
  }
}
