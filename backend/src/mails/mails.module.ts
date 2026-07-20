import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { MailEntity } from "./mail.entity.js";
import { MailsController } from "./mails.controller.js";
import { MailsService } from "./mails.service.js";

@Module({
  imports: [TypeOrmModule.forFeature([MailEntity])],
  controllers: [MailsController],
  providers: [MailsService],
})
export class MailsModule {}
