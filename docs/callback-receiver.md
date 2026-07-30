# Callback receiver

BeaconWatch exposes a public callback endpoint for exploit verification and out-of-band payload evidence.

## Public endpoint

```bash
curl -k -X POST "https://127.0.0.1/api/callback?targetId=test-target" \
  -H "Content-Type: application/json" \
  -d '{"payload":"proof"}'
```

The endpoint always returns `200 OK`:

```json
{ "ok": true }
```

This prevents external exploit probes from retrying because of temporary storage failures. If storage fails, BeaconWatch logs the error to stdout and to `logs/callback-errors.log`.

## Admin endpoints

All admin endpoints require the existing admin session cookie:

- `GET /api/callback`
- `GET /api/callback/:id`
- `DELETE /api/callback/:id`
- `DELETE /api/callback`
- `GET /api/callback/status/latest`

The UI is available at `/callbacks`.

## Stored fields

BeaconWatch stores:

- timestamp
- source IP
- user agent
- method
- full URL
- headers
- query params
- request body
- status
- processed timestamp
- target ID
- extracted payload

## Limits

Runtime defaults:

- `TEXT_BODY_LIMIT=10mb`
- `CALLBACK_RATE_LIMIT_MAX=120`
- `CALLBACK_RATE_LIMIT_WINDOW_MS=60000`
- `CALLBACK_RETENTION_DAYS=30`

Large fields are truncated before storage to keep database growth bounded.

## Retention

Callback events older than `CALLBACK_RETENTION_DAYS` are deleted by a daily cleanup job.
