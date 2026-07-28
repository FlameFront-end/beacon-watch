import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "./auth/auth.module.js";
import { AdminNotificationsModule } from "./admin-notifications/admin-notifications.module.js";
import { BeaconsModule } from "./beacons/beacons.module.js";
import { BeaconEntity } from "./beacons/beacon.entity.js";
import { InitialSchemaAndSmtpTls1785078000000 } from "./database/migrations/1785078000000-initial-schema-and-smtp-tls.js";
import { AddSocks5SmtpProxy1785090000000 } from "./database/migrations/1785090000000-add-socks5-smtp-proxy.js";
import { AddServiceScoping1785085200000 } from "./database/migrations/1785085200000-add-service-scoping.js";
import { AddVulnerabilityMonitoring1785100000000 } from "./database/migrations/1785100000000-add-vulnerability-monitoring.js";
import { LiveFirstVulnerabilityMonitoring1785110000000 } from "./database/migrations/1785110000000-live-first-vulnerability-monitoring.js";
import { BackfillGithubAdvisoryPackages1785211200000 } from "./database/migrations/1785211200000-backfill-github-advisory-packages.js";
import { RepairGithubAdvisoryNormalization1785301200000 } from "./database/migrations/1785301200000-repair-github-advisory-normalization.js";
import { BackfillVendorProductFieldSources1785310000000 } from "./database/migrations/1785310000000-backfill-vendor-product-field-sources.js";
import { AddCorporateXssWatchRules1785320000000 } from "./database/migrations/1785320000000-add-corporate-xss-watch-rules.js";
import { MailEntity } from "./mails/mail.entity.js";
import { SmtpSettingsEntity } from "./mails/smtp-settings.entity.js";
import { MailsModule } from "./mails/mails.module.js";
import { SseModule } from "./sse/sse.module.js";
import { VulnerabilityChangeLogEntity } from "./vulnerability-monitoring/entities/vulnerability-change-log.entity.js";
import { VulnerabilityCollectionRunEntity } from "./vulnerability-monitoring/entities/vulnerability-collection-run.entity.js";
import { VulnerabilityNotificationDeliveryEntity } from "./vulnerability-monitoring/entities/vulnerability-notification-delivery.entity.js";
import { VulnerabilityReferenceEntity } from "./vulnerability-monitoring/entities/vulnerability-reference.entity.js";
import { VulnerabilitySourceLockEntity } from "./vulnerability-monitoring/entities/vulnerability-source-lock.entity.js";
import { VulnerabilitySourceRecordEntity } from "./vulnerability-monitoring/entities/vulnerability-source-record.entity.js";
import { VulnerabilityWatchRuleEntity } from "./vulnerability-monitoring/entities/vulnerability-watch-rule.entity.js";
import { VulnerabilityEntity } from "./vulnerability-monitoring/entities/vulnerability.entity.js";
import { VulnerabilityMonitoringModule } from "./vulnerability-monitoring/vulnerability-monitoring.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../.env"],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get<string>("DB_HOST", "localhost"),
        port: Number(configService.get<string>("DB_PORT", "5432")),
        username: configService.get<string>("DB_USER", "beaconwatch"),
        password: configService.get<string>("DB_PASS", "beaconwatch"),
        database: configService.get<string>("DB_NAME", "beaconwatch"),
        entities: [
          BeaconEntity,
          MailEntity,
          SmtpSettingsEntity,
          VulnerabilityEntity,
          VulnerabilitySourceRecordEntity,
          VulnerabilityReferenceEntity,
          VulnerabilityWatchRuleEntity,
          VulnerabilityCollectionRunEntity,
          VulnerabilityChangeLogEntity,
          VulnerabilityNotificationDeliveryEntity,
          VulnerabilitySourceLockEntity,
        ],
        migrations: [
          InitialSchemaAndSmtpTls1785078000000,
          AddServiceScoping1785085200000,
          AddSocks5SmtpProxy1785090000000,
          AddVulnerabilityMonitoring1785100000000,
          LiveFirstVulnerabilityMonitoring1785110000000,
          BackfillGithubAdvisoryPackages1785211200000,
          RepairGithubAdvisoryNormalization1785301200000,
          BackfillVendorProductFieldSources1785310000000,
          AddCorporateXssWatchRules1785320000000,
        ],
        migrationsRun: true,
        synchronize: false,
        autoLoadEntities: true,
      }),
    }),
    AuthModule,
    AdminNotificationsModule,
    BeaconsModule,
    MailsModule,
    SseModule,
    VulnerabilityMonitoringModule,
  ],
})
export class AppModule {}
