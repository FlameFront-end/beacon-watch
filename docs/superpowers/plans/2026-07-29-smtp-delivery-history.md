# SMTP Delivery History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add durable SMTP delivery history with Mailcow/Postfix lifecycle events, realtime UI updates, details, filtering, retry, and cancellation.

**Architecture:** Beacon Watch creates a delivery record and Message-ID before submission. A signed Mailcow-side event collector reports Postfix queue and delivery events; a reconciler repairs missed events. The UI displays status summaries, a searchable history table, and a chronological detail timeline.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, React, TypeScript, SSE, Docker Compose, Postfix/Mailcow logs.

---

### Task 1: Define delivery domain and persistence

**Files:**
- Create: `backend/src/mails/delivery.entity.ts`
- Create: `backend/src/mails/delivery-event.entity.ts`
- Create: `backend/src/database/migrations/20260729000000-add-smtp-delivery-history.ts`
- Modify: `backend/src/mails/mails.module.ts`
- Modify: `backend/src/app.module.ts`
- Test: `backend/src/mails/delivery-history.service.test.ts`

- [ ] Add delivery and event entities with statuses, identifiers, recipient metadata, safe preview, attempt count, and timestamps.
- [ ] Add indexes for current status, created time, recipient, Message-ID, and queue ID.
- [ ] Add the migration and register both entities in the module and TypeORM configuration.
- [ ] Test creation, event idempotency, terminal-state protection, and retention classification.

### Task 2: Add delivery history service and APIs

**Files:**
- Create: `backend/src/mails/delivery-history.service.ts`
- Create: `backend/src/mails/delivery-history.controller.ts`
- Create: `backend/src/mails/delivery-history.dto.ts`
- Modify: `backend/src/mails/mails.module.ts`
- Modify: `backend/src/mails/mails.controller.ts`
- Test: `backend/src/mails/delivery-history.controller.test.ts`

- [ ] Create records before SMTP submission and transition them on submission success or failure.
- [ ] Expose authenticated list, details, event ingestion, retry, and cancellation endpoints.
- [ ] Validate status transitions and deduplicate events using event ID plus source sequence.
- [ ] Return safe error text and never return message body, passwords, or raw secrets.
- [ ] Test authorization, pagination, filters, retry eligibility, cancellation eligibility, and duplicate events.

### Task 3: Integrate sending with delivery records

**Files:**
- Modify: `backend/src/mails/mail-sending.service.ts`
- Modify: `backend/src/mails/smtp-mailer.service.ts`
- Modify: `backend/src/mails/mails.controller.ts`
- Modify: `frontend/src/shared/api/smtp.ts`
- Test: `backend/src/mails/mail-sending.service.test.ts`

- [ ] Generate a stable Message-ID and safe preview for every send request.
- [ ] Return `deliveryId` and Message-ID from the send endpoint.
- [ ] Record accepted, failed, and authentication/network errors with appropriate categories.
- [ ] Keep existing SMTP sending behavior compatible with the current UI.
- [ ] Test successful submission and each local failure category.

### Task 4: Add Mailcow event collector and reconciliation

**Files:**
- Create: `scripts/mailcow-delivery-agent/README.md`
- Create: `scripts/mailcow-delivery-agent/agent.ts`
- Create: `scripts/mailcow-delivery-agent/package.json`
- Create: `scripts/mailcow-delivery-agent/Dockerfile`
- Create: `scripts/mailcow-delivery-agent/docker-compose.yml`
- Modify: `docker-compose.yml`
- Test: `scripts/mailcow-delivery-agent/agent.test.ts`

- [ ] Tail Postfix logs and extract Message-ID, queue ID, recipient, MX host, SMTP code, TLS, and delivery result.
- [ ] Read queue state through a least-privilege Mailcow integration and emit queued, deferred, and retrying events.
- [ ] Sign event payloads with a dedicated shared secret and retry delivery with idempotency keys.
- [ ] Add a reconciliation loop for active records and mark records stale after the monitoring window.
- [ ] Test parsing, malformed lines, duplicate events, reconnects, and agent restart recovery.

### Task 5: Build history UI

**Files:**
- Create: `frontend/src/features/smtp/components/DeliverySummary.tsx`
- Create: `frontend/src/features/smtp/components/DeliveryHistoryTable.tsx`
- Create: `frontend/src/features/smtp/components/DeliveryDetails.tsx`
- Create: `frontend/src/features/smtp/components/DeliveryStatusBadge.tsx`
- Modify: `frontend/src/features/smtp/pages/Smtp/Smtp.page.tsx`
- Modify: `frontend/src/shared/api/smtp.ts`
- Test: `frontend/src/features/smtp/components/DeliveryHistoryTable.test.tsx`

- [ ] Add summary counters, filters, pagination, active-only and errors-only views.
- [ ] Add a row detail view with timeline, safe technical metadata, Message-ID, and queue ID copy actions.
- [ ] Add retry for eligible failures and cancellation for queued messages.
- [ ] Add SSE updates with 30–60 second polling fallback for active records.
- [ ] Test loading, empty, error, filtering, terminal states, retry, cancellation, and reconnect behavior.

### Task 6: Retention, audit, and operational verification

**Files:**
- Create: `backend/src/mails/delivery-retention.service.ts`
- Modify: `backend/src/mails/mails.module.ts`
- Modify: `README.md`
- Modify: `.env.example`
- Test: `backend/src/mails/delivery-retention.service.test.ts`

- [ ] Remove normal records after 90 days and error records after 180 days without deleting active records.
- [ ] Add audit entries for retry and cancellation.
- [ ] Document agent authentication, retention settings, and safe deployment order.
- [ ] Run backend tests, frontend tests, type checks, builds, and a real SMTP delivery test.
- [ ] Verify Mailcow accepted, queued, deferred, delivered, bounced, and reconciled flows before declaring completion.
