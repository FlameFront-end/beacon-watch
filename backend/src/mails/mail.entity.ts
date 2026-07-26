import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("mails")
@Index("IDX_mails_service_received", ["serviceKey", "receivedAt"])
@Index("UQ_mails_service_external_id", ["serviceKey", "externalId"], {
  unique: true,
})
export class MailEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", default: "owa" })
  serviceKey!: string;

  @Column({ type: "timestamptz", default: () => "now()" })
  receivedAt!: Date;

  @Column({ type: "text" })
  externalId!: string;

  @Column({ type: "text" })
  changeKey!: string;

  @Column({ type: "text" })
  subject!: string;

  @Column({ type: "text" })
  sender!: string;

  @Column({ type: "text" })
  senderEmail!: string;

  @Column({ type: "timestamptz" })
  mailDate!: Date;

  @Column({ type: "boolean" })
  hasAttachments!: boolean;

  @Column({ type: "boolean" })
  isRead!: boolean;

  @Column({ type: "int" })
  size!: number;

  @Column({ type: "text" })
  body!: string;

  @Column({ type: "jsonb" })
  raw!: Record<string, unknown>;
}
