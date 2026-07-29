import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { FindOptionsWhere, Repository } from "typeorm";

import { SseService } from "../sse/sse.service.js";
import {
  DELIVERY_STATUSES,
  DeliveryEntity,
  type DeliveryStatus,
} from "./delivery.entity.js";
import { DeliveryEventEntity } from "./delivery-event.entity.js";

export type CreateDeliveryInput = {
  readonly messageId: string;
  readonly sender: string;
  readonly recipient: string;
  readonly subject: string;
  readonly preview: string;
  readonly messageSize: number;
};

export type DeliveryEventInput = {
  readonly deliveryId?: string;
  readonly messageId?: string;
  readonly eventId: string;
  readonly source: string;
  readonly status: DeliveryStatus;
  readonly queueId?: string;
  readonly mxHost?: string;
  readonly smtpCode?: number;
  readonly errorCategory?: string;
  readonly message?: string;
  readonly details?: Record<string, unknown>;
};

const TERMINAL_STATUSES = new Set<DeliveryStatus>([
  "delivered",
  "bounced",
  "failed",
  "cancelled",
]);

@Injectable()
export class DeliveryHistoryService {
  constructor(
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepository: Repository<DeliveryEntity>,
    @InjectRepository(DeliveryEventEntity)
    private readonly eventRepository: Repository<DeliveryEventEntity>,
    private readonly sseService: SseService,
  ) {}

  async create(input: CreateDeliveryInput): Promise<DeliveryEntity> {
    const delivery = this.deliveryRepository.create({
      ...input,
      status: "created",
      attemptCount: 0,
      queueId: null,
      errorCategory: null,
      errorMessage: null,
      metadata: {},
      completedAt: null,
    });
    const saved = await this.deliveryRepository.save(delivery);
    this.emit(saved);
    return saved;
  }

  async recordEvent(input: DeliveryEventInput): Promise<DeliveryEntity> {
    const existingEvent = await this.eventRepository.findOne({
      where: { source: input.source, eventId: input.eventId },
    });
    const delivery = input.deliveryId
      ? await this.findById(input.deliveryId)
      : await this.findByMessageId(input.messageId);
    if (existingEvent) {
      return delivery;
    }

    await this.eventRepository.save(
      this.eventRepository.create({
        deliveryId: delivery.id,
        eventId: input.eventId,
        source: input.source,
        status: input.status,
        queueId: input.queueId ?? null,
        mxHost: input.mxHost ?? null,
        smtpCode: input.smtpCode ?? null,
        errorCategory: input.errorCategory ?? null,
        message: input.message ?? null,
        details: input.details ?? {},
      }),
    );

    if (TERMINAL_STATUSES.has(delivery.status)) {
      return delivery;
    }

    delivery.status = input.status;
    delivery.updatedAt = new Date();
    delivery.queueId = input.queueId ?? delivery.queueId;
    delivery.attemptCount = Math.max(delivery.attemptCount, input.details?.attempt as number ?? 0);
    const hasDeliveryError = input.status === "deferred" || input.status === "bounced" || input.status === "failed";
    delivery.errorCategory = hasDeliveryError ? input.errorCategory ?? null : null;
    delivery.errorMessage = hasDeliveryError ? input.message ?? null : null;
    if (TERMINAL_STATUSES.has(input.status)) {
      delivery.completedAt = new Date();
    }

    const saved = await this.deliveryRepository.save(delivery);
    this.emit(saved, input);
    return saved;
  }

  async list(options: {
    readonly status?: DeliveryStatus;
    readonly recipient?: string;
    readonly offset: number;
    readonly limit: number;
  }): Promise<{ readonly items: DeliveryEntity[]; readonly total: number }> {
    const where: FindOptionsWhere<DeliveryEntity> = {};
    if (options.status) {
      where.status = options.status;
    }
    if (options.recipient) {
      where.recipient = options.recipient;
    }
    const [items, total] = await this.deliveryRepository.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: options.offset,
      take: options.limit,
    });
    return { items, total };
  }

  async details(id: string): Promise<{
    readonly delivery: DeliveryEntity;
    readonly events: DeliveryEventEntity[];
  }> {
    const delivery = await this.findById(id);
    const events = await this.eventRepository.find({
      where: { deliveryId: id },
      order: { createdAt: "ASC" },
    });
    return { delivery, events };
  }

  async cancel(id: string): Promise<DeliveryEntity> {
    const delivery = await this.findById(id);
    if (delivery.status !== "queued" && delivery.status !== "deferred") {
      throw new BadRequestException("Only queued or deferred deliveries can be cancelled");
    }
    return this.recordEvent({
      deliveryId: id,
      eventId: `cancel-${Date.now()}`,
      source: "beaconwatch",
      status: "cancelled",
      message: "Cancelled by administrator",
    });
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.eventRepository.delete({ deliveryId: id });
    await this.deliveryRepository.delete({ id });
  }

  async deleteAll(): Promise<void> {
    await this.eventRepository.clear();
    await this.deliveryRepository.clear();
  }

  private async findById(id: string): Promise<DeliveryEntity> {
    const delivery = await this.deliveryRepository.findOne({ where: { id } });
    if (!delivery) {
      throw new NotFoundException("Delivery not found");
    }
    return delivery;
  }

  private async findByMessageId(messageId: string | undefined): Promise<DeliveryEntity> {
    if (!messageId) {
      throw new NotFoundException("Delivery identifier is required");
    }
    const delivery = await this.deliveryRepository.findOne({ where: { messageId } });
    if (!delivery) {
      throw new NotFoundException("Delivery not found");
    }
    return delivery;
  }

  private emit(delivery: DeliveryEntity, event?: DeliveryEventInput): void {
    this.sseService.emitDeliveryEvent({
      deliveryId: delivery.id,
      status: delivery.status,
      queueId: delivery.queueId,
      eventId: event?.eventId,
      updatedAt: delivery.updatedAt,
    });
  }
}

export function isDeliveryStatus(value: string): value is DeliveryStatus {
  return (DELIVERY_STATUSES as readonly string[]).includes(value);
}
