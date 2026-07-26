import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module.js";
import { MailEntity } from "./mail.entity.js";
import {
  MailsIngestController,
  StoredMailsController,
} from "./mails.controller.js";
import { MailsService } from "./mails.service.js";
import {
  MAIL_SENDER,
  MailSendingService,
} from "./mail-sending.service.js";
import { SmtpMailerService } from "./smtp-mailer.service.js";
import { SmtpSettingsController } from "./smtp-settings.controller.js";
import { SmtpSettingsService } from "./smtp-settings.service.js";
import { SmtpSettingsEntity } from "./smtp-settings.entity.js";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([MailEntity, SmtpSettingsEntity])],
  controllers: [MailsIngestController, StoredMailsController, SmtpSettingsController],
  providers: [
    MailsService,
    MailSendingService,
    SmtpMailerService,
    SmtpSettingsService,
    { provide: MAIL_SENDER, useExisting: SmtpMailerService },
  ],
})
export class MailsModule {}
