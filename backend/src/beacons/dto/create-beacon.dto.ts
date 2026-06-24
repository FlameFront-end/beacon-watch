import { ApiPropertyOptional } from "@nestjs/swagger";

import type { HeartbeatState } from "../beacon.entity.js";

export class CreateBeaconDto {
  @ApiPropertyOptional({
    example: "PrivateComputer=true; X-OWA-CANARY=...",
  })
  cookies?: string;

  @ApiPropertyOptional({ example: "4af1441f-0000-0000-0000-000000000000" })
  mbxGuid?: string;

  @ApiPropertyOptional({ example: "cvelab.local" })
  forest?: string;

  @ApiPropertyOptional({ enum: ["ONLINE", "OFFLINE"] })
  heartbeat?: HeartbeatState;

  @ApiPropertyOptional({ example: 200 })
  httpStatus?: number;

  [key: string]: unknown;
}
