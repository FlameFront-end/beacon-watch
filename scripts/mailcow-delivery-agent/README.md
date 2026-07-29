# Mailcow delivery agent

This read-only host agent watches the Mailcow Postfix container logs and reports delivery events to Beacon Watch. It does not read message bodies or SMTP passwords.

Required environment:

```text
BEACONWATCH_DELIVERY_EVENTS_URL=https://rtweriu.com/api/internal/smtp/delivery-events
BEACONWATCH_DELIVERY_AGENT_SECRET=<same secret as Beacon Watch DELIVERY_AGENT_SECRET>
```

Optional environment:

```text
MAILCOW_POSTFIX_CONTAINER=mailcowdockerized-postfix-mailcow-1
MAILCOW_DELIVERY_POLL_SECONDS=15
MAILCOW_DELIVERY_LOOKBACK_SECONDS=120
```

Run from the Mailcow VPS with Python 3 and access to the Docker CLI:

```bash
python3 /opt/beacon-watch-mailcow-agent/mailcow_delivery_agent.py
```

The agent uses HMAC-SHA256 over canonical JSON and sends the signature in `X-Delivery-Signature`. Duplicate events are safe because Beacon Watch deduplicates by source and event ID.
