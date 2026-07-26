import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

export type BeaconType = "loot" | "heartbeat";
export type HeartbeatState = "ONLINE" | "OFFLINE";

@Entity("beacons")
@Index("IDX_beacons_service_received", ["serviceKey", "receivedAt"])
export class BeaconEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", default: "owa" })
  serviceKey!: string;

  @Column({ type: "timestamptz", default: () => "now()" })
  receivedAt!: Date;

  @Column({ type: "enum", enum: ["loot", "heartbeat"] })
  type!: BeaconType;

  @Column({ type: "text", nullable: true })
  cookies!: string | null;

  @Column({ type: "varchar", nullable: true })
  mbxGuid!: string | null;

  @Column({ type: "varchar", nullable: true })
  forest!: string | null;

  @Column({ type: "varchar", nullable: true })
  heartbeat!: HeartbeatState | null;

  @Column({ type: "int", nullable: true })
  httpStatus!: number | null;

  @Column({ type: "jsonb" })
  raw!: Record<string, unknown>;
}
