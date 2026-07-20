import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "./auth/auth.module.js";
import { BeaconsModule } from "./beacons/beacons.module.js";
import { BeaconEntity } from "./beacons/beacon.entity.js";
import { MailEntity } from "./mails/mail.entity.js";
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
        entities: [BeaconEntity, MailEntity],
        synchronize: true,
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
