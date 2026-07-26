# Service-Oriented Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a service-selection home page, isolate OWA beacons and emails by `serviceKey`, and move SMTP into a global section.

**Architecture:** A static service catalog validates route keys in both applications. Shared beacon and email modules require a service key for every repository operation, while SMTP remains global. PostgreSQL stores all services in shared tables with composite service indexes and uniqueness.

**Tech Stack:** NestJS 11, TypeORM, PostgreSQL 16, React 19, Wouter, TypeScript, Node test runner, Vitest, Docker Compose

---

## Task 1: Service catalog

**Files:**

- Create: `backend/src/services/service-catalog.ts`
- Create: `backend/src/services/service-catalog.test.ts`
- Create: `frontend/src/shared/config/services.ts`
- Create: `frontend/src/shared/config/services.test.ts`

- [ ] Write backend tests that resolve `owa` and reject an unknown key with `NotFoundException`.
- [ ] Run `npm run test:backend` and verify the missing catalog causes RED.
- [ ] Implement the backend catalog:

```ts
export type ServiceKey = "owa";

export function requireService(serviceKey: string): RegisteredService {
  const service = SERVICES.find((candidate) => candidate.key === serviceKey);
  if (!service) {
    throw new NotFoundException(`Service ${serviceKey} not found`);
  }
  return service;
}
```

- [ ] Write frontend tests for `getService("owa")`, capability lookup, and unknown keys.
- [ ] Run `npm --prefix frontend test` and verify RED.
- [ ] Implement the matching readonly frontend registry.
- [ ] Run both focused test suites and verify GREEN.

## Task 2: Database service scoping

**Files:**

- Create: `backend/src/database/migrations/1785085200000-add-service-scoping.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/beacons/beacon.entity.ts`
- Modify: `backend/src/mails/mail.entity.ts`

- [ ] Add entity tests or service tests that require `serviceKey`.
- [ ] Add `serviceKey` columns and TypeORM indexes to both entities.
- [ ] Add a migration that executes:

```sql
ALTER TABLE "beacons"
  ADD COLUMN IF NOT EXISTS "serviceKey" varchar NOT NULL DEFAULT 'owa';
ALTER TABLE "mails"
  ADD COLUMN IF NOT EXISTS "serviceKey" varchar NOT NULL DEFAULT 'owa';
ALTER TABLE "mails" DROP CONSTRAINT IF EXISTS "UQ_mails_external_id";
ALTER TABLE "mails"
  ADD CONSTRAINT "UQ_mails_service_external_id"
  UNIQUE ("serviceKey", "externalId");
CREATE INDEX IF NOT EXISTS "IDX_beacons_service_received"
  ON "beacons" ("serviceKey", "receivedAt");
CREATE INDEX IF NOT EXISTS "IDX_mails_service_received"
  ON "mails" ("serviceKey", "receivedAt");
```

- [ ] Register the migration in `AppModule`.
- [ ] Run the backend build to verify migration and entity types.

## Task 3: Service-scoped beacons and events

**Files:**

- Modify: `backend/src/beacons/beacons.controller.ts`
- Modify: `backend/src/beacons/beacons.service.ts`
- Modify: `backend/src/beacons/beacons.service.test.ts` or create it
- Modify: `backend/src/sse/sse.controller.ts`
- Modify: `backend/src/sse/sse.service.ts`
- Create or modify: `backend/src/sse/sse.service.test.ts`

- [ ] Write failing service tests proving two service keys cannot share heartbeat upsert, list, detail, or delete scope.
- [ ] Change beacon service signatures to require `serviceKey`:

```ts
createFromPayload(serviceKey: ServiceKey, payload: unknown): Promise<BeaconEntity>
findAll(serviceKey: ServiceKey, type?: BeaconType): Promise<BeaconEntity[]>
findById(serviceKey: ServiceKey, id: string): Promise<BeaconEntity>
clearAll(serviceKey: ServiceKey): Promise<void>
```

- [ ] Replace the controller prefix with `api/services/:serviceKey/beacons`, validate the key, and keep only POST public.
- [ ] Write failing SSE tests proving the observable filters by service.
- [ ] Change SSE to `api/services/:serviceKey/events` and filter events by `data.serviceKey`.
- [ ] Run backend tests and verify GREEN.

## Task 4: Service-scoped emails

**Files:**

- Modify: `backend/src/mails/mails.controller.ts`
- Modify: `backend/src/mails/mails.service.ts`
- Modify: `backend/src/mails/mails.service.test.ts`
- Modify: `backend/src/mails/mails.controller.test.ts`

