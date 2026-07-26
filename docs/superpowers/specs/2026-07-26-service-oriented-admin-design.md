# Service-Oriented Admin Architecture

## Goal

Turn BeaconWatch from a single-purpose OWA dashboard into a service-oriented admin application. The root page selects a service, each service owns its pages and API namespace, and SMTP remains a global capability.

## Chosen approach

Use a static service registry and shared service-aware storage. Every service record carries a required `serviceKey`; controllers validate that key against the registry before reading or writing. This avoids duplicated tables and modules while keeping service data isolated.

Rejected alternatives:

- Separate tables and controllers per service duplicate common beacon and email behavior.
- A database-backed service catalog and service CRUD add lifecycle complexity that is not needed while services are developer-defined.

## Service registry

The backend and frontend each expose a small static registry with the same stable contract:

```ts
[
  {
    key: "owa",
    name: "Outlook Web App",
    description: "OWA beacon and captured email monitoring",
    capabilities: ["beacons", "emails"]
  },
  {
    key: "zimbra",
    name: "Zimbra",
    description: "Zimbra captured email monitoring",
    capabilities: ["emails"]
  }
]
```

Unknown service keys return `404` in the API and redirect to `/` in the frontend. New services are added deliberately in code. No service-management UI or database table is introduced.

## Frontend routing

Authenticated routes:

```text
/                         service selection
/owa                      redirect to /owa/beacons
/owa/beacons              OWA beacon dashboard
/owa/beacons/:beaconId    OWA beacon details
/owa/emails               OWA captured emails
/zimbra                   redirect to /zimbra/emails
/zimbra/emails            Zimbra captured emails
/smtp                     global SMTP composer and settings
```

The global header contains Home and SMTP navigation. Service pages add service context and local navigation based on each service capability. OWA shows Beacons and Emails; Zimbra shows only Emails.

The existing mail composer, HTML import, and SMTP settings move out of the OWA emails page into `/smtp`. `/owa/emails` contains only service-scoped received-email browsing and deletion.

## Backend API

Service API:

```text
POST   /api/services/:serviceKey/beacons
GET    /api/services/:serviceKey/beacons
GET    /api/services/:serviceKey/beacons/:beaconId
DELETE /api/services/:serviceKey/beacons
GET    /api/services/:serviceKey/events

POST   /api/services/:serviceKey/emails
GET    /api/services/:serviceKey/emails
DELETE /api/services/:serviceKey/emails/:emailId
DELETE /api/services/:serviceKey/emails
```

The two POST ingestion endpoints remain public and retain their current CORS behavior. Read, delete, and SSE endpoints require the admin session.

Global SMTP API:

```text
POST /api/smtp/send
GET  /api/smtp/settings
PUT  /api/smtp/settings
```

SMTP credentials and settings remain global. Sending email does not require or accept a service key.

The old `/beacons`, `/mails`, `/sse`, `/api/mails`, and `/api/settings/smtp` routes are removed. There are no compatibility aliases.

## Database

Add `serviceKey varchar NOT NULL DEFAULT 'owa'` to `beacons` and `mails`. Existing records become OWA records automatically.

Add indexes:

```text
beacons(serviceKey, receivedAt)
mails(serviceKey, receivedAt)
```

Replace the global unique constraint on `mails.externalId` with:

```text
UNIQUE(serviceKey, externalId)
```

Every repository query includes `serviceKey`. Heartbeat upsert uses `(serviceKey, mbxGuid, type)`. Email duplicate detection uses `(serviceKey, externalId)`. Delete-all operations affect only the selected service.

The physical `mails` table name remains unchanged; “Emails” is the UI and API resource name. `smtp_settings` remains global and unchanged.

## Events

Beacon SSE events include `serviceKey`. Each service event endpoint filters the shared event stream by the requested service key, preventing records from one service from updating another service dashboard.

## Input and errors

- Validate `serviceKey` before invoking repositories.
- Return `404` for an unregistered service.
- Preserve current payload validation for beacons and emails.
- Preserve pagination and limits for received emails.
- Preserve global authentication and SMTP validation.
- Update public-ingest CORS matching to allow only the new beacon and email POST routes and their preflight requests.

## Migration and rollout

1. Build and test the new schema and routes locally.
2. Back up the PostgreSQL volume before deployment.
3. Deploy backend first as part of the same Compose rollout; TypeORM runs the additive migration.
4. Deploy frontend and update OWA payload endpoints to the new OWA API paths.
5. Verify existing rows appear under OWA, new ingestion succeeds, SSE updates OWA only, and SMTP remains functional.

Because legacy routes are intentionally removed, existing test payloads must be rebuilt or edited to use:

```text
/api/services/owa/beacons
/api/services/owa/emails
/api/services/zimbra/emails
```

## Testing

- Registry tests cover known and unknown service keys.
- Beacon tests prove service-scoped create, heartbeat upsert, list, detail, delete, and SSE.
- Email tests prove service-scoped ingestion, duplicate handling, pagination, and deletion.
- Migration tests or direct schema verification prove existing rows default to OWA and uniqueness becomes composite.
- CORS tests prove only new public ingestion routes are allowed.
- Frontend tests cover route construction and service lookup.
- Browser verification covers service selection, OWA navigation, email isolation, and global SMTP navigation.
- Production verification checks the deployed commit, migration, container health, new routes, and removal of legacy routes.
