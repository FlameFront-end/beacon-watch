import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("smtp_delivery_events")
@Index("IDX_smtp_delivery_events_delivery_time", ["deliveryId", "createdAt"])
@Index("UQ_smtp_delivery_events_source_id", ["source", "eventId"], { unique: true })
export class DeliveryEventEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  deliveryId!: string;

  @Column({ type: "text" })
  eventId!: string;

  @Column({ type: "text" })
  source!: string;

  @Column({ type: "varchar", length: 32 })
  status!: string;

  @Column({ type: "text", nullable: true })
  queueId!: string | null;

  @Column({ type: "text", nullable: true })
  mxHost!: string | null;

  @Column({ type: "int", nullable: true })
  smtpCode!: number | null;

  @Column({ type: "text", nullable: true })
  errorCategory!: string | null;

  @Column({ type: "text", nullable: true })
  message!: string | null;

  @Column({ type: "jsonb", default: {} })
  details!: Record<string, unknown>;

  @Column({ type: "timestamptz", default: () => "now()" })
  createdAt!: Date;
}
