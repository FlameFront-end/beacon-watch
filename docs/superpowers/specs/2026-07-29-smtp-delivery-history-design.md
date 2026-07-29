# SMTP Delivery History Design

## Goal

Provide a clear delivery history for messages sent from Beacon Watch, including the full delivery path through Mailcow/Postfix and actionable delivery errors.

The feature stores metadata and a short safe preview. It does not store the full message body or HTML by default.

## Scope

The history covers messages initiated by Beacon Watch:

```text
Beacon Watch -> SMTP submission -> Mailcow/Postfix -> queue -> recipient MX
```

It includes accepted, queued, retrying, delivered, deferred, bounced, failed, and cancelled states. Existing messages are not imported retroactively.

## Architecture

Use a hybrid integration:

1. Beacon Watch creates a delivery record before SMTP submission and assigns a stable internal `deliveryId` and SMTP `Message-ID`.
2. Beacon Watch records the SMTP submission result immediately.
3. A read-only Mailcow-side agent follows Postfix logs and queue state and posts signed delivery events to Beacon Watch.
4. Beacon Watch periodically reconciles active records with the Mailcow queue in case an event is missed.
5. The UI receives active changes through SSE and falls back to polling when the stream is unavailable.

The Mailcow agent sends delivery metadata only. It does not expose root access, SMTP passwords, message bodies, or arbitrary logs to Beacon Watch.

## Delivery record

Each delivery record contains:

- internal `deliveryId`;
- SMTP `Message-ID`;
- sender and recipient;
- subject;
- short safe preview;
- message size;
- creation and completion timestamps;
- current status;
- attempt count;
- latest error summary;
- latest SMTP/Postfix queue ID;
- event history;
- retention classification.

Email addresses in technical details may be partially masked. SMTP credentials, tokens, full message content, and raw secrets are never stored in the delivery history.

## Status model

```text
created       created by Beacon Watch
submitting    being submitted to SMTP
accepted      accepted by Mailcow submission
queued        present in the Postfix queue
retrying      delivery retry is in progress
delivered     recipient MX accepted the message
deferred      temporary delivery failure; retry is expected
bounced       permanent delivery failure
failed        local submission or processing failure
cancelled     cancelled by an operator
stale         no expected update within the active monitoring window
sync_pending  accepted record awaiting Mailcow synchronization
```

State transitions must be monotonic for terminal states. A `delivered`, `bounced`, `failed`, or `cancelled` record cannot be changed by a later stale event.

## Delivery events

Each event contains:

- event ID and delivery ID;
- event timestamp;
- source (`beaconwatch`, `smtp`, `postfix`, `mailcow-agent`, or `reconciler`);
- resulting status;
- SMTP/Postfix queue ID when available;
- recipient MX host and port when available;
- TLS details when available;
- SMTP response code when available;
- safe error category and short message;
- delivery attempt number.

Error categories include:

- `temporary_4xx`;
- `permanent_5xx`;
- `network_timeout`;
- `tls_error`;
- `authentication_failed`;
- `queue_error`;
- `agent_unavailable`;
- `unknown`.

SMTP `4xx` responses map to `deferred`; `5xx` responses map to `bounced`. Network timeouts remain temporary. Mailcow/Postfix remains the authority for external delivery state.

## UI

Add a Delivery history section below the existing send and SMTP settings panels.

Summary counters:

- total;
- delivered;
- queued;
- deferred;
- bounced/failed;
- last Mailcow synchronization time.

The table displays:

- time;
- recipient;
- subject;
- current status;
- current stage;
- attempt count;
- latest event/error;
- actions.

Filters include status, date range, recipient, sender, Message-ID, active-only, and errors-only.

The details view contains a chronological timeline, SMTP/Postfix queue ID, recipient MX, response code, TLS information, safe error explanation, and a collapsible technical message. It supports copying identifiers.

Actions:

- retry `deferred` and temporary failures;
- cancel queued messages;
- copy Message-ID and queue ID;
- open delivery details.

Retry creates an auditable new attempt. Delivered messages cannot be retried in place. History entries are archived rather than immediately deleted.

## Realtime and reconciliation

Active records receive SSE updates. The client falls back to polling every 30–60 seconds if SSE is unavailable. Active monitoring is limited to the first 15 minutes unless the record is still queued or deferred.

Records with no expected update become `stale` and remain eligible for reconciliation. The Mailcow agent retries delivery of events with an idempotency key. Beacon Watch deduplicates events by event ID and source sequence.

## Retention

- normal delivery records: 90 days;
- deferred, bounced, and failed records: 180 days;
- safe preview and technical error: subject to the same retention period;
- full message body and HTML: not retained by this feature.

Retention is automatic and configurable by an administrator in a later settings task.

## Security

- Agent-to-Beacon Watch events are authenticated and signed.
- Agent credentials are scoped to event ingestion and reconciliation only.
- Raw Postfix logs never reach the browser.
- Error rendering masks credentials, authorization headers, and sensitive connection details.
- Retry and cancellation require an authenticated administrator session.
- All operator actions are written to the audit log.

## Verification

The implementation must verify:

1. successful external delivery;
2. Mailcow acceptance and queue visibility;
3. deferred delivery and retry;
4. permanent bounce;
5. retry and cancellation permissions;
6. SSE updates and polling fallback;
7. duplicate event handling;
8. agent restart and missed-event reconciliation;
9. retention behavior;
10. masking of message content and secrets.

## Rollout

Implement in stages:

1. delivery records and events;
2. Mailcow agent and signed ingestion;
3. history table and detail timeline;
4. SSE, fallback polling, and reconciliation;
5. retry/cancel actions;
6. security, retention, and delivery verification.
