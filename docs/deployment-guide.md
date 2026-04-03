# Admiral Framework Deployment Guide

**GP-08 — Governance Deployment Guide**

This guide covers deploying Admiral as a governance service, from a single developer's local machine to a shared team server. Follow the sections in order if you are deploying for the first time. Skip to the relevant section if you are upgrading or adding integrations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Single-Operator Deployment (Local)](#single-operator-deployment-local)
3. [Team Deployment (Shared Server)](#team-deployment-shared-server)
4. [Infrastructure Requirements](#infrastructure-requirements)
5. [Security Hardening Checklist](#security-hardening-checklist)
6. [Operational Runbook](#operational-runbook)
7. [Integration Recipes](#integration-recipes)

---

## Prerequisites

### Runtime requirements

| Component | Minimum | Notes |
|-----------|---------|-------|
| Node.js | 18.x LTS | `node --version` |
| npm | 9.x | bundled with Node.js |
| Bash | 4.x | POSIX-compatible shell |
| jq | 1.6+ | JSON processing for hooks |
| git | 2.x | Brain B1 versioning |

### Optional (required for team deployment)

| Component | Purpose |
|-----------|---------|
| A reverse proxy (nginx, Caddy) | TLS termination |
| systemd or equivalent | Process supervision |
| Postgres 15+ | Brain B3 (high-scale deployments) |

### Verify prerequisites

```bash
node --version
jq --version
git --version
```

---

## Single-Operator Deployment (Local)

The minimal deployment for one developer. Everything runs on your local machine. No shared infrastructure required.

### Step 1: Clone and install

```bash
git clone https://github.com/your-org/helm.git
cd helm/control-plane
npm install
npm run build
```

### Step 2: Configure the project directory

Admiral reads events from `.admiral/event_log.jsonl` in the project directory. If you are running Admiral against the helm repo itself, that directory already exists. For a different project:

```bash
mkdir -p /path/to/your-project/.admiral
```

### Step 3: Start the control plane

```bash
node dist/src/cli.js --project-dir /path/to/your-project --port 4510
```

Expected output:

```
Admiral Control Plane
  Project: /path/to/your-project
  Port:    4510

  Ingesting: .admiral/event_log.jsonl
Server listening on port 4510
```

### Step 4: Verify the server is running

```bash
curl http://localhost:4510/health
```

A healthy response looks like:

```json
{
  "status": "healthy",
  "uptime_ms": 1234,
  "events": { "total": 0, "last_event_age_ms": 0 },
  "alerts": { "active": 0, "total": 0 },
  "ingester": null
}
```

### Step 5: Install the hooks

Copy the hook scripts from the `admiral/hooks/` directory to your project's `.hooks/` directory, or symlink them:

```bash
cp admiral/hooks/*.sh /path/to/your-project/.hooks/
chmod +x /path/to/your-project/.hooks/*.sh
```

Hooks require `jq` to be on the PATH. Verify:

```bash
which jq
```

### Step 6: Set the API token

The default development token (`admiral-dev-token`) is intentionally weak. For any persistent local deployment, set a real token:

```bash
export ADMIRAL_API_TOKEN="$(openssl rand -hex 32)"
```

Add this to your shell profile (`~/.bashrc`, `~/.zshrc`) or a `.env` file that is gitignored.

### Step 7: Access the dashboard

Open `http://localhost:4510/dashboard` in a browser to view the fleet dashboard.

---

## Team Deployment (Shared Server)

For teams where multiple developers or CI pipelines share a single Admiral control plane. The control plane runs as a persistent service accessible over the network.

### Architecture overview

```
Developers (Claude Code, Cursor, Windsurf)
    │
    ▼
[Reverse Proxy — TLS]  :443
    │
    ▼
[Admiral Control Plane]  :4510 (internal only)
    │
    ├─ .admiral/event_log.jsonl  (event ingestion)
    ├─ Brain B1 (JSON files, git-tracked)
    └─ Brain B3 (Postgres, future)
```

### Step 1: Provision the server

Minimum server specification for teams up to 10 agents: 2 vCPU, 4 GB RAM, 20 GB disk. See [Infrastructure Requirements](#infrastructure-requirements) for sizing guidance.

### Step 2: Install Node.js

On Ubuntu/Debian:

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs jq git
```

On RHEL/Rocky:

```bash
sudo dnf install -y nodejs jq git
```

### Step 3: Create a service user

```bash
sudo useradd --system --shell /bin/bash --home /opt/admiral admiral
sudo mkdir -p /opt/admiral
sudo chown admiral:admiral /opt/admiral
```

### Step 4: Deploy the application

```bash
sudo -u admiral git clone https://github.com/your-org/helm.git /opt/admiral/helm
cd /opt/admiral/helm/control-plane
sudo -u admiral npm install --production
sudo -u admiral npm run build
```

### Step 5: Configure the environment

Create `/etc/admiral/env`:

```bash
sudo mkdir -p /etc/admiral
sudo tee /etc/admiral/env > /dev/null <<'EOF'
ADMIRAL_API_TOKEN=<generate with: openssl rand -hex 32>
ADMIRAL_PROJECT_DIR=/opt/admiral/project
ADMIRAL_PORT=4510
NODE_ENV=production
EOF
sudo chmod 600 /etc/admiral/env
sudo chown admiral:admiral /etc/admiral/env
```

Replace `<generate with: openssl rand -hex 32>` with an actual token. Keep this file secret.

### Step 6: Create the systemd service

Create `/etc/systemd/system/admiral.service`:

```ini
[Unit]
Description=Admiral Control Plane
After=network.target
StartLimitIntervalSec=60
StartLimitBurst=3

[Service]
Type=simple
User=admiral
Group=admiral
WorkingDirectory=/opt/admiral/helm/control-plane
EnvironmentFile=/etc/admiral/env
ExecStart=/usr/bin/node dist/src/cli.js \
  --project-dir ${ADMIRAL_PROJECT_DIR} \
  --port ${ADMIRAL_PORT}
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=admiral
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/admiral/project /opt/admiral/helm

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable admiral
sudo systemctl start admiral
sudo systemctl status admiral
```

### Step 7: Configure the reverse proxy

**Caddy (recommended — automatic TLS):**

Create `/etc/caddy/Caddyfile`:

```
admiral.your-org.internal {
    reverse_proxy localhost:4510
}
```

```bash
sudo systemctl enable caddy
sudo systemctl start caddy
```

**nginx:**

```nginx
server {
    listen 443 ssl;
    server_name admiral.your-org.internal;

    ssl_certificate     /etc/ssl/admiral/fullchain.pem;
    ssl_certificate_key /etc/ssl/admiral/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4510;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Step 8: Distribute the API token

Share the `ADMIRAL_API_TOKEN` value with team members and CI systems through your secret management system (Vault, AWS Secrets Manager, GitHub Actions secrets, etc.). Do not share it via plaintext channels.

### Step 9: Verify the team deployment

From a developer machine:

```bash
curl -H "Authorization: Bearer <token>" https://admiral.your-org.internal/api/v1/health
```

---

## Infrastructure Requirements

Sizing is based on the number of concurrently active agents and the event ingestion rate.

### Compute

| Fleet Size | Agents | CPU | RAM | Notes |
|------------|--------|-----|-----|-------|
| Solo | 1–2 | 1 vCPU | 1 GB | Developer laptop is fine |
| Small team | 3–10 | 2 vCPU | 4 GB | Shared server or small VM |
| Medium team | 11–30 | 4 vCPU | 8 GB | Dedicated VM |
| Large fleet | 31–100 | 8 vCPU | 16 GB | Consider multiple instances |

The control plane is single-threaded Node.js. CPU usage is low unless event volume is very high. Memory is the primary constraint for large event buffers.

### Storage

| Component | Requirement | Notes |
|-----------|------------|-------|
| Application | 500 MB | Node.js + compiled TypeScript |
| Brain B1 | 1 GB per year | JSON files, git-tracked, grows with usage |
| Event log | 100 MB per agent per month | `.admiral/event_log.jsonl`, rotate weekly |
| Audit logs | 200 MB per year | Structured JSON, archive after 90 days |

### Database

**Brain B1 (current):** No database required. JSON files stored in the `.brain/` directory and git-tracked.

**Brain B3 (high-scale, future):** Postgres 15+. Required when Brain B1 file count exceeds 10,000 entries or query latency becomes unacceptable.

Postgres sizing for Brain B3:
- Storage: 10 GB base, grows ~1 GB per 100K entries
- RAM: 2–4 GB for Postgres shared buffers
- Connection pool: 10–20 connections from control plane

### Network

- Control plane binds to `localhost:4510` by default. The reverse proxy handles external access.
- Agents send events to `.admiral/event_log.jsonl` on the local filesystem (no network required for ingestion).
- Webhook integrations (Slack, PagerDuty, Jira) require outbound HTTPS from the server.
- MCP server integration requires agents to reach the control plane over HTTPS.

### Ports

| Port | Service | Exposure |
|------|---------|----------|
| 4510 | Admiral control plane | Internal only (reverse proxy) |
| 443 | Reverse proxy (TLS) | External |
| 5432 | Postgres (Brain B3) | Internal only |

---

## Security Hardening Checklist

Work through this list before making Admiral accessible over the network or to multiple operators.

### Authentication

- [ ] Set a strong `ADMIRAL_API_TOKEN` (minimum 32 bytes of randomness: `openssl rand -hex 32`)
- [ ] Never use the default development token (`admiral-dev-token`) in any persistent deployment
- [ ] Rotate the API token at least quarterly; immediately after any suspected exposure
- [ ] Store the token in a secrets manager, not in source code or dotfiles

### Network

- [ ] Bind the control plane to `127.0.0.1` only; never expose port 4510 directly to the network
- [ ] Terminate TLS at the reverse proxy; use a valid certificate (Let's Encrypt via Caddy, or your org's CA)
- [ ] Restrict reverse proxy access to known IP ranges if the team is on a VPN or fixed IP block
- [ ] Disable HTTP/plain-text access at the reverse proxy level
- [ ] Configure HSTS if the dashboard is accessed via browser

### Process isolation

- [ ] Run the control plane as a dedicated non-root service user (`admiral`)
- [ ] Use systemd `NoNewPrivileges=true`, `PrivateTmp=true`, `ProtectSystem=strict`
- [ ] The service user should have read/write access only to the project directory and application files
- [ ] Do not run the control plane as root under any circumstances

### Audit log protection

- [ ] The event log (`.admiral/event_log.jsonl`) must not be writable by agent processes directly; only the ingester reads it
- [ ] Archive audit logs to write-once storage (S3 with Object Lock, or similar) monthly
- [ ] Verify log integrity by checking git history for Brain B1 entries: `git log --oneline .brain/`
- [ ] Do not allow log files to be deleted without a retention policy review

### Hook script security

- [ ] All hook scripts in `.hooks/` must be executable and owned by the service user
- [ ] Review hook scripts with ShellCheck before deployment: `shellcheck .hooks/*.sh`
- [ ] Hook scripts must not accept untrusted input without validation
- [ ] Hook scripts must not write secrets to the event log

### Secrets in configuration

- [ ] Ensure `/etc/admiral/env` has mode `600` and is owned by the service user
- [ ] Confirm the env file is not tracked in git: add it to `.gitignore`
- [ ] Run `git secrets` or `truffleHog` on the repository before each release to detect accidentally committed secrets

### Dependency audit

- [ ] The control plane has zero runtime npm dependencies. Verify: `npm ls --production` in `control-plane/`
- [ ] Run `npm audit` after any `npm install` to check development dependencies
- [ ] Pin the Node.js version in the systemd service or use `nvm` with a `.nvmrc` file

---

## Operational Runbook

### Health monitoring

**Check server health:**

```bash
curl -s http://localhost:4510/health | jq .
```

A `status: "healthy"` response with `last_event_age_ms` under 300,000 (5 minutes) indicates normal operation.

**Check active alerts:**

```bash
curl -s -H "Authorization: Bearer $ADMIRAL_API_TOKEN" \
  http://localhost:4510/api/alerts/active | jq .
```

**View current fleet status:**

```bash
curl -s -H "Authorization: Bearer $ADMIRAL_API_TOKEN" \
  http://localhost:4510/api/v1/fleet | jq .
```

**Set up a cron health check:**

Add to the service user's crontab (`crontab -u admiral -e`):

```cron
*/5 * * * * curl -sf http://localhost:4510/health | grep -q '"status":"healthy"' || \
  echo "Admiral unhealthy at $(date)" | mail -s "Admiral Alert" ops@your-org.com
```

Or integrate with your existing monitoring (Prometheus, Datadog, etc.) by scraping the `/health` endpoint.

### Viewing logs

**systemd journal:**

```bash
journalctl -u admiral -f
journalctl -u admiral --since "1 hour ago"
```

**Event log:**

```bash
tail -f /opt/admiral/project/.admiral/event_log.jsonl | jq .
```

**Filter by agent:**

```bash
jq 'select(.agentId == "helm")' /opt/admiral/project/.admiral/event_log.jsonl
```

### Backup procedures

**Brain B1 (JSON files):**

Brain B1 is git-tracked. Back it up by pushing to a remote:

```bash
git -C /opt/admiral/project push origin main
```

Schedule daily pushes via cron:

```cron
0 2 * * * git -C /opt/admiral/project push origin main 2>&1 | \
  logger -t admiral-backup
```

**Event log:**

Rotate and archive the event log weekly:

```bash
# Archive last week's events
WEEK=$(date -d "last week" +%Y-W%V)
cp .admiral/event_log.jsonl ".admiral/archive/event_log-${WEEK}.jsonl"
> .admiral/event_log.jsonl  # truncate in place (keeps inode for running ingester)
gzip ".admiral/archive/event_log-${WEEK}.jsonl"
```

**Control plane configuration:**

```bash
sudo cp /etc/admiral/env /etc/admiral/env.bak.$(date +%Y%m%d)
```

### Upgrade path

1. Read the release notes for the new version.
2. Stop the service: `sudo systemctl stop admiral`
3. Back up the current install: `cp -r /opt/admiral/helm /opt/admiral/helm.bak.$(date +%Y%m%d)`
4. Pull the new version:
   ```bash
   sudo -u admiral git -C /opt/admiral/helm pull
   cd /opt/admiral/helm/control-plane
   sudo -u admiral npm install
   sudo -u admiral npm run build
   ```
5. Start the service: `sudo systemctl start admiral`
6. Verify health: `curl -s http://localhost:4510/health | jq .status`
7. If the health check fails, roll back: `sudo systemctl stop admiral`, restore the backup, start.

### Resolving common issues

**Server not starting — port in use:**

```bash
lsof -i :4510
# Kill the conflicting process or change the port in /etc/admiral/env
```

**Health endpoint returns 503 — events stale:**

The ingester has not seen an event in more than 5 minutes. This is normal when no agents are active. If agents are running but the server reports stale events:

1. Check that `.admiral/event_log.jsonl` exists and is being written: `ls -la .admiral/event_log.jsonl`
2. Check that the ingester is pointing at the right project directory.
3. Restart the service: `sudo systemctl restart admiral`

**Authentication failures (401):**

- Confirm the `ADMIRAL_API_TOKEN` env var is set in `/etc/admiral/env`.
- Confirm the client is sending the token as `Authorization: Bearer <token>`.
- Check for trailing newlines in the token value: `cat -A /etc/admiral/env | grep TOKEN`.

**Hook scripts not executing:**

- Verify scripts are executable: `ls -la .hooks/`
- Check `jq` is installed: `which jq`
- Run the hook manually with a test payload:
  ```bash
  echo '{"hookName":"pre-commit","agentId":"test","event":"tool_call","data":{}}' | \
    .hooks/pre_tool_call.sh
  ```

### Disaster recovery

**Scenario: server disk failure.**

1. Provision a new server following [Team Deployment](#team-deployment-shared-server).
2. Restore Brain B1 from git: `git clone <remote> /opt/admiral/project`
3. Restore the `ADMIRAL_API_TOKEN` from your secrets manager.
4. Update DNS or reverse proxy configuration to point to the new server.
5. Notify agents to reconnect.

**Scenario: corrupted event log.**

The event log is ephemeral — the control plane holds events in memory. A corrupted log file only affects historical query. Truncate and restart:

```bash
sudo systemctl stop admiral
> /opt/admiral/project/.admiral/event_log.jsonl
sudo systemctl start admiral
```

---

## Integration Recipes

### Recipe 1: GitHub Actions CI/CD

Run Admiral governance checks as part of a pull request pipeline using the Headless adapter.

**Prerequisites:** `ADMIRAL_API_TOKEN` stored as a GitHub Actions secret named `ADMIRAL_TOKEN`.

**.github/workflows/admiral-governance.yml:**

```yaml
name: Admiral Governance Check

on:
  pull_request:
    branches: [main]

jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install Admiral control plane
        working-directory: control-plane
        run: |
          npm install
          npm run build

      - name: Start Admiral (background)
        working-directory: control-plane
        env:
          ADMIRAL_API_TOKEN: ${{ secrets.ADMIRAL_TOKEN }}
        run: |
          node dist/src/cli.js --project-dir .. --port 4510 &
          sleep 3  # wait for startup

      - name: Verify governance health
        run: |
          STATUS=$(curl -sf http://localhost:4510/health | jq -r .status)
          if [ "$STATUS" != "healthy" ] && [ "$STATUS" != "degraded" ]; then
            echo "Admiral not responding: $STATUS"
            exit 1
          fi
          echo "Admiral status: $STATUS"

      - name: Check for active governance alerts
        env:
          ADMIRAL_API_TOKEN: ${{ secrets.ADMIRAL_TOKEN }}
        run: |
          ACTIVE=$(curl -sf \
            -H "Authorization: Bearer $ADMIRAL_API_TOKEN" \
            http://localhost:4510/api/alerts/active | jq length)
          echo "Active alerts: $ACTIVE"
          if [ "$ACTIVE" -gt 0 ]; then
            echo "Governance alerts detected — review before merge"
            curl -sf \
              -H "Authorization: Bearer $ADMIRAL_API_TOKEN" \
              http://localhost:4510/api/alerts/active | jq .
            exit 1
          fi
```

**Event-driven trigger (PR opened):**

To trigger a governance agent when a PR opens, add a workflow step that posts to the Admiral governance API:

```yaml
      - name: Register PR with Admiral
        env:
          ADMIRAL_API_TOKEN: ${{ secrets.ADMIRAL_TOKEN }}
        run: |
          curl -sf -X POST \
            -H "Authorization: Bearer $ADMIRAL_API_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"type\": \"pr_opened\", \"pr\": \"${{ github.event.number }}\", \"branch\": \"${{ github.head_ref }}\"}" \
            http://localhost:4510/api/v1/events
```

---

### Recipe 2: Slack Notifications

Send governance alerts to a Slack channel when the control plane detects policy violations or runaway patterns.

**Prerequisites:**

- A Slack app with an incoming webhook URL. Create one at `api.slack.com/apps`.
- Store the webhook URL as `SLACK_WEBHOOK_URL` in `/etc/admiral/env`.

**Configure the Slack integration via the governance API:**

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIRAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "slack-critical-alerts",
    "type": "slack",
    "config": {
      "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
      "channel": "#admiral-alerts",
      "severityThreshold": "high",
      "eventFilter": ["policy_violation", "runaway_detected", "emergency_halt"]
    }
  }' \
  https://admiral.your-org.internal/api/v1/webhooks
```

**Payload format (Slack Block Kit):**

The Admiral Slack formatter (GP-10) sends structured Block Kit messages. Example alert:

```
[CRITICAL] Policy Violation — Detected in agent: helm
Rule: no-prod-writes
Action blocked: bash (rm -rf /var/db/*)
Time: 2026-03-26 05:14:22 UTC
```

**Test the webhook:**

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIRAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "test", "severity": "info", "detail": {"message": "Webhook test"}}' \
  https://admiral.your-org.internal/api/v1/webhooks/slack-critical-alerts/test
```

**Severity routing:**

| Severity | Recommended Channel | On-call? |
|----------|-------------------|---------|
| `critical` | #admiral-incidents | Yes (PagerDuty) |
| `high` | #admiral-alerts | No |
| `medium` | #admiral-alerts | No |
| `low` | #admiral-governance | No |
| `info` | Suppress or digest | No |

---

### Recipe 3: PagerDuty Incidents

Trigger PagerDuty incidents for critical governance events (emergency halts, budget exhaustion, security violations).

**Prerequisites:** A PagerDuty integration key (Events API v2).

**Configure PagerDuty webhook:**

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIRAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "pagerduty-critical",
    "type": "pagerduty",
    "config": {
      "integrationKey": "YOUR_PAGERDUTY_INTEGRATION_KEY",
      "severityThreshold": "critical",
      "eventFilter": ["emergency_halt", "runaway_detected", "budget_exhausted"]
    }
  }' \
  https://admiral.your-org.internal/api/v1/webhooks
```

---

### Recipe 4: Generic Webhook (Custom Integration)

For any HTTP endpoint — internal dashboards, audit systems, SIEM tools.

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIRAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "siem-integration",
    "type": "generic",
    "config": {
      "url": "https://siem.your-org.internal/ingest",
      "headers": {
        "X-Source": "admiral",
        "X-API-Key": "your-siem-api-key"
      },
      "severityThreshold": "medium",
      "retryAttempts": 3,
      "retryBackoffMs": 1000
    }
  }' \
  https://admiral.your-org.internal/api/v1/webhooks
```

The generic webhook sends JSON payloads matching the `AuditEvent` schema:

```json
{
  "id": "uuid",
  "timestamp": "ISO8601",
  "type": "event_type",
  "severity": "critical|high|medium|low|info",
  "source": "agent-id",
  "detail": {}
}
```

---

## Next Steps

- **GP-09 — Configuration management:** Version-controlled governance configurations with rollback.
- **GP-10 — Webhook integrations:** Full Slack, PagerDuty, Jira, and generic webhook support.
- **Brain B3:** Postgres-backed knowledge graph for high-scale deployments.
- **Multi-tenant:** Tenant-scoped policies and event streams for organizations running multiple independent fleets.

## Reference

- Control plane API: `control-plane/API.md`
- Hook contracts: `admiral/hooks/`
- Platform adapters: `platform/adapters/`
- Capability matrix: `docs/platform-capability-matrix.md`
- Architecture decisions: `docs/adr/`
