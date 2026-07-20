import { Body, Controller, Inject, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import type { AcceptMailsResponse } from "./dto/mail.dto.js";
import { MailsService } from "./mails.service.js";

@ApiTags("mails")
@Controller("mails")
export class MailsController {
  constructor(@Inject(MailsService) private readonly mailsService: MailsService) {}

  @Post()
  acceptMany(@Body() body: unknown): Promise<AcceptMailsResponse> {
    return this.mailsService.acceptMany(body);
  }
}
