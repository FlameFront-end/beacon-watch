import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module.js";
import { SseModule } from "../sse/sse.module.js";
import { BeaconEntity } from "./beacon.entity.js";
import { BeaconsController } from "./beacons.controller.js";
import { BeaconsService } from "./beacons.service.js";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([BeaconEntity]), SseModule],
  controllers: [BeaconsController],
  providers: [BeaconsService],
  exports: [BeaconsService],
})
export class BeaconsModule {}
