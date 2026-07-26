import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("smtp_settings")
export class SmtpSettingsEntity {
  @PrimaryColumn({ type: "int" })
  id!: number;

  @Column({ type: "text" })
  host!: string;

  @Column({ type: "int" })
  port!: number;

  @Column({ type: "boolean" })
  secure!: boolean;

  @Column({ type: "boolean", default: false })
  requireTls!: boolean;

  @Column({ type: "text" })
  from!: string;

  @Column({ type: "text" })
  user!: string;

  @Column({ type: "text" })
  encryptedPassword!: string;

  @Column({ type: "text" })
  passwordIv!: string;

  @Column({ type: "text" })
  passwordTag!: string;

  @Column({ type: "timestamptz", default: () => "now()" })
  updatedAt!: Date;
}
