# RCE exploit potential migration implementation plan

**Goal:** introduce a deterministic RCE scoring model, backfill it safely, move the UI and default sorting to the new score, and keep legacy interest scoring only for compatibility.

**Architecture:** one public calculator/service owns the RCE result. The collector, manual recalculation, and backfill all call that same service. Legacy `interestScore` remains read-only compatibility state during migration.

---

### Task 1: schema, entity, DTO, and API projection

**Files:**
- Modify: `backend/src/vulnerability-monitoring/entities/vulnerability.entity.ts`
- Modify: `backend/src/vulnerability-monitoring/dto/vulnerability.dto.ts`
- Modify: `backend/src/vulnerability-monitoring/vulnerability-monitoring.service.ts`
- Modify: `frontend/src/shared/model/vulnerability.ts`

- [ ] Add nullable RCE columns to the entity and preserve legacy fields.
- [ ] Extend DTOs and API projections with the new fields.
- [ ] Make list sorting default to `rcePotentialScore DESC NULLS LAST`.
- [ ] Keep `interestScore` available but deprecated.

### Task 2: deterministic calculator and tests

**Files:**
- Modify: `backend/src/vulnerability-monitoring/scoring/scoring.types.ts`
- Modify: `backend/src/vulnerability-monitoring/scoring/vulnerability-scoring.service.ts`
- Create: `backend/src/vulnerability-monitoring/scoring/vulnerability-scoring.service.test.ts`

- [ ] Define the RCE scoring result shape and version constant.
- [ ] Implement deterministic scoring without legacy-score fallback.
- [ ] Add tests for null behavior, versioning, and scoring paths.

### Task 3: backfill command and safe recomputation

**Files:**
- Create: `backend/src/vulnerability-monitoring/commands/backfill-rce-score.command.ts`
- Create: `backend/src/vulnerability-monitoring/commands/backfill-rce-score.command.test.ts`
- Modify: `backend/src/vulnerability-monitoring/vulnerability-monitoring.module.ts`
- Modify: `backend/src/vulnerability-monitoring/collection/vulnerability-collector.service.ts`
- Modify: `backend/src/vulnerability-monitoring/vulnerability-monitoring.service.ts`

- [ ] Reuse the public calculator/service in collector, recalculate, and backfill.
- [ ] Add `--force`, `--dry-run`, `--batch-size`, and optional CVE filtering.
- [ ] Ensure backfill skips current-version rows unless forced.
- [ ] Prevent notifications, workflow events, and timestamp/status side effects.

### Task 4: UI and sorting switch

**Files:**
- Modify: `frontend/src/features/vulnerability-monitoring/components/VulnerabilityTable.tsx`
- Modify: `frontend/src/features/vulnerability-monitoring/components/ScoreBreakdown.tsx`
- Modify: `frontend/src/features/vulnerability-monitoring/pages/VulnerabilityFeed/VulnerabilityFeed.page.tsx`
- Modify: `frontend/src/features/vulnerability-monitoring/pages/VulnerabilityDetails/VulnerabilityDetails.page.tsx`
- Modify: corresponding `.module.scss`

- [ ] Render `Not calculated` when the RCE score is missing.
- [ ] Move primary sorting and display to `rcePotentialScore`.
- [ ] Keep the table and detail page aligned with the new model.

### Task 5: notification policy gating

**Files:**
- Modify: `backend/src/vulnerability-monitoring/notifications/vulnerability-notification-policy.service.ts`
- Modify: `backend/src/vulnerability-monitoring/notifications/vulnerability-notification.service.ts`
- Modify: `backend/src/vulnerability-monitoring/entities/vulnerability-source.entity.ts` or a feature-flag config location if needed

- [ ] Gate RCE-driven rules until backfill completion or explicit feature flag.
- [ ] Preserve legacy notifications during migration.
- [ ] Ensure backfill recomputation stays silent.

### Task 6: verification

**Files:**
- Modify: `docs/vulnerability-monitoring.md` if rollout guidance needs updating

- [ ] Run lint, typecheck, tests, and production build.
- [ ] Verify control scores for the named sample vulnerabilities.
- [ ] Show the diff for the key files and the migration in the final handoff.
