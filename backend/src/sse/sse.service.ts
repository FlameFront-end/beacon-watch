import { Injectable } from "@nestjs/common";
import { Subject } from "rxjs";

import type { BeaconEntity } from "../beacons/beacon.entity.js";

type BeaconEvent = {
  event: "beacon";
  data: BeaconEntity;
};

@Injectable()
export class SseService {
  private readonly beaconStream = new Subject<BeaconEvent>();

  readonly events$ = this.beaconStream.asObservable();

  emitBeacon(beacon: BeaconEntity): void {
    this.beaconStream.next({ event: "beacon", data: beacon });
  }
}
