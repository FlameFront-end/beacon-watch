import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import {
  DeliverySseController,
  SseController,
  VulnerabilityMonitoringSseController,
} from "./sse.controller.js";
import { SseService } from "./sse.service.js";

@Module({
  imports: [AuthModule],
  controllers: [SseController, VulnerabilityMonitoringSseController, DeliverySseController],
  providers: [SseService],
  exports: [SseService],
})
export class SseModule {}
