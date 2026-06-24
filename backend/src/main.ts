import "reflect-metadata";

import express from "express";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";

import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });
  app.use(express.text({ type: ["text/plain", "text/*"] }));

  const document: OpenAPIObject = {
    openapi: "3.0.0",
    info: {
      title: "BeaconWatch API",
      description: "Receives beacon payloads and streams them in real time.",
      version: "1.0.0",
    },
    paths: {
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
          },
        },
        delete: {
          tags: ["beacons"],
          summary: "Delete all beacons",
          responses: {
            "200": {
              description: "All beacons deleted",
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
