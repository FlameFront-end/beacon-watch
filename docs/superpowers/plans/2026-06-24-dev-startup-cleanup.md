# Dev Startup Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken custom local launcher with standard Vite + Nest dev scripts and fix small correctness issues found during review.

**Architecture:** The root package orchestrates the existing backend and frontend package scripts with `concurrently`. Local backend runs on `PORT=3010` to avoid Docker/WSL port publishing on `3000` and `3001`; frontend remains the Vite app with same-origin proxy to the backend.

**Tech Stack:** npm scripts, concurrently, NestJS, Vite, React, TypeScript.

---

### Task 1: Root Dev Scripts

**Files:**
- Create: `scripts/verify-root-scripts.mjs`
- Modify: `package.json`
- Modify: `README.md`

- [ ] Add a verification script that reads root `package.json` and fails when `dev`, `dev:backend`, or `dev:frontend` reference missing files.
- [ ] Run `node scripts/verify-root-scripts.mjs` and confirm it fails because `scripts/dev.mjs` does not exist.
- [ ] Replace root scripts with direct `npm --prefix` calls and `concurrently`.
- [ ] Run `node scripts/verify-root-scripts.mjs` and confirm it passes.
- [ ] Run `npm run build` and confirm backend and frontend still build.

### Task 2: Runtime Config Documentation

**Files:**
- Modify: `README.md`
- Modify: `frontend/vite.config.ts`

- [ ] Keep Docker backend on `3000`.
- [ ] Keep local backend on `3010`, matching `.env.example`, current `.env`, README, and Vite proxy.
- [ ] Keep Docker ports unchanged.

### Task 3: Targeted Code Quality

**Files:**
- Modify: `backend/src/beacons/beacons.controller.ts`
- Modify: `backend/src/sse/sse.controller.ts`
- Modify: `frontend/src/shared/hooks/use-sse.ts`

- [ ] Replace controller `Promise<unknown>` returns with concrete domain return types.
- [ ] Add an explicit return type to the SSE controller stream method.
- [ ] Catch malformed SSE payload JSON and route it through `onError` rather than throwing from the event handler.

### Task 4: Cleanup And Verification

**Files:**
- Delete: `dev-launcher.err.log`
- Delete: `dev-launcher.out.log`

- [ ] Remove stale launcher logs.
- [ ] Run `node scripts/verify-root-scripts.mjs`.
- [ ] Run `npm run build`.
- [ ] Smoke-test `npm run dev` long enough to confirm Vite and Nest start.
