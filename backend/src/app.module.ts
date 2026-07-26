import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "./auth/auth.module.js";
import { BeaconsModule } from "./beacons/beacons.module.js";
import { BeaconEntity } from "./beacons/beacon.entity.js";
import { InitialSchemaAndSmtpTls1785078000000 } from "./database/migrations/1785078000000-initial-schema-and-smtp-tls.js";
import { AddServiceScoping1785085200000 } from "./database/migrations/1785085200000-add-service-scoping.js";
import { MailEntity } from "./mails/mail.entity.js";
import { SmtpSettingsEntity } from "./mails/smtp-settings.entity.js";
import { MailsModule } from "./mails/mails.module.js";
import { SseModule } from "./sse/sse.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../.env"],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get<string>("DB_HOST", "localhost"),
        port: Number(configService.get<string>("DB_PORT", "5432")),
        username: configService.get<string>("DB_USER", "beaconwatch"),
        password: configService.get<string>("DB_PASS", "beaconwatch"),
        database: configService.get<string>("DB_NAME", "beaconwatch"),
        entities: [BeaconEntity, MailEntity, SmtpSettingsEntity],
        migrations: [
          InitialSchemaAndSmtpTls1785078000000,
          AddServiceScoping1785085200000,
        ],
        migrationsRun: true,
        synchronize: false,
        autoLoadEntities: true,
      }),
    }),
    AuthModule,
    BeaconsModule,
    MailsModule,
    SseModule,
  ],
})
export class AppModule {}
