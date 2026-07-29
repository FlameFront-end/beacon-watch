import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module.js";
import { SseModule } from "../sse/sse.module.js";
import { DeliveryEntity } from "./delivery.entity.js";
import { DeliveryEventEntity } from "./delivery-event.entity.js";
import {
  DeliveryAgentEventsController,
  DeliveryHistoryController,
} from "./delivery-history.controller.js";
import { DeliveryHistoryService } from "./delivery-history.service.js";
import { DeliveryRetentionService } from "./delivery-retention.service.js";
import { MailEntity } from "./mail.entity.js";
import {
  MailsIngestController,
  SmtpMailController,
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
  imports: [
    AuthModule,
    SseModule,
    TypeOrmModule.forFeature([
      MailEntity,
      SmtpSettingsEntity,
      DeliveryEntity,
      DeliveryEventEntity,
    ]),
  ],
  controllers: [
    MailsIngestController,
    StoredMailsController,
    SmtpMailController,
    SmtpSettingsController,
    DeliveryHistoryController,
    DeliveryAgentEventsController,
  ],
  providers: [
    MailsService,
    MailSendingService,
    SmtpMailerService,
    SmtpSettingsService,
    DeliveryHistoryService,
    DeliveryRetentionService,
    { provide: MAIL_SENDER, useExisting: SmtpMailerService },
  ],
})
export class MailsModule {}
