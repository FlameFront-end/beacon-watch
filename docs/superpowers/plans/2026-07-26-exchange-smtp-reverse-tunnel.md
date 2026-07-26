# Exchange SMTP Reverse Tunnel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the public Beacon Watch backend send mail through EX01 SMTP without exposing Exchange port 25 publicly.

**Architecture:** EX01 maintains an outbound SSH connection to the Beacon Watch host. A reverse listener bound only to the Docker bridge forwards backend SMTP traffic to EX01 loopback port 25.

**Tech Stack:** Windows OpenSSH client, Linux OpenSSH server, Windows Task Scheduler, Docker Compose, Nodemailer.

---

### Task 1: Verify endpoint prerequisites

**Files:**
- Read: `/root/beacon-watch/docker-compose.prod.yml`
- Read: `C:\Windows\System32\OpenSSH\ssh.exe`

- [ ] Confirm EX01 has `ssh.exe` and can reach `5.188.86.198:22`.
- [ ] Determine the production Docker network gateway used by the backend.
- [ ] Record the current SSH server settings and production Compose configuration for rollback.

### Task 2: Create the restricted tunnel identity

**Files:**
- Create: `C:\ProgramData\BeaconWatchSmtpTunnel\id_ed25519`
- Create: `C:\ProgramData\BeaconWatchSmtpTunnel\id_ed25519.pub`
- Create: `/home/beacon-smtp-tunnel/.ssh/authorized_keys`

- [ ] Create an unprivileged `beacon-smtp-tunnel` Linux account.
- [ ] Generate a dedicated Ed25519 key on EX01 with no passphrase.
- [ ] Restrict the Windows key directory ACL to SYSTEM and Administrators.
- [ ] Install the public key with forwarding restricted to the selected Docker bridge address and TCP port 2525.

### Task 3: Expose the tunnel only to the backend container

**Files:**
- Modify: `/etc/ssh/sshd_config.d/beacon-smtp-tunnel.conf`
- Modify: `/root/beacon-watch/docker-compose.prod.yml`

- [ ] Enable client-selected reverse-listener addresses in an isolated SSH configuration fragment.
- [ ] Validate the SSH configuration before reloading SSH.
- [ ] Add `host.docker.internal:host-gateway` only to the production backend service.
- [ ] Recreate the backend container and verify its existing health and logs.

### Task 4: Configure persistent EX01 forwarding

**Files:**
- Create: `C:\ProgramData\BeaconWatchSmtpTunnel\known_hosts`
- Create: Windows scheduled task `BeaconWatch SMTP tunnel`

- [ ] Pin the verified public server Ed25519 host key.
- [ ] Create a SYSTEM startup task running:

```text
ssh.exe -N -T -R <docker-gateway>:2525:127.0.0.1:25 -i <private-key> -o BatchMode=yes -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o StrictHostKeyChecking=yes -o UserKnownHostsFile=<known-hosts> beacon-smtp-tunnel@5.188.86.198
```

- [ ] Configure one-minute automatic restart after failure and start the task.

### Task 5: Configure and verify Beacon Watch SMTP

**Files:**
- Modify: stored Beacon Watch SMTP settings through the authenticated API or database.

- [ ] Set SMTP host to `host.docker.internal`, port to `2525`, no SMTP TLS, and no SMTP authentication.
- [ ] Verify the backend container can open the tunnel endpoint.
- [ ] Verify port 2525 is not reachable on the public address.
- [ ] Send a plain-text test message through the application API and confirm SMTP acceptance.
- [ ] Send safe HTML through the application UI and confirm successful API completion.
- [ ] Restart the scheduled task and verify automatic tunnel recovery.

### Task 6: Rollback evidence and handoff

**Files:**
- Read: server and Windows configuration created in previous tasks.

- [ ] Capture the task state, listener binding, container connectivity, and send result without exposing secrets.
- [ ] Document exact rollback targets in the final handoff.
