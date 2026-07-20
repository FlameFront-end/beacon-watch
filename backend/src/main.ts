import "reflect-metadata";

import express from "express";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";

import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.use(express.text({ type: ["text/plain", "text/*"] }));

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
