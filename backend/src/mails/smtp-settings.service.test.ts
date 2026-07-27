import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Repository } from "typeorm";

import { SmtpSettingsEntity } from "./smtp-settings.entity.js";
import { SmtpSettingsService } from "./smtp-settings.service.js";

describe("SmtpSettingsService", () => {
  it("loads environment defaults without exposing the password", async () => {
    const repository = createRepository();
    const service = new SmtpSettingsService(repository, createConfig());

    assert.deepEqual(await service.getPublic(), {
      host: "smtp.example.com",
      port: 587,
      secure: true,
      requireTls: false,
      from: "sender@example.com",
      user: "sender@example.com",
      hasPassword: true,
      proxyHost: "",
      proxyPort: 1080,
      proxyUser: "",
      hasProxyPassword: false,
    });
  });

  it("persists an encrypted password and restores it after reload", async () => {
    const repository = createRepository();
    const config = createConfig();
    const service = new SmtpSettingsService(repository, config);

    await service.update({
      host: "smtp.changed.com",
      port: 465,
      secure: true,
      requireTls: false,
      from: "sender@example.com",
      user: "sender@example.com",
      password: "new-secret",
    });

    assert.equal(repository.saved?.encryptedPassword.includes("new-secret"), false);

    const reloaded = new SmtpSettingsService(repository, config);
    assert.equal((await reloaded.get()).password, "new-secret");
  });

  it("persists SOCKS5 settings and encrypts the proxy password", async () => {
    const repository = createRepository();
    const config = createConfig();
    const service = new SmtpSettingsService(repository, config);

    await service.update({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      requireTls: true,
      from: "sender@example.com",
      user: "sender@example.com",
      password: "new-secret",
      proxyHost: "proxy.example.com",
      proxyPort: 1080,
      proxyUser: "proxy-user",
      proxyPassword: "proxy-secret",
    });

    assert.equal(repository.saved?.encryptedProxyPassword.includes("proxy-secret"), false);
    const reloaded = new SmtpSettingsService(repository, config);

    assert.deepEqual(await reloaded.getPublic(), {
      host: "smtp.example.com",
      port: 587,
      secure: false,
      requireTls: true,
      from: "sender@example.com",
      user: "sender@example.com",
      hasPassword: true,
      proxyHost: "proxy.example.com",
      proxyPort: 1080,
      proxyUser: "proxy-user",
      hasProxyPassword: true,
    });
    assert.equal((await reloaded.get()).proxyPassword, "proxy-secret");
  });

  it("requires a SOCKS5 proxy host and port together", async () => {
    const service = new SmtpSettingsService(createRepository(), createConfig());

    await assert.rejects(
      () => service.update({
        host: "smtp.example.com",
        port: 587,
        secure: false,
        requireTls: true,
        from: "sender@example.com",
        user: "sender@example.com",
        password: "new-secret",
        proxyHost: "proxy.example.com",
        proxyPort: 0,
        proxyUser: "",
        proxyPassword: "",
      }),
      { message: "SOCKS5 proxy port must be between 1 and 65535" },
    );
  });

  it("accepts sender domains containing the letter s", async () => {
    const service = new SmtpSettingsService(createRepository(), createConfig());

    const settings = await service.update({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      requireTls: true,
      from: "sender@smtp.example.com",
      user: "sender@example.com",
      password: "new-secret",
    });

    assert.equal(settings.from, "sender@smtp.example.com");
  });

  it("rejects whitespace in the sender domain", async () => {
    const service = new SmtpSettingsService(createRepository(), createConfig());

    await assert.rejects(
      () =>
        service.update({
          host: "smtp.example.com",
          port: 587,
          secure: false,
          requireTls: true,
          from: "sender@example .com",
          user: "sender@example.com",
          password: "new-secret",
        }),
      BadRequestException,
    );
  });

  it("requires a password when the SMTP user changes", async () => {
    const service = new SmtpSettingsService(createRepository(), createConfig());

    await assert.rejects(
      () =>
        service.update({
          host: "smtp.example.com",
          port: 587,
          secure: false,
          requireTls: true,
          from: "sender@example.com",
          user: "another-user@example.com",
          password: "",
        }),
      {
        message: "SMTP password is required when setting or changing the user",
      },
    );
  });

  it("preserves the password when the SMTP user is unchanged", async () => {
    const service = new SmtpSettingsService(createRepository(), createConfig());

    await service.update({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      requireTls: true,
      from: "sender@example.com",
      user: "sender@example.com",
      password: "",
    });

    assert.equal((await service.get()).password, "initial-secret");
  });

  it("clears the stored password when SMTP authentication is disabled", async () => {
    const repository = createRepository();
    const service = new SmtpSettingsService(repository, createConfig());

    const publicSettings = await service.update({
      host: "smtp.example.com",
      port: 25,
      secure: false,
      requireTls: false,
      from: "sender@example.com",
      user: "",
      password: "",
    });

    assert.equal(publicSettings.hasPassword, false);
    assert.equal((await service.get()).password, "");
  });

  it("retries loading settings after a temporary repository error", async () => {
    const repository = createRepository({ findFailures: 1 });
    const service = new SmtpSettingsService(repository, createConfig());

    await assert.rejects(() => service.get(), {
      message: "Temporary database failure",
    });

    assert.equal((await service.get()).host, "smtp.example.com");
  });

  it("rejects contradictory implicit TLS and STARTTLS settings", async () => {
    const service = new SmtpSettingsService(createRepository(), createConfig());

    await assert.rejects(
      () =>
        service.update({
          host: "smtp.example.com",
          port: 465,
          secure: true,
          requireTls: true,
          from: "sender@example.com",
          user: "sender@example.com",
          password: "new-secret",
        }),
      {
        message: "Implicit TLS and STARTTLS cannot be enabled together",
      },
    );
  });

  it("rejects authenticated SMTP without transport encryption", async () => {
    const service = new SmtpSettingsService(createRepository(), createConfig());

    await assert.rejects(
      () =>
        service.update({
          host: "smtp.example.com",
          port: 25,
          secure: false,
          requireTls: false,
          from: "sender@example.com",
          user: "sender@example.com",
          password: "new-secret",
        }),
      {
        message: "SMTP authentication requires implicit TLS or STARTTLS",
      },
    );
  });

  it("rejects incomplete SMTP credentials from the environment", async () => {
    const values = createConfigValues();
    values.SMTP_PASSWORD = "";
    const service = new SmtpSettingsService(
      createRepository(),
      createConfig(values),
    );

    await assert.rejects(() => service.get(), {
      message: "SMTP_USER and SMTP_PASSWORD must be configured together",
    });
  });
});

