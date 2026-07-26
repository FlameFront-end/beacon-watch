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
import {
  requireRegisteredService,
  type ServiceKey,
} from "../services/service-catalog.js";
import type {
  AcceptMailsResponse,
  ListMailsQuery,
  StoredMailDto,
} from "./dto/mail.dto.js";
import { MailsService } from "./mails.service.js";
import { MailSendingService } from "./mail-sending.service.js";

@ApiTags("mails")
@Controller("api/services/:serviceKey/emails")
export class MailsIngestController {
  constructor(@Inject(MailsService) private readonly mailsService: MailsService) {}

  @Post()
  acceptMany(
    @Param("serviceKey") serviceKey: string,
    @Body() body: unknown,
  ): Promise<AcceptMailsResponse> {
    return this.mailsService.acceptMany(readServiceKey(serviceKey), body);
  }
}

@ApiTags("emails")
@Controller("api/services/:serviceKey/emails")
export class StoredMailsController {
  constructor(@Inject(MailsService) private readonly mailsService: MailsService) {}

  @Get()
  @UseGuards(SessionAuthGuard)
  findAll(
    @Param("serviceKey") serviceKey: string,
    @Query("limit") limit?: unknown,
    @Query("offset") offset?: unknown,
  ): Promise<StoredMailDto[]> {
    return this.mailsService.findAll(
      readServiceKey(serviceKey),
      parseListMailsQuery(limit, offset),
    );
  }

  @Delete(":id")
  @HttpCode(204)
  @UseGuards(SessionAuthGuard)
  async deleteOne(
    @Param("serviceKey") serviceKey: string,
    @Param("id") id: string,
  ): Promise<void> {
    await this.mailsService.deleteOne(readServiceKey(serviceKey), id);
  }

  @Delete()
  @HttpCode(204)
  @UseGuards(SessionAuthGuard)
  async deleteAll(@Param("serviceKey") serviceKey: string): Promise<void> {
    await this.mailsService.deleteAll(readServiceKey(serviceKey));
  }
}

@ApiTags("smtp")
@Controller("api/smtp")
@UseGuards(SessionAuthGuard)
export class SmtpMailController {
  constructor(
    @Inject(MailSendingService)
    private readonly mailSendingService: MailSendingService,
  ) {}

  @Post("send")
  @HttpCode(204)
  async send(@Body() body: unknown): Promise<void> {
    await this.mailSendingService.send(body);
  }
}

function readServiceKey(serviceKey: string): ServiceKey {
  return requireRegisteredService(serviceKey).key;
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