- [ ] Write failing tests for service-scoped ingestion, duplicate detection, pagination, single delete, and delete-all.
- [ ] Require `serviceKey` in every email service operation and include it in repository `where` clauses.
- [ ] Change ingestion and admin routes to `api/services/:serviceKey/emails`.
- [ ] Remove all `/mails` and `/api/mails` controller routes.
- [ ] Run backend tests and verify GREEN.

## Task 5: Global SMTP API

**Files:**

- Modify: `backend/src/mails/mails.controller.ts`
- Modify: `backend/src/mails/smtp-settings.controller.ts`
- Modify: `backend/src/main.ts`

- [ ] Move sending to guarded `POST /api/smtp/send`.
- [ ] Move settings to guarded `GET|PUT /api/smtp/settings`.
- [ ] Update Swagger paths and examples.
- [ ] Verify no SMTP DTO or entity accepts `serviceKey`.
- [ ] Run backend tests and build.

## Task 6: Public-ingest CORS

**Files:**

- Modify: `backend/src/config/cors.test.ts`
- Modify: `backend/src/config/cors.ts`

- [ ] Write failing tests allowing only:

```text
POST /api/services/owa/beacons
POST /api/services/owa/emails
OPTIONS for those POST routes
```

- [ ] Implement an anchored route matcher that validates the service and resource segments.
- [ ] Assert old `/beacons` and `/mails` paths are rejected.
- [ ] Run backend tests and verify GREEN.

## Task 7: Frontend route and layout architecture

**Files:**

- Create: `frontend/src/features/services/pages/Services/Services.page.tsx`
- Create: `frontend/src/features/services/pages/Services/Services.module.scss`
- Create: `frontend/src/shared/widgets/ServiceNavigation/ServiceNavigation.tsx`
- Create: `frontend/src/shared/widgets/ServiceNavigation/ServiceNavigation.module.scss`
- Modify: `frontend/src/app/router/router.tsx`
- Modify: `frontend/src/shared/widgets/Layout/Layout.tsx`
- Modify: `frontend/src/shared/widgets/Layout/Layout.module.scss`

- [ ] Add `/` service cards, `/smtp`, `/owa/beacons`, `/owa/beacons/:beaconId`, and `/owa/emails`.
- [ ] Redirect `/owa` to `/owa/beacons` and unknown service routes to `/`.
- [ ] Keep Home and SMTP global navigation visible everywhere.
- [ ] Render service-local Beacons and Emails navigation only inside OWA routes.
- [ ] Run frontend build.

## Task 8: OWA feature relocation and service-aware API

**Files:**

- Modify: `frontend/src/shared/api/beacons.ts`
- Modify: `frontend/src/shared/api/mails.ts`
- Modify: `frontend/src/shared/hooks/use-sse.ts`
- Modify: `frontend/src/features/beacons/**`
- Modify: `frontend/src/features/mails/pages/MailsDashboard/MailsDashboard.page.tsx`
- Create: `frontend/src/features/smtp/pages/Smtp/Smtp.page.tsx`
- Create: `frontend/src/features/smtp/pages/Smtp/Smtp.module.scss`

- [ ] Add a required `serviceKey` argument to beacon/email API functions and construct `/api/services/${serviceKey}/...` paths.
- [ ] Point SSE to `/api/services/${serviceKey}/events`.
- [ ] Pass `owa` from OWA pages and hooks.
- [ ] Extract `SendMailPanel` and `SmtpSettingsPanel` into `/smtp`.
- [ ] Leave `/owa/emails` with counts, filters, search, list, detail, and deletion only.
- [ ] Point global SMTP calls to `/api/smtp/send` and `/api/smtp/settings`.
- [ ] Run frontend tests and build.

## Task 9: Payload and documentation updates

**Files:**

- Modify: `README.md`
- Modify repository references to `/beacons`, `/mails`, `/sse`, `/api/mails`, and `/api/settings/smtp`

- [ ] Replace old examples with service-aware API paths.
- [ ] Document the static service registry and global SMTP behavior.
- [ ] Search the repository and confirm old runtime paths no longer remain.

## Task 10: Full verification and production rollout

- [ ] Run `npm run test:backend`.
- [ ] Run `npm --prefix frontend test`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Back up the VPS PostgreSQL volume and production Compose configuration.
- [ ] Deploy the exact source state and rebuild backend/frontend.
- [ ] Verify the migration columns, indexes, and composite unique constraint.
- [ ] Verify containers are healthy and HTTPS returns `200`.
- [ ] Verify new OWA routes and global SMTP routes respond as expected.
- [ ] Verify old `/beacons`, `/mails`, `/sse`, `/api/mails`, and `/api/settings/smtp` routes return `404`.

No commit or push is included until explicitly requested.
