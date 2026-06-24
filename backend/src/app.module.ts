import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { BeaconsModule } from "./beacons/beacons.module.js";
import { BeaconEntity } from "./beacons/beacon.entity.js";
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
        entities: [BeaconEntity],
        synchronize: true,
        autoLoadEntities: true,
      }),
    }),
    BeaconsModule,
    SseModule,
  ],
})
export class AppModule {}