function createConfig(
  values: Record<string, string> = createConfigValues(),
): ConfigService {
  return {
    get: <T>(key: string, defaultValue?: T) =>
      (values[key] as T | undefined) ?? defaultValue,
  } as ConfigService;
}

function createConfigValues(): Record<string, string> {
  return {
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_SECURE: "true",
    SMTP_REQUIRE_TLS: "false",
    SMTP_FROM: "sender@example.com",
    SMTP_USER: "sender@example.com",
    SMTP_PASSWORD: "initial-secret",
    SMTP_SETTINGS_ENCRYPTION_KEY: "test-encryption-key",
    SMTP_SOCKS5_HOST: "",
    SMTP_SOCKS5_PORT: "1080",
    SMTP_SOCKS5_USER: "",
    SMTP_SOCKS5_PASSWORD: "",
  };
}

function createRepository(options: { readonly findFailures?: number } = {}) {
  let stored: SmtpSettingsEntity | null = null;
  let remainingFindFailures = options.findFailures ?? 0;

  return {
    get saved() {
      return stored;
    },
    findOne: async () => {
      if (remainingFindFailures > 0) {
        remainingFindFailures -= 1;
        throw new Error("Temporary database failure");
      }

      return stored;
    },
    create: (entity: Partial<SmtpSettingsEntity>) => entity as SmtpSettingsEntity,
    save: async (entity: SmtpSettingsEntity) => {
      stored = entity;
      return entity;
    },
  } as Pick<Repository<SmtpSettingsEntity>, "findOne" | "create" | "save"> & {
    readonly saved: SmtpSettingsEntity | null;
  };
}
