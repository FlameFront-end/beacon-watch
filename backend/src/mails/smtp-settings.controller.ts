import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";

import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import {
  SmtpSettingsService,
  type PublicSmtpSettings,
} from "./smtp-settings.service.js";

@Controller("api/settings/smtp")
@UseGuards(SessionAuthGuard)
export class SmtpSettingsController {
  constructor(private readonly smtpSettingsService: SmtpSettingsService) {}

  @Get()
  get(): Promise<PublicSmtpSettings> {
    return this.smtpSettingsService.getPublic();
  }

  @Put()
  update(@Body() body: unknown): Promise<PublicSmtpSettings> {
    return this.smtpSettingsService.update(body);
  }
}
