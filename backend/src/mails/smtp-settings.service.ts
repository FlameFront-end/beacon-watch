import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";

import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";

import { SmtpSettingsEntity } from "./smtp-settings.entity.js";

export type SmtpSettings = {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly requireTls: boolean;
  readonly from: string;
  readonly user: string;
  readonly password: string;
  readonly proxyHost: string;
  readonly proxyPort: number;
  readonly proxyUser: string;
  readonly proxyPassword: string;
};

export type PublicSmtpSettings = Omit<SmtpSettings, "password" | "proxyPassword"> & {
  readonly hasPassword: boolean;
  readonly hasProxyPassword: boolean;
};

const SETTINGS_ID = 1;
const CIPHER_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

@Injectable()
export class SmtpSettingsService {
  private loadedSettings: Promise<SmtpSettings> | null = null;

  constructor(
    @InjectRepository(SmtpSettingsEntity)
    private readonly settingsRepository: Pick<
      Repository<SmtpSettingsEntity>,
      "findOne" | "create" | "save"
    >,
    private readonly configService: ConfigService,
  ) {}

  async get(): Promise<SmtpSettings> {
    if (this.loadedSettings) {
      return this.loadedSettings;
    }

    const loadingSettings = this.loadSettings();
    this.loadedSettings = loadingSettings;

    try {
      return await loadingSettings;
    } catch (error: unknown) {
      if (this.loadedSettings === loadingSettings) {
        this.loadedSettings = null;
      }
      throw error;
    }
  }

  async getPublic(): Promise<PublicSmtpSettings> {
    const { password, proxyPassword, ...settings } = await this.get();
    return {
      ...settings,
      hasPassword: Boolean(password),
      hasProxyPassword: Boolean(proxyPassword),
    };
  }

  async update(payload: unknown): Promise<PublicSmtpSettings> {
    const input = parseSettings(payload);
    const current = await this.get();
    const settings: SmtpSettings = {
      ...input,
      password: resolvePassword(current, input.user, input.password),
      proxyPassword: resolveProxyPassword(
        current,
        input.proxyHost,
        input.proxyUser,
        input.proxyPassword,
      ),
    };
    validateSettings(settings, (message) => new BadRequestException(message));

    await this.settingsRepository.save(this.toEntity(settings));
    this.loadedSettings = Promise.resolve(settings);
    return this.getPublic();
  }

  private async loadSettings(): Promise<SmtpSettings> {
    const stored = await this.settingsRepository.findOne({ where: { id: SETTINGS_ID } });
    if (!stored) {
      return this.getEnvironmentSettings();
    }

    return {
      host: stored.host,
      port: stored.port,
      secure: stored.secure,
      requireTls: stored.requireTls ?? false,
      from: stored.from,
      user: stored.user,
      password: decryptPassword(this.getEncryptionKey(), stored),
      proxyHost: stored.proxyHost,
      proxyPort: stored.proxyPort,
      proxyUser: stored.proxyUser,
      proxyPassword: decryptProxyPassword(this.getEncryptionKey(), stored),
    };
  }

  private getEnvironmentSettings(): SmtpSettings {
    const settings: SmtpSettings = {
      host: this.configService.get<string>("SMTP_HOST", "localhost"),
      port: parsePort(this.configService.get<string>("SMTP_PORT")),
      secure: this.configService.get<string>("SMTP_SECURE", "false") === "true",
      requireTls:
        this.configService.get<string>("SMTP_REQUIRE_TLS", "false") === "true",
      from: this.configService.get<string>("SMTP_FROM", ""),
      user: this.configService.get<string>("SMTP_USER", ""),
      password: this.configService.get<string>("SMTP_PASSWORD", ""),
      proxyHost: this.configService.get<string>("SMTP_SOCKS5_HOST", ""),
      proxyPort: parseProxyPort(this.configService.get<string>("SMTP_SOCKS5_PORT")),
      proxyUser: this.configService.get<string>("SMTP_SOCKS5_USER", ""),
      proxyPassword: this.configService.get<string>("SMTP_SOCKS5_PASSWORD", ""),
    };
    validateSettings(settings, (message) => new Error(message));
    return settings;
  }

  private toEntity(settings: SmtpSettings): SmtpSettingsEntity {
    const encrypted = encryptPassword(this.getEncryptionKey(), settings.password);
    const encryptedProxy = encryptPassword(
      this.getEncryptionKey(),
      settings.proxyPassword,
    );
    return this.settingsRepository.create({
      id: SETTINGS_ID,
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      requireTls: settings.requireTls,
      from: settings.from,
      user: settings.user,
      encryptedPassword: encrypted.value,
      passwordIv: encrypted.iv,
      passwordTag: encrypted.tag,
      proxyHost: settings.proxyHost,
      proxyPort: settings.proxyPort,
      proxyUser: settings.proxyUser,
      encryptedProxyPassword: encryptedProxy.value,
      proxyPasswordIv: encryptedProxy.iv,
      proxyPasswordTag: encryptedProxy.tag,
      updatedAt: new Date(),
    });
  }

  private getEncryptionKey(): Buffer {
    const secret = this.configService.get<string>("SMTP_SETTINGS_ENCRYPTION_KEY");
    if (!secret) {
      throw new Error("SMTP_SETTINGS_ENCRYPTION_KEY is required");
    }

    return createHash("sha256").update(secret, "utf8").digest();
  }
}

