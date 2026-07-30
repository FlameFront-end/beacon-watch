import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module.js";
import { CallbackController } from "./callback.controller.js";
import { CallbackEventEntity } from "./callback.entity.js";
import { CallbackService } from "./callback.service.js";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([CallbackEventEntity]),
  ],
  controllers: [CallbackController],
  providers: [CallbackService],
  exports: [CallbackService],
})
export class CallbackModule {}
