# Exchange SMTP reverse tunnel design

## Goal

Allow the Beacon Watch backend on `5.188.86.198` to send mail through the
Exchange SMTP service on EX01 without exposing TCP port 25 to the internet or
granting the public server access to the rest of CVELAB.

## Architecture

EX01 establishes an outbound SSH connection to `5.188.86.198`. The connection
creates a reverse listener on the Docker host bridge. The Beacon Watch backend
connects to that listener through `host.docker.internal`; SSH forwards only
that TCP stream to `127.0.0.1:25` on EX01.

```text
backend container
  -> host.docker.internal:2525
  -> Docker host bridge listener
  -> reverse SSH tunnel
  -> EX01 127.0.0.1:25
```

The reverse listener must not bind to a public interface.

## Server-side controls

- Use a dedicated unprivileged Linux account for the tunnel.
- Authenticate with a dedicated SSH key generated and stored on EX01.
- Restrict the authorized key to remote forwarding and the single approved
  bridge address and port.
- Bind the reverse listener only to the Docker bridge address.
- Add `host.docker.internal:host-gateway` to the production backend container.
- Do not store VM or SSH passwords in the repository, Compose files, database,
  scheduled-task arguments, or application logs.

## EX01 persistence

A Windows scheduled task runs the built-in OpenSSH client at startup under a
local privileged service context. The client uses:

- no interactive shell;
- server-alive probes;
- immediate failure when the requested listener cannot be created;
- automatic task restart after failure;
- strict host-key verification.

The private key directory permits access only to Administrators and SYSTEM.

## Application configuration

Beacon Watch SMTP settings use:

- host: `host.docker.internal`;
- port: `2525`;
- security: no SMTP TLS, because transport over the untrusted network is
  already encrypted by SSH;
- no SMTP authentication;
- the existing sender address.

The SMTP connection remains anonymous only inside the controlled Exchange lab.

## Verification

1. Confirm EX01 can establish SSH to the public server.
2. Confirm the reverse listener is bound only to the Docker bridge address.
3. Confirm the backend container can open `host.docker.internal:2525`.
4. Confirm the listener is not reachable through the public server address.
5. Send a plain-text message from Beacon Watch and confirm Exchange accepts it.
6. Send a safe HTML message and confirm Outlook renders it as HTML.
7. Restart the scheduled task and verify the tunnel recovers.

## Rollback

Disable and remove the EX01 scheduled task and its dedicated key directory.
Remove the dedicated Linux account and authorized key, remove the production
Compose host-gateway entry, and restore the previous SMTP host and port.
