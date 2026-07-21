import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import type {
  AcceptMailsResponse,
  ListMailsQuery,
  StoredMailDto,
} from "./dto/mail.dto.js";
import { MailsService } from "./mails.service.js";

@ApiTags("mails")
@Controller()
export class MailsIngestController {
  constructor(@Inject(MailsService) private readonly mailsService: MailsService) {}

  @Post("mails")
  acceptMany(@Body() body: unknown): Promise<AcceptMailsResponse> {
    return this.mailsService.acceptMany(body);
  }
}

@ApiTags("mails")
@Controller("api/mails")
export class StoredMailsController {
  constructor(@Inject(MailsService) private readonly mailsService: MailsService) {}

  @Get()
  @UseGuards(SessionAuthGuard)
  findAll(
    @Query("limit") limit?: unknown,
    @Query("offset") offset?: unknown,
  ): Promise<StoredMailDto[]> {
    return this.mailsService.findAll(parseListMailsQuery(limit, offset));
  }

  @Delete(":id")
  @HttpCode(204)
  @UseGuards(SessionAuthGuard)
  async deleteOne(@Param("id") id: string): Promise<void> {
    await this.mailsService.deleteOne(id);
  }

  @Delete()
  @HttpCode(204)
  @UseGuards(SessionAuthGuard)
  async deleteAll(): Promise<void> {
    await this.mailsService.deleteAll();
  }
}

function parseListMailsQuery(
  limit: unknown,
  offset: unknown,
): ListMailsQuery {
  return {
    limit: parseOptionalInteger(limit),
    offset: parseOptionalInteger(offset),
  };
}

function parseOptionalInteger(value: unknown): number | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
