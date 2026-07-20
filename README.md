# BeaconWatch

BeaconWatch is a local dashboard for receiving XSS beacon payloads from a test OWA / Exchange environment and displaying them in real time.

## Stack

- Backend: NestJS, TypeScript, TypeORM, PostgreSQL, Swagger
- Frontend: React, TypeScript, Axios, React Router, CSS Modules

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
- frontend on `http://localhost:5173`
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

- Frontend: `http://localhost:8081`
- Backend API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api`
- PostgreSQL: `localhost:5432`

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
- `GET /sse`
- `GET /api`

`POST /beacons` is public so beacon senders can continue ingesting payloads.
The dashboard, `GET/DELETE /beacons`, `GET /beacons/:id`, and `/sse` require
the admin session cookie created by `POST /auth/login`.
