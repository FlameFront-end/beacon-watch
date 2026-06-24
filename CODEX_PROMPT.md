# BeaconWatch — Codex Prompt

Build **BeaconWatch** — a local cybersecurity lab dashboard that receives XSS beacon data from a test OWA (Exchange) server and displays it in real time.

> Authorized pentest environment. No auth, no production hardening needed.

---

## Backend

**Stack:** NestJS · TypeScript · TypeORM · PostgreSQL · Swagger

### Project structure

```
backend/
  src/
    beacons/
      beacon.entity.ts
      beacons.controller.ts
      beacons.service.ts
      beacons.module.ts
      dto/
        create-beacon.dto.ts
    sse/
      sse.controller.ts
      sse.service.ts
    app.module.ts
  main.ts
  .env.example
  package.json
```

### Beacon entity

| Field        | Type      | Notes                          |
|--------------|-----------|--------------------------------|
| `id`         | uuid      | primary key, auto              |
| `receivedAt` | timestamp | auto                           |
| `type`       | enum      | `'loot'` \| `'heartbeat'`     |
| `cookies`    | text      | nullable                       |
| `mbxGuid`    | varchar   | nullable                       |
| `forest`     | varchar   | nullable                       |
| `heartbeat`  | varchar   | nullable — `'ONLINE'`/`'OFFLINE'` |
| `httpStatus` | int       | nullable                       |
| `raw`        | jsonb     | full raw payload always stored |

Auto-detect type on save: if `heartbeat` key present → `'heartbeat'`, else → `'loot'`

### Endpoints

| Method   | Path          | Description                                              |
|----------|---------------|----------------------------------------------------------|
| `POST`   | `/beacons`    | Receive beacon from `navigator.sendBeacon` (Content-Type: `text/plain`), parse JSON, save, emit SSE |
| `GET`    | `/beacons`    | All beacons ordered by `receivedAt DESC`, filter: `?type=loot\|heartbeat` |
| `GET`    | `/beacons/:id`| Single beacon                                            |
| `DELETE` | `/beacons`    | Clear all                                                |
| `GET`    | `/sse`        | SSE stream — push new beacon JSON on each POST           |
| `GET`    | `/api`        | Swagger UI                                               |

### Incoming beacon shapes

```json
{ "cookies": "PrivateComputer=true; X-OWA-CANARY=...", "mbxGuid": "4af1441f-...", "forest": "cvelab.local" }
{ "heartbeat": "ONLINE", "status": 200, "mbx": "4af1441f-..." }
```

### Config

`.env` variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `PORT`

TypeORM `synchronize: true` for dev. CORS open.

---

## Frontend

**Stack:** React · TypeScript · Axios · React Router · plain CSS modules

Use a feature-sliced, reference-style architecture similar to `ai-website-generator/app/client`:

- `src/app` for bootstrap, providers, routing, and app shell
- `src/features` for page-level features and isolated domain UI
- `src/shared` for API clients, hooks, utilities, layout widgets, design system, and global styles

### Project structure

```
frontend/
  src/
    app/
      app.tsx
      providers/
      router/
    features/
      beacons/
        pages/
          BeaconsDashboard/
          BeaconDetails/
        components/
        hooks/
        lib/
    shared/
      api/
        axios-instance.ts
        beacons.ts
      hooks/
      lib/
      model/
      styles/
        reset.scss
        variables.scss
        main.scss
      widgets/
        Layout/
      kit/
        Buttons/
        Inputs/
        UI/
          Badge/
          EmptyState/
          Modal/
          Panel/
          Skeleton/
          Spinner/
          Tabs/
    main.tsx
  package.json
```

### Types

```ts
type BeaconType = 'loot' | 'heartbeat'

interface Beacon {
  id: string
  receivedAt: string
  type: BeaconType
  cookies?: string
  mbxGuid?: string
  forest?: string
  heartbeat?: 'ONLINE' | 'OFFLINE'
  httpStatus?: number
  raw: Record<string, unknown>
}
```

### Features

- On mount: `GET /beacons` to load history, then `EventSource('/sse')` for real-time updates, prepending new cards to the top
- **StatsBar** — live counters: Total / Loot / Online / Offline
- **FilterBar** — filter buttons: All | Loot | Heartbeat | Online | Offline
- **BeaconCard** — one card per beacon:
  - Header: local timestamp + type badge
  - Color: `loot` = yellow, `ONLINE` = green, `OFFLINE` = red
  - Key-value table for all non-null fields
  - `cookies` field: split by `; ` and render each cookie as a separate row
  - `X-OWA-CANARY` cookie value highlighted in **red bold**
- **Clear all** button → `DELETE /beacons` + clears local state

### Design

- Match the visual language of `ai-website-generator/app/client`
- Use a compact dashboard shell with sticky header and a left sidebar or left rail for navigation and filters
- Keep the layout card-based, with thin borders, subtle shadows, tight spacing, and clear section hierarchy
- Support light and dark themes through CSS variables; dark mode should feel close to the reference surface palette
- Use a neutral sans-serif font stack such as `Inter` or a close equivalent; do not use monospace for the whole interface
- No UI library; build the design system with plain CSS modules and shared primitives
- Reuse compact primitives from the reference style: buttons, badges, panels, tabs, modals, empty states, skeletons, and spinners

### App Shell

- `Layout` should provide the global shell, header, navigation, theme toggle, and responsive collapse behavior
- The header should stay sticky and show the current page title plus page actions
- The shell should collapse gracefully on mobile into a single-column layout
- Keep the page content centered in a constrained content area with consistent spacing

### UI Rules

- `Panel` for bordered content sections
- `Badge` for status chips and type labels
- `Tabs` for segmented beacon views or filters when a tab interaction is clearer than buttons
- `EmptyState` for loading, empty, and error screens
- `Modal` for destructive actions such as clearing all beacons
- `Skeleton` for history-loading placeholders
- Buttons should follow the reference sizing, radius, and hover behavior

---

## Deliverables

```
beaconwatch/
  backend/
  frontend/
  docker-compose.yml   # postgres + backend + frontend
  README.md            # how to run locally
```
