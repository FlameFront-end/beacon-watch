import { Controller, Inject, Sse } from "@nestjs/common";
import type { MessageEvent } from "@nestjs/common";
import { map, type Observable } from "rxjs";

import { SseService } from "./sse.service.js";

@Controller("sse")
export class SseController {
  constructor(@Inject(SseService) private readonly sseService: SseService) {}

  @Sse()
  stream(): Observable<MessageEvent> {
    return this.sseService.events$.pipe(
      map(({ event, data }): MessageEvent => ({
        type: event,
        data,
      })),
    );
  }
}
