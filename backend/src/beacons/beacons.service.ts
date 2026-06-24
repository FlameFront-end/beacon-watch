import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";

import type { BeaconType } from "./beacon.entity.js";
import { BeaconEntity } from "./beacon.entity.js";
import type { CreateBeaconDto } from "./dto/create-beacon.dto.js";
import { SseService } from "../sse/sse.service.js";

type BeaconPayload = Record<string, unknown>;

@Injectable()
export class BeaconsService {
  constructor(
    @InjectRepository(BeaconEntity)
    private readonly beaconRepository: Repository<BeaconEntity>,
    @Inject(SseService)
    private readonly sseService: SseService,
  ) {}

  async createFromPayload(payload: unknown): Promise<BeaconEntity> {
    const beaconPayload = this.parsePayload(payload);
    const mapped = this.mapPayload(beaconPayload);
    const mbxGuid = mapped.mbxGuid ?? null;

    if (mbxGuid) {
      const existing = await this.beaconRepository.findOne({
        where: { mbxGuid, type: mapped.type },
        order: { receivedAt: "DESC" },
      });

      if (existing) {
        Object.assign(existing, mapped);
        existing.receivedAt = new Date();
        const updated = await this.beaconRepository.save(existing);
        this.sseService.emitBeacon(updated);
        return updated;
      }
    }

    const beacon = this.beaconRepository.create(mapped);
    const savedBeacon = await this.beaconRepository.save(beacon);
    this.sseService.emitBeacon(savedBeacon);
    return savedBeacon;
  }

  async findAll(type?: BeaconType): Promise<BeaconEntity[]> {
    const where = type ? { type } : {};
    return this.beaconRepository.find({
      where,
      order: { receivedAt: "DESC" },
    });
  }

  async findById(id: string): Promise<BeaconEntity> {
    const beacon = await this.beaconRepository.findOne({ where: { id } });
    if (!beacon) {
      throw new NotFoundException(`Beacon ${id} not found`);
    }

    return beacon;
  }

  async clearAll(): Promise<void> {
    await this.beaconRepository.clear();
  }

  private parsePayload(payload: unknown): BeaconPayload {
    if (typeof payload === "string") {
      const trimmed = payload.trim();
      if (!trimmed) {
        return { heartbeat: "ONLINE" };
      }

      try {
        const parsed = JSON.parse(trimmed);
        return this.assertRecord(parsed);
      } catch {
        return { heartbeat: "ONLINE" };
      }
    }

    if (!payload || (typeof payload === "object" && Object.keys(payload as object).length === 0)) {
      return { heartbeat: "ONLINE" };
    }

    return this.assertRecord(payload);
  }

  private assertRecord(payload: unknown): BeaconPayload {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new BadRequestException("Beacon payload must be a JSON object");
    }

    return payload as BeaconPayload;
  }

  private mapPayload(payload: BeaconPayload): Partial<CreateBeaconDto> & {
    raw: BeaconPayload;
    type: BeaconType;
  } {
    const type: BeaconType = Object.hasOwn(payload, "heartbeat")
      ? "heartbeat"
      : "loot";

    return {
      type,
      cookies: this.readOptionalString(payload.cookies),
      mbxGuid: this.readOptionalString(payload.mbxGuid ?? payload.mbx),
      forest: this.readOptionalString(payload.forest),
      heartbeat: this.readHeartbeat(payload.heartbeat),
      httpStatus: this.readOptionalNumber(payload.httpStatus ?? payload.status),
      raw: payload,
    };
  }

  private readOptionalString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim().length > 0
      ? value
      : undefined;
  }

  private readOptionalNumber(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }

  private readHeartbeat(value: unknown): "ONLINE" | "OFFLINE" | undefined {
    return value === "ONLINE" || value === "OFFLINE" ? value : undefined;
  }
}
