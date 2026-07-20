import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module.js";
import { MailEntity } from "./mail.entity.js";
import {
  MailsIngestController,
  StoredMailsController,
} from "./mails.controller.js";
import { MailsService } from "./mails.service.js";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([MailEntity])],
  controllers: [MailsIngestController, StoredMailsController],
  providers: [MailsService],
})
export class MailsModule {}
