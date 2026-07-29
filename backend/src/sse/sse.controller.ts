import { Controller, Inject, Param, Sse, UseGuards } from "@nestjs/common";
import type { MessageEvent } from "@nestjs/common";
import { map, type Observable } from "rxjs";

import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { requireServiceCapability } from "../services/service-catalog.js";
import { SseService } from "./sse.service.js";

@Controller("api/services/:serviceKey/events")
export class SseController {
  constructor(@Inject(SseService) private readonly sseService: SseService) {}

  @Sse()
  @UseGuards(SessionAuthGuard)
  stream(@Param("serviceKey") serviceKey: string): Observable<MessageEvent> {
    const key = requireServiceCapability(serviceKey, "beacons");
    return this.sseService.eventsFor(key).pipe(
      map(({ event, data }): MessageEvent => ({
        type: event,
        data,
      })),
    );
  }
}

@Controller("api/admin/vulnerability-monitoring/events")
export class VulnerabilityMonitoringSseController {
  constructor(@Inject(SseService) private readonly sseService: SseService) {}

  @Sse()
  @UseGuards(SessionAuthGuard)
  stream(): Observable<MessageEvent> {
    return this.sseService.vulnerabilityMonitoringEvents$.pipe(
      map(({ event, data }): MessageEvent => ({
        type: event,
        data,
      })),
    );
  }
}

@Controller("api/smtp/deliveries/events")
export class DeliverySseController {
  constructor(@Inject(SseService) private readonly sseService: SseService) {}

  @Sse()
  @UseGuards(SessionAuthGuard)
  stream(): Observable<MessageEvent> {
    return this.sseService.deliveryEvents$.pipe(
      map(({ event, data }): MessageEvent => ({
        type: event,
        data,
      })),
    );
  }
}
