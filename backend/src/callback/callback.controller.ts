import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Logger,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";

import { Public } from "../auth/public.decorator.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { parseCallbackListQuery } from "./callback.dto.js";
import { CallbackService } from "./callback.service.js";

type CallbackRequest = Request & {
  readonly protocol: string;
  readonly originalUrl: string;
  readonly socket: {
    readonly remoteAddress?: string;
  };
};

@ApiTags("callbacks")
@Controller("api/callback")
export class CallbackController {
  private readonly logger = new Logger(CallbackController.name);

  constructor(
    @Inject(CallbackService)
    private readonly callbackService: CallbackService,
  ) {}

  @Post()
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: "Receive a public exploit callback" })
  @ApiBody({ required: false, description: "Any JSON or text payload" })
  @ApiResponse({ status: 200, description: "Callback accepted. Always returns OK." })
  async receive(
    @Req() request: CallbackRequest,
    @Body() body: unknown,
  ): Promise<{ ok: true }> {
    try {
      await this.callbackService.record({
        method: request.method,
        protocol: request.protocol,
        host: request.get("host") ?? "unknown",
        originalUrl: request.originalUrl,
        headers: request.headers,
        queryParams: request.query,
        body,
        socketRemoteAddress: request.socket.remoteAddress,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Unexpected callback receive failure: ${
          error instanceof Error ? error.stack ?? error.message : String(error)
        }`,
      );
    }
    return { ok: true };
  }

  @Get("status/latest")
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: "Get callback summary for the dashboard" })
  latestStatus() {
    return this.callbackService.latestStatus();
  }

  @Get()
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: "List callback events" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiQuery({ name: "sourceIp", required: false, type: String })
  @ApiQuery({ name: "from", required: false, type: String })
  @ApiQuery({ name: "to", required: false, type: String })
  @ApiQuery({ name: "sortBy", required: false, enum: ["timestamp", "sourceIp", "status"] })
  @ApiQuery({ name: "sortDirection", required: false, enum: ["ASC", "DESC"] })
  list(@Query() query: Record<string, unknown>) {
    return this.callbackService.list(parseCallbackListQuery(query));
  }

  @Get(":id")
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: "Get one callback event" })
  @ApiParam({ name: "id", type: String })
  findById(@Param("id") id: string) {
    return this.callbackService.findById(id);
  }

  @Delete(":id")
  @HttpCode(204)
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: "Delete one callback event" })
  @ApiParam({ name: "id", type: String })
  async deleteOne(@Param("id") id: string): Promise<void> {
    await this.callbackService.deleteOne(id);
  }

  @Delete()
  @HttpCode(204)
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: "Delete all callback events" })
  async deleteAll(): Promise<void> {
    await this.callbackService.deleteAll();
  }
}
