import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type CallbackMethod = "GET" | "POST";
export type CallbackStatus = "received" | "processed" | "error";

export const CALLBACK_SOURCE_IP_MAX_LENGTH = 128;
export const CALLBACK_METHOD_MAX_LENGTH = 8;
export const CALLBACK_STATUS_MAX_LENGTH = 16;

@Entity("callback_events")
@Index("IDX_callback_events_timestamp", ["timestamp"])
@Index("IDX_callback_events_source_ip", ["sourceIp"])
@Index("IDX_callback_events_status", ["status"])
export class CallbackEventEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "timestamptz" })
  timestamp!: Date;

  @Column({ type: "varchar", length: CALLBACK_SOURCE_IP_MAX_LENGTH })
  sourceIp!: string;

  @Column({ type: "text", nullable: true })
  userAgent!: string | null;

  @Column({ type: "varchar", length: CALLBACK_METHOD_MAX_LENGTH })
  method!: CallbackMethod;

  @Column({ type: "text" })
  url!: string;

  @Column({ type: "jsonb" })
  headers!: Record<string, string | string[]>;

  @Column({ type: "jsonb" })
  queryParams!: Record<string, unknown>;

  @Column({ type: "text", nullable: true })
  body!: string | null;

  @Column({ type: "varchar", length: CALLBACK_STATUS_MAX_LENGTH, default: "received" })
  status!: CallbackStatus;

  @Column({ type: "timestamptz", nullable: true })
  processedAt!: Date | null;

  @Column({ type: "text", nullable: true })
  targetId!: string | null;

  @Column({ type: "text", nullable: true })
  payload!: string | null;
}
