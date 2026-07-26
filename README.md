# BeaconWatch

BeaconWatch is a local dashboard for receiving XSS beacon payloads from a test OWA / Exchange environment and displaying them in real time.

## Stack

- Backend: NestJS, TypeScript, TypeORM, PostgreSQL, Swagger
- Frontend: React, TypeScript, Axios, Wouter, CSS Modules

## Run locally

Install dependencies for the root launcher, backend, and frontend:

```bash
npm install
cd backend
npm install
cd ../frontend
npm install
```

Copy the root environment example when local defaults are enough:

```bash
cd ..
copy .env.example .env
```

Start the full local stack:

```bash
npm run dev
```

This starts:

- backend on `http://localhost:3010`
- frontend on `https://localhost:5173`
- Swagger on `http://localhost:3010/api`

The Vite dev server proxies API requests to `http://localhost:3010`.

### Backend only

```bash
cd backend
npm run dev
```

### Frontend only

```bash
cd frontend
npm run dev
```

### Full stack with Docker

```bash
docker compose up --build
```

Ports:

- Frontend: `http://localhost` and `https://localhost`
- Backend API: `http://127.0.0.1:3000`
- Swagger: `http://127.0.0.1:3000/api`
- PostgreSQL: available only to containers on the Compose network

## Environment

Backend reads `.env` from `backend/.env` first and falls back to the repository root `.env`.

Backend variables:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`
- `PORT`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `AUTH_SESSION_SECRET`
- `AUTH_SESSION_TTL_SECONDS`
- `AUTH_COOKIE_SECURE`
- `CORS_ORIGINS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_REQUIRE_TLS`
- `SMTP_FROM`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_TIMEOUT_MS`
- `SMTP_SETTINGS_ENCRYPTION_KEY`

Keep `SMTP_SETTINGS_ENCRYPTION_KEY` stable and separate from
`AUTH_SESSION_SECRET`. Changing it makes an already stored SMTP password
impossible to decrypt; update the SMTP settings again after an intentional key
rotation.

SMTP connection security is explicit:

- `SMTP_SECURE=true` uses implicit TLS, normally on port 465.
- `SMTP_REQUIRE_TLS=true` requires STARTTLS, normally on port 587.
- Both values `false` disable TLS and are accepted only for anonymous relays.

Do not enable both TLS variables together. SMTP authentication is rejected
unless one encrypted mode is selected. `CORS_ORIGINS` is empty for the
same-origin UI; set it to a comma-separated list of exact HTTP(S) origins only
when a separate frontend origin is required. Public `POST /beacons` and
`POST /mails` ingestion accepts cross-origin requests without credentials;
admin and authentication routes do not.

Frontend variables:

- `VITE_API_URL`

If you prefer a single root env file, copy [.env.example](./.env.example) to `.env` in the repository root. The backend will pick it up automatically.
Keep `VITE_API_URL` empty for local `npm run dev`; Vite proxies API requests through the frontend origin so the admin session cookie works as a same-origin cookie.

## API

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /beacons`
- `GET /beacons`
- `GET /beacons/:id`
- `DELETE /beacons`
- `GET /api/mails`
- `POST /api/mails/send`
- `POST /mails`
- `GET /sse`
- `GET /api`

`POST /beacons` is public so beacon senders can continue ingesting payloads.
`POST /mails` is public and stores new mail payloads while skipping duplicate mail IDs.
`GET /api/mails` requires the admin session cookie and returns the newest stored mails with a bounded list size.
`POST /api/mails/send` requires the admin session cookie and sends a message
through the configured SMTP server. The optional `html` field is sent unchanged
used as the HTML representation.
Safe inline email styles, table layout, and HTTPS/CID images are preserved.
Scripts, event handlers, unsafe URLs, and unsafe CSS are removed. If `text` is
omitted, the backend generates a plain-text alternative from the submitted
HTML.
The dashboard, `GET/DELETE /beacons`, `GET /beacons/:id`, and `/sse` require
the admin session cookie created by `POST /auth/login`.
