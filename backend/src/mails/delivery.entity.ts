import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

export const DELIVERY_STATUSES = [
  "created",
  "submitting",
  "accepted",
  "queued",
  "retrying",
  "delivered",
  "deferred",
  "bounced",
  "failed",
  "cancelled",
  "stale",
  "sync_pending",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

@Entity("smtp_deliveries")
@Index("IDX_smtp_deliveries_status_created", ["status", "createdAt"])
@Index("IDX_smtp_deliveries_recipient_created", ["recipient", "createdAt"])
@Index("UQ_smtp_deliveries_message_id", ["messageId"], { unique: true })
export class DeliveryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 32 })
  status!: DeliveryStatus;

  @Column({ type: "text" })
  messageId!: string;

  @Column({ type: "text" })
  sender!: string;

  @Column({ type: "text" })
  recipient!: string;

  @Column({ type: "text" })
  subject!: string;

  @Column({ type: "text" })
  preview!: string;

  @Column({ type: "int" })
  messageSize!: number;

  @Column({ type: "int", default: 0 })
  attemptCount!: number;

  @Column({ type: "text", nullable: true })
  queueId!: string | null;

  @Column({ type: "text", nullable: true })
  errorCategory!: string | null;

  @Column({ type: "text", nullable: true })
  errorMessage!: string | null;

  @Column({ type: "jsonb", default: {} })
  metadata!: Record<string, unknown>;

  @Column({ type: "timestamptz", default: () => "now()" })
  createdAt!: Date;

  @Column({ type: "timestamptz", default: () => "now()" })
  updatedAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  completedAt!: Date | null;
}
