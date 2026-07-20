import { Controller, Inject, Sse, UseGuards } from "@nestjs/common";
import type { MessageEvent } from "@nestjs/common";
import { map, type Observable } from "rxjs";

import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { SseService } from "./sse.service.js";

@Controller("sse")
export class SseController {
  constructor(@Inject(SseService) private readonly sseService: SseService) {}

  @Sse()
  @UseGuards(SessionAuthGuard)
  stream(): Observable<MessageEvent> {
    return this.sseService.events$.pipe(
      map(({ event, data }): MessageEvent => ({
        type: event,
        data,
      })),
    );
  }
}
