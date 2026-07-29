# RCE exploit potential migration design

## Goal

Replace the product-facing vulnerability priority model with a deterministic `RCE Exploit Potential` model while keeping the legacy `interestScore` lineage intact for backward compatibility.

The new model must be explicit:

- no fallback from `rcePotentialScore` to `interestScore`;
- missing RCE score means `Not calculated`;
- legacy interest scoring must not influence RCE classification or sorting;
- migration backfill must be safe, idempotent, and silent.

## Data model

Add nullable RCE fields alongside the existing legacy columns:

- `rcePotentialScore`
- `rcePotentialLevel`
- `rcePath`
- `exploitMaturity`
- `rceScoreConfidence`
- `rceScoreVersion`
- `rceScoreBreakdown`
- `rceScoreSummary`
- `rceScoreCalculatedAt`

Legacy fields remain during migration:

- `interestScore`
- `interestReasons`
- `scoreBreakdown`

`exploitMaturity` is shared only as a source signal and must not imply legacy interest semantics.

## Scoring contract

The public calculator/service becomes the single source of truth for:

- live collector scoring;
- manual recalculation;
- backfill command;
- score-related notifications when enabled.

The calculator returns a structured RCE result with:

- numeric score;
- categorical level;
- dominant path;
- confidence;
- version;
- breakdown;
- summary;
- timestamp.

`rceScoreVersion` is always `"rce-v1"` for calculated records.

## Backfill contract

Backfill reuses the same public calculator/service used by normal ingestion.

Backfill must:

- support `--force`;
- support `--dry-run`;
- support `--batch-size`;
- optionally filter by CVE ID;
- skip records already at the current RCE version unless forced;
- never emit notifications;
- never change `lastObserved`;
- never create workflow events;
- never update user-visible CVE status;
- never count as score growth;
- never change collection timestamps or source-watermark semantics.

Backfill is a data repair job only.

## API contract

API responses expose both legacy and RCE fields during migration.

Rules:

- UI and primary sorting use `rcePotentialScore`.
- if `rcePotentialScore` is missing, API/UI show `Not calculated`.
- no `rcePotentialScore ?? interestScore` fallback.
- legacy `interestScore` is returned only as deprecated compatibility data.

Sorting on RCE score must define null ordering explicitly:

- `NULL` values sort last.

## Notification contract

New RCE-driven notification rules are disabled until either:

- backfill is complete; or
- an explicit feature flag enables them.

Migration recalculation must not:

- send notifications;
- mutate `lastObserved`;
- create workflow events;
- update user CVE status;
- count as a score increase event.

Legacy notification behavior remains unchanged until the new rules are enabled.

## Frontend contract

The product-facing UI switches immediately to the RCE model:

- feed/table uses `rcePotentialScore`;
- detail page shows `RCE Exploit Potential`;
- missing score renders `Not calculated`;
- legacy interest score is not shown as the primary ranking signal.

## Rollout

1. Schema and DTO expansion.
2. Deterministic calculator and unit tests.
3. Backfill command and safety gates.
4. UI and sorting switch.
5. Notification policy gating.
6. Verification: lint, typecheck, tests, production build.
