import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { SseController } from "./sse.controller.js";
import { SseService } from "./sse.service.js";

@Module({
  imports: [AuthModule],
  controllers: [SseController],
  providers: [SseService],
  exports: [SseService],
})
export class SseModule {}
