import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import type { BeaconEntity, BeaconType } from "./beacon.entity.js";
import { BeaconsService } from "./beacons.service.js";

@ApiTags("beacons")
@Controller("beacons")
export class BeaconsController {
  constructor(
    @Inject(BeaconsService) private readonly beaconsService: BeaconsService,
  ) {}

  @Post()
  create(@Body() body: string): Promise<BeaconEntity> {
    return this.beaconsService.createFromPayload(body);
  }

  @Get()
  findAll(@Query("type") type?: BeaconType): Promise<BeaconEntity[]> {
    return this.beaconsService.findAll(type);
  }

  @Get(":id")
  findById(@Param("id") id: string): Promise<BeaconEntity> {
    return this.beaconsService.findById(id);
  }

  @Delete()
  clearAll(): Promise<void> {
    return this.beaconsService.clearAll();
  }
}
