#!/usr/bin/env python3

import hashlib
import hmac
import json
import os
import re
import subprocess
import time
import urllib.error
import urllib.request
from typing import Any


QUEUE_ID_PATTERN = re.compile(r"\b([A-F0-9]{5,16}):")
MESSAGE_ID_PATTERN = re.compile(r"message-id=(<[^>]+>)")
RECIPIENT_PATTERN = re.compile(r"to=<([^>]+)>")
RELAY_PATTERN = re.compile(r"relay=([^, ]+)")
SMTP_CODE_PATTERN = re.compile(r"dsn=\d\.(\d)\.(\d)")


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


class DeliveryAgent:
    def __init__(self) -> None:
        self.endpoint = required_env("BEACONWATCH_DELIVERY_EVENTS_URL")
        self.secret = required_env("BEACONWATCH_DELIVERY_AGENT_SECRET")
        self.container = os.getenv(
            "MAILCOW_POSTFIX_CONTAINER", "mailcowdockerized-postfix-mailcow-1"
        )
        self.interval = int(os.getenv("MAILCOW_DELIVERY_POLL_SECONDS", "15"))
        self.lookback = int(os.getenv("MAILCOW_DELIVERY_LOOKBACK_SECONDS", "120"))
        self.queue_messages: dict[str, str] = {}
        self.sent_events: set[str] = set()

    def run(self) -> None:
        while True:
            try:
                self.collect_once()
            except Exception as error:  # noqa: BLE001
                print(f"delivery collection failed: {error}", flush=True)
            time.sleep(self.interval)

    def collect_once(self) -> None:
        result = subprocess.run(
            [
                "docker",
                "logs",
                "--since",
                f"{self.lookback}s",
                self.container,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        for line in result.stdout.splitlines():
            self.process_line(line)

    def process_line(self, line: str) -> None:
        queue_id = queue_id_from(line)
        message_match = MESSAGE_ID_PATTERN.search(line)
        if queue_id and message_match:
            self.queue_messages[queue_id] = message_match.group(1)

        message_id = self.queue_messages.get(queue_id or "")
        if not message_id or not queue_id:
            return

        status, error_category = delivery_result(line)
        if not status:
            return

        recipient_match = RECIPIENT_PATTERN.search(line)
        relay_match = RELAY_PATTERN.search(line)
        event_id = hashlib.sha256(
            f"{queue_id}|{status}|{recipient_match.group(1) if recipient_match else ''}|{line}".encode()
        ).hexdigest()
        if event_id in self.sent_events:
            return

        event = {
            "messageId": message_id,
            "eventId": event_id,
            "source": "mailcow-postfix-agent",
            "status": status,
            "queueId": queue_id,
            "mxHost": relay_match.group(1) if relay_match else None,
            "smtpCode": smtp_code(line),
            "errorCategory": error_category,
            "message": clean_message(line),
            "details": {"attempt": 1},
        }
        self.post_event(event)
        self.sent_events.add(event_id)

    def post_event(self, event: dict[str, Any]) -> None:
        payload = canonical_json(event).encode("utf-8")
        signature = hmac.new(self.secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
        request = urllib.request.Request(
            self.endpoint,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "X-Delivery-Signature": signature,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                if response.status >= 300:
                    raise RuntimeError(f"Beacon Watch returned HTTP {response.status}")
        except urllib.error.HTTPError as error:
            raise RuntimeError(f"Beacon Watch returned HTTP {error.code}") from error


def queue_id_from(line: str) -> str | None:
    match = QUEUE_ID_PATTERN.search(line)
    return match.group(1) if match else None


def delivery_result(line: str) -> tuple[str | None, str | None]:
    if "status=sent" in line:
        return "delivered", None
    if "status=deferred" in line:
        return "deferred", error_category(line)
    if "status=bounced" in line:
        return "bounced", error_category(line)
    if "from=<" in line and "queue active" in line:
        return "queued", None
    return None, None


def error_category(line: str) -> str:
    lowered = line.lower()
    if "tls" in lowered:
        return "tls_error"
    if "timeout" in lowered or "network is unreachable" in lowered:
        return "network_timeout"
    if "authentication" in lowered or "auth" in lowered:
        return "authentication_failed"
    if "status=bounced" in lowered or "5." in lowered:
        return "permanent_5xx"
    return "temporary_4xx"


def smtp_code(line: str) -> int | None:
    match = SMTP_CODE_PATTERN.search(line)
    if not match:
        return None
    return int("4" + match.group(1) + match.group(2))


def clean_message(line: str) -> str:
    message = line.split(": ", 1)[-1]
    return re.sub(r"\s+", " ", message)[:500]


def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


if __name__ == "__main__":
    DeliveryAgent().run()
