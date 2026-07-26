import { Controller, Inject, Param, Sse, UseGuards } from "@nestjs/common";
import type { MessageEvent } from "@nestjs/common";
import { map, type Observable } from "rxjs";

import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { requireRegisteredService } from "../services/service-catalog.js";
import { SseService } from "./sse.service.js";

@Controller("api/services/:serviceKey/events")
export class SseController {
  constructor(@Inject(SseService) private readonly sseService: SseService) {}

  @Sse()
  @UseGuards(SessionAuthGuard)
  stream(@Param("serviceKey") serviceKey: string): Observable<MessageEvent> {
    const service = requireRegisteredService(serviceKey);
    return this.sseService.eventsFor(service.key).pipe(
      map(({ event, data }): MessageEvent => ({
        type: event,
        data,
      })),
    );
  }
}
