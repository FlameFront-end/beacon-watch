import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CronJob } from "cron";
import type { Repository } from "typeorm";

import { DeliveryEntity } from "./delivery.entity.js";

const DEFAULT_RETENTION_DAYS = 90;
const DEFAULT_ERROR_RETENTION_DAYS = 180;

const ERROR_STATUSES = ["bounced", "failed", "stale"] as const;

@Injectable()
export class DeliveryRetentionService implements OnModuleInit {
  private readonly logger = new Logger(DeliveryRetentionService.name);

  constructor(
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepository: Repository<DeliveryEntity>,
  ) {}

  onModuleInit(): void {
    const job = new CronJob("0 3 * * *", () => {
      void this.removeExpiredDeliveries().catch((error: unknown) => {
        this.logger.error("SMTP delivery retention failed", error);
      });
    });
    job.start();
    this.logger.log("Scheduled SMTP delivery retention for 03:00");
  }

  async removeExpiredDeliveries(now = new Date()): Promise<number> {
    const normalCutoff = subtractDays(now, readDays("SMTP_DELIVERY_RETENTION_DAYS", DEFAULT_RETENTION_DAYS));
    const errorCutoff = subtractDays(
      now,
      readDays("SMTP_DELIVERY_ERROR_RETENTION_DAYS", DEFAULT_ERROR_RETENTION_DAYS),
    );
    const result = await this.deliveryRepository
      .createQueryBuilder()
      .delete()
      .from(DeliveryEntity)
      .where(
        `(("status" IN (:...errorStatuses) AND "createdAt" < :errorCutoff)
          OR ("status" NOT IN (:...errorStatuses) AND "createdAt" < :normalCutoff))`,
        { errorStatuses: ERROR_STATUSES, errorCutoff, normalCutoff },
      )
      .execute();
    const removed = result.affected ?? 0;
    if (removed > 0) {
      this.logger.log(`Removed ${removed} expired SMTP deliveries`);
    }
    return removed;
  }
}

function readDays(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}
