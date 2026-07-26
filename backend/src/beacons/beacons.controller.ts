import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import {
  requireServiceCapability,
  type ServiceKey,
} from "../services/service-catalog.js";
import type { BeaconEntity, BeaconType } from "./beacon.entity.js";
import { BeaconsService } from "./beacons.service.js";

@ApiTags("beacons")
@Controller("api/services/:serviceKey/beacons")
export class BeaconsController {
  constructor(
    @Inject(BeaconsService) private readonly beaconsService: BeaconsService,
  ) {}

  @Post()
  create(
    @Param("serviceKey") serviceKey: string,
    @Body() body: string,
  ): Promise<BeaconEntity> {
    return this.beaconsService.createFromPayload(
      readServiceKey(serviceKey),
      body,
    );
  }

  @Get()
  @UseGuards(SessionAuthGuard)
  findAll(
    @Param("serviceKey") serviceKey: string,
    @Query("type") type?: BeaconType,
  ): Promise<BeaconEntity[]> {
    return this.beaconsService.findAll(readServiceKey(serviceKey), type);
  }

  @Get(":id")
  @UseGuards(SessionAuthGuard)
  findById(
    @Param("serviceKey") serviceKey: string,
    @Param("id") id: string,
  ): Promise<BeaconEntity> {
    return this.beaconsService.findById(readServiceKey(serviceKey), id);
  }

  @Delete()
  @UseGuards(SessionAuthGuard)
  clearAll(@Param("serviceKey") serviceKey: string): Promise<void> {
    return this.beaconsService.clearAll(readServiceKey(serviceKey));
  }
}

function readServiceKey(serviceKey: string): ServiceKey {
  return requireServiceCapability(serviceKey, "beacons");
}
