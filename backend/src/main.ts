import "reflect-metadata";

import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";

import { AppModule } from "./app.module.js";
import {
  isPublicIngestCorsRequest,
  parseCorsOrigins,
} from "./config/cors.js";

const TEXT_BODY_LIMIT = process.env.TEXT_BODY_LIMIT ?? "10mb";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (
      !isPublicIngestCorsRequest(
        request.method,
        request.path,
        request.get("Access-Control-Request-Method"),
      )
    ) {
      next();
      return;
    }

    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (request.method === "OPTIONS") {
      response.sendStatus(204);
      return;
    }

    next();
  });
  const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);
  if (corsOrigins.length > 0) {
    app.enableCors({ origin: corsOrigins, credentials: true });
  }
  app.use(express.text({ type: ["text/plain", "text/*"], limit: TEXT_BODY_LIMIT }));

  const document: OpenAPIObject = {
    openapi: "3.0.0",
    info: {
      title: "BeaconWatch API",
      description: "Receives beacon payloads and streams them in real time.",
      version: "1.0.0",
    },
    paths: {
      "/auth/login": {
        post: {
          tags: ["auth"],
          summary: "Create an admin session",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["username", "password"],
                  properties: {
                    username: { type: "string" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Authenticated admin user",
            },
            "401": {
              description: "Invalid credentials",
            },
          },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["auth"],
          summary: "Clear the admin session",
          responses: {
            "204": {
              description: "Session cleared",
            },
          },
        },
      },
      "/auth/me": {
        get: {
          tags: ["auth"],
          summary: "Get the current admin session",
          responses: {
            "200": {
              description: "Authenticated admin user",
            },
            "401": {
              description: "Authentication required",
            },
          },
        },
      },
      "/beacons": {
        post: {
          tags: ["beacons"],
          summary: "Receive a beacon payload",
          requestBody: {
            required: true,
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                },
                example:
                  '{"cookies":"PrivateComputer=true; X-OWA-CANARY=...","mbxGuid":"4af1441f-...","forest":"cvelab.local"}',
              },
            },
          },
          responses: {
            "201": {
              description: "Saved beacon",
            },
            "400": {
              description: "Invalid payload",
            },
          },
        },
        get: {
          tags: ["beacons"],
          summary: "List beacons",
          parameters: [
            {
              name: "type",
              in: "query",
              required: false,
              schema: {
                type: "string",
                enum: ["loot", "heartbeat"],
              },
            },
          ],
          responses: {
            "200": {
              description: "Beacon list",
            },
            "401": {
              description: "Authentication required",
            },
          },
        },
        delete: {
          tags: ["beacons"],
          summary: "Delete all beacons",
          responses: {
            "200": {
              description: "All beacons deleted",
            },
            "401": {
              description: "Authentication required",
            },
          },
        },
      },
      "/beacons/{id}": {
        get: {
          tags: ["beacons"],
          summary: "Get one beacon",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string",
                format: "uuid",
              },
            },
          ],
          responses: {
            "200": {
              description: "Beacon",
            },
            "404": {
              description: "Beacon not found",
            },
            "401": {
              description: "Authentication required",
            },
          },
        },
      },
      "/api/mails": {
        get: {
          tags: ["mails"],
          summary: "List stored mail payloads",
          parameters: [
            {
              name: "limit",
              in: "query",
              required: false,
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 500,
                default: 200,
              },
            },
            {
              name: "offset",
              in: "query",
              required: false,
              schema: {
                type: "integer",
                minimum: 0,
                default: 0,
              },
            },
          ],
          responses: {
            "200": {
              description: "Stored mail payloads",
            },
            "401": {
              description: "Authentication required",
            },
          },
        },
        delete: {
          tags: ["mails"],
          summary: "Delete all stored mail payloads",
          responses: {
            "204": {
              description: "All mail payloads deleted",
            },
            "401": {
              description: "Authentication required",
            },
          },
        },
      },
      "/api/mails/send": {
        post: {
          tags: ["mails"],
          summary: "Send a plain-text or safe HTML message through SMTP",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["to", "subject"],
                  properties: {
                    to: { type: "string", format: "email" },
                    subject: { type: "string" },
                    text: {
                      type: "string",
                      description:
                        "Plain-text body. Generated from html when omitted.",
                    },
                    html: {
                      type: "string",
                      description: "Optional safe HTML representation of text",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "204": { description: "Message accepted by SMTP" },
            "400": { description: "Invalid message" },
            "401": { description: "Authentication required" },
          },
        },
      },
      "/api/settings/smtp": {
        get: {
          tags: ["settings"],
          summary: "Get SMTP settings without the password",
          responses: {
            "200": { description: "Current SMTP settings" },
            "401": { description: "Authentication required" },
          },
        },
        put: {
          tags: ["settings"],
          summary: "Update SMTP settings",
          responses: {
            "200": { description: "Updated SMTP settings" },
            "400": { description: "Invalid SMTP settings" },
            "401": { description: "Authentication required" },
          },
        },
      },
      "/api/mails/{id}": {
        delete: {
          tags: ["mails"],
          summary: "Delete one stored mail payload",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string",
                format: "uuid",
              },
            },
          ],
          responses: {
            "204": {
              description: "Mail payload deleted",
            },
            "401": {
              description: "Authentication required",
            },
          },
        },
      },
      "/mails": {
        post: {
          tags: ["mails"],
          summary: "Receive mail payloads",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    required: [
                      "id",
                      "changeKey",
                      "subject",
                      "from",
                      "fromEmail",
                      "date",
                      "hasAttachments",
                      "isRead",
                      "size",
                      "body",
                    ],
                    properties: {
                      id: { type: "string" },
                      changeKey: { type: "string" },
                      subject: { type: "string" },
                      from: { type: "string" },
                      fromEmail: { type: "string" },
                      date: { type: "string", format: "date-time" },
                      hasAttachments: { type: "boolean" },
                      isRead: { type: "boolean" },
                      size: { type: "number" },
                      body: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Accepted mail payloads",
            },
            "400": {
              description: "Invalid mail payload",
            },
          },
        },
      },
      "/sse": {
        get: {
          tags: ["sse"],
          summary: "Open an SSE stream",
          responses: {
            "200": {
              description: "Server-sent event stream",
            },
            "401": {
              description: "Authentication required",
            },
          },
        },
      },
    },
    components: {
      schemas: {},
    },
  };
  SwaggerModule.setup("api", app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