function parseSettings(payload: unknown): Omit<SmtpSettings, "password"> & { password: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new BadRequestException("SMTP settings must be an object");
  }

  const value = payload as Record<string, unknown>;
  const host = readString(value.host);
  const port = parsePort(value.port);
  const from = readString(value.from);
  const user = readString(value.user);
  const password = readString(value.password);
  const proxyHost = readString(value.proxyHost);
  const proxyPort = parseProxyPort(value.proxyPort);
  const proxyUser = readString(value.proxyUser);
  const proxyPassword = readString(value.proxyPassword);

  if (!host || !from || !isEmailAddress(from)) {
    throw new BadRequestException("SMTP host and valid sender are required");
  }

  if (typeof value.secure !== "boolean") {
    throw new BadRequestException("SMTP secure must be boolean");
  }

  if (typeof value.requireTls !== "boolean") {
    throw new BadRequestException("SMTP requireTls must be boolean");
  }

  if (!proxyHost && (proxyUser || proxyPassword)) {
    throw new BadRequestException("SOCKS5 proxy host is required for proxy authentication");
  }

  return {
    host,
    port,
    secure: value.secure,
    requireTls: value.requireTls,
    from,
    user,
    password,
    proxyHost,
    proxyPort,
    proxyUser,
    proxyPassword,
  };
}

function validateSettings(
  settings: SmtpSettings,
  createError: (message: string) => Error,
): void {
  if (settings.secure && settings.requireTls) {
    throw createError("Implicit TLS and STARTTLS cannot be enabled together");
  }

  if (Boolean(settings.user) !== Boolean(settings.password)) {
    throw createError("SMTP_USER and SMTP_PASSWORD must be configured together");
  }

  if (settings.user && !settings.secure && !settings.requireTls) {
    throw createError("SMTP authentication requires implicit TLS or STARTTLS");
  }

  if (settings.proxyHost && !isValidProxyHost(settings.proxyHost)) {
    throw createError("SOCKS5 proxy host is invalid");
  }

  if (Boolean(settings.proxyUser) !== Boolean(settings.proxyPassword)) {
    throw createError("SOCKS5 proxy user and password must be configured together");
  }

  if (!settings.proxyHost && (settings.proxyUser || settings.proxyPassword)) {
    throw createError("SOCKS5 proxy host is required for proxy authentication");
  }
}

function resolveProxyPassword(
  current: SmtpSettings,
  proxyHost: string,
  proxyUser: string,
  proxyPassword: string,
): string {
  if (!proxyHost) {
    if (proxyPassword) {
      throw new BadRequestException("SOCKS5 proxy host is required when setting a password");
    }
    return "";
  }

  if (!proxyUser && proxyPassword) {
    throw new BadRequestException("SOCKS5 proxy user is required when setting a password");
  }

  if (!proxyUser) {
    return "";
  }

  if (proxyPassword) {
    return proxyPassword;
  }

  if (
    proxyHost === current.proxyHost &&
    proxyUser === current.proxyUser &&
    current.proxyPassword
  ) {
    return current.proxyPassword;
  }

  throw new BadRequestException(
    "SOCKS5 proxy password is required when setting or changing the proxy user",
  );
}

function resolvePassword(
  current: SmtpSettings,
  user: string,
  password: string,
): string {
  if (!user) {
    if (password) {
      throw new BadRequestException("SMTP user is required when setting a password");
    }
    return "";
  }

  if (password) {
    return password;
  }

  if (user === current.user && current.password) {
    return current.password;
  }

  throw new BadRequestException(
    "SMTP password is required when setting or changing the user",
  );
}

type EncryptedPassword = {
  readonly value: string;
  readonly iv: string;
  readonly tag: string;
};

function encryptPassword(key: Buffer, password: string): EncryptedPassword {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(CIPHER_ALGORITHM, key, iv);
  const value = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return {
    value: value.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptPassword(key: Buffer, entity: SmtpSettingsEntity): string {
  const decipher = createDecipheriv(
    CIPHER_ALGORITHM,
    key,
    Buffer.from(entity.passwordIv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(entity.passwordTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(entity.encryptedPassword, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function decryptProxyPassword(key: Buffer, entity: SmtpSettingsEntity): string {
  if (!entity.encryptedProxyPassword) {
    return "";
  }

  return decryptPasswordValue(key, entity.encryptedProxyPassword, entity.proxyPasswordIv, entity.proxyPasswordTag);
}

function decryptPasswordValue(key: Buffer, value: string, iv: string, tag: string): string {
  const decipher = createDecipheriv(CIPHER_ALGORITHM, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(value, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parsePort(value: unknown): number {
  const port = Number(value ?? 25);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new BadRequestException("SMTP port must be between 1 and 65535");
  }

  return port;
}

function parseProxyPort(value: unknown): number {
  const port = Number(value ?? 1080);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new BadRequestException("SOCKS5 proxy port must be between 1 and 65535");
  }

  return port;
}

function isValidProxyHost(value: string): boolean {
  if (isIP(value) !== 0) {
    return true;
  }

  if (/\s|[\\/@?#]/.test(value)) {
    return false;
  }

  return /^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(value);
}

function isEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
