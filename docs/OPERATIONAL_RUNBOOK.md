# Admiral Framework — Operational Runbook

> Setup, common failures, recovery procedures, and operational reference for the Admiral governance framework.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup](#setup)
3. [Session Lifecycle](#session-lifecycle)
4. [Control Plane Operations](#control-plane-operations)
5. [Hook System Operations](#hook-system-operations)
6. [Brain System Operations](#brain-system-operations)
7. [Fleet Operations](#fleet-operations)
8. [Validation & Health Checks](#validation--health-checks)
9. [Common Failure Scenarios](#common-failure-scenarios)
10. [Recovery Procedures](#recovery-procedures)
11. [Monitoring & Observability](#monitoring--observability)

---

## Prerequisites

### Required Tools

| Tool | Minimum Version | Check Command |
|------|----------------|---------------|
| bash | 4.0+ | `bash --version` |
| jq | 1.6+ | `jq --version` |
| node | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| git | 2.30+ | `git --version` |
| shellcheck | 0.8+ | `shellcheck --version` |

### Optional Tools

| Tool | Purpose | Check Command |
|------|---------|---------------|
| flock | Session state locking (Linux) | `which flock` |
| sha256sum | Audit trail integrity | `which sha256sum` |
| uuidgen | Event ID generation | `which uuidgen` |

### Automated Dependency Check

```bash
admiral/bin/check_dependencies
```

This script verifies all required and optional tools are present and reports their versions.

---

## Setup

### First-Time Setup

1. **Clone and install:**
   ```bash
   git clone <repo-url> helm
   cd helm
   npm install --prefix control-plane
   ```

2. **Build the control plane:**
   ```bash
   npm run build --prefix control-plane
   ```

3. **Verify hooks are executable:**
   ```bash
   chmod +x .hooks/*.sh
   ```

4. **Validate configuration:**
   ```bash
   admiral/bin/validate_config --json
   ```
   Expected: `{"status": "valid", ...}`

5. **Run the test suite:**
   ```bash
   npm test --prefix control-plane
   bash .hooks/tests/test_hooks.sh
   ```

### Claude Code Integration

Hooks are configured in `.claude/settings.local.json`. Claude Code automatically invokes hooks at three lifecycle points:

- **SessionStart** — `session_start_adapter.sh` runs once per session
- **PreToolUse** — `pre_tool_use_adapter.sh` runs before each tool call
- **PostToolUse** — `post_tool_use_adapter.sh` runs after each tool call

No manual hook registration is needed — the settings file maps event types to scripts.

---

## Session Lifecycle

### Session Start Flow

When a Claude Code session begins, `session_start_adapter.sh` executes:

1. **State initialization** — creates/resets `.admiral/session_state.json`
2. **Configuration validation** — runs `validate_config` (fail-open: warns but continues)
3. **Identity validation** — checks agent role/model against `fleet_registry.json` (advisory)
4. **Model tier validation** — verifies the model meets tier requirements (hard-block on critical mismatch, exit 2)
5. **Context baseline** — fires `context_baseline.sh` to measure standing context
6. **Standing Orders injection** — loads all 16 Standing Orders into agent context
7. **Brain context** — loads relevant Brain queries for the session

### Session State

State is stored in `.admiral/session_state.json`:

```json
{
  "session_id": "sess_abc123",
  "started_at": 1711500000,
  "tokens_used": 0,
  "token_budget": 0,
  "tool_call_count": 0,
  "hook_state": {
    "loop_detector": { "error_counts": {}, "total_errors": 0 },
    "brain_context_router": { "brain_queries_count": 0 },
    "zero_trust": { "external_data_count": 0 },
    "compliance": { "flags_count": 0 },
    "pre_work_validator": { "validated": false }
  }
}
```

State is updated after each tool call by the post-tool-use adapter. File locking (`flock`) prevents concurrent corruption.

---

## Control Plane Operations

### Starting the Server

```bash
npm start --prefix control-plane
# Default: http://localhost:4510
```

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check (200 healthy, 503 stale) |
| `/api/events` | GET | All events in stream |
| `/api/alerts` | GET | All alerts (resolved and unresolved) |
| `/api/alerts/active` | GET | Unresolved alerts |
| `/api/alerts/:id/resolve` | GET | Resolve an alert |
| `/api/agents/:id/resume` | GET | Resume a paused agent |
| `/api/trace/ascii` | GET | ASCII execution trace |
| `/api/session` | GET | Current session state |
| `/api/stats` | GET | Trace and ingester statistics |
| `/api/config` | GET | Detector configuration |

See [`control-plane/API.md`](../control-plane/API.md) for full endpoint documentation with curl examples.

### Quick Health Check

```bash
curl -s http://localhost:4510/health | jq .
```

Expected: `"status": "healthy"`. If `"status": "unhealthy"` with stale events, the ingester may be disconnected or the session has been idle.

### Viewing Execution Traces

```bash
# Human-readable trace
curl -s http://localhost:4510/api/trace/ascii

# JSON trace tree
curl -s http://localhost:4510/api/trace | jq .
```

---

## Hook System Operations

### Hook Architecture

All hooks follow the adapter pattern. Two adapters orchestrate the enforcement pipeline:

- **`pre_tool_use_adapter.sh`** — runs enforcement hooks before tool execution
- **`post_tool_use_adapter.sh`** — runs monitoring hooks after tool execution

Individual hooks are invoked by these adapters, not directly by Claude Code.

### Exit Code Contract

| Code | Meaning | Behavior |
|------|---------|----------|
| 0 | Success or fail-open | Tool execution proceeds |
| 1 | Error, fail-open | Hook degraded gracefully; tool proceeds |
| 2 | Hard-block | Tool execution is denied |

See [`ADMIRAL_STYLE.md`](../ADMIRAL_STYLE.md) for the full exit code taxonomy (codes 0–4, 126, 127).

### Hook Inventory

**Pre-Tool-Use Enforcement:**
| Hook | Standing Order | Type |
|------|---------------|------|
| `scope_boundary_guard.sh` | SO-03 | Hard-block |
| `prohibitions_enforcer.sh` | SO-10 | Hard-block |
| `tool_permission_guard.sh` | — | Hard-block |
| `privilege_check.sh` | — | Hard-block |
| `zero_trust_validator.sh` | SO-12 | Advisory |
| `pre_work_validator.sh` | SO-15 | Advisory |

**Post-Tool-Use Monitoring:**
| Hook | Standing Order | Type |
|------|---------------|------|
| `loop_detector.sh` | SO-06 | Advisory |
| `token_budget_tracker.sh` | SO-08 | Advisory |
| `brain_context_router.sh` | SO-05, SO-11 | Advisory |
| `compliance_ethics_advisor.sh` | SO-14 | Advisory |

**Session-Level:**
| Hook | Purpose |
|------|---------|
| `session_start_adapter.sh` | Session initialization |
| `identity_validation.sh` | Agent role validation (S-01) |
| `tier_validation.sh` | Model tier enforcement (S-02) |
| `context_baseline.sh` | Context measurement |
| `context_health_check.sh` | Context health |
| `governance_heartbeat_monitor.sh` | Fleet health |
| `ground_truth_validator.sh` | Ground truth consistency |
| `protocol_registry_guard.sh` | Protocol enforcement |

### Testing Individual Hooks

```bash
# Test with a sample payload
echo '{"tool_name":"Write","tool_input":{"file_path":"src/test.ts"}}' \
  | .hooks/scope_boundary_guard.sh

# Run the full hook test suite
bash .hooks/tests/run_all_tests.sh
```

### Hook Latency

Hook latency benchmarks are in `admiral/benchmarks/`. Expected p95 latencies:

- Pre-tool-use pipeline: < 500ms
- Post-tool-use pipeline: < 300ms
- Individual hooks: < 100ms

If hooks are noticeably slow, check for missing `jq` (falls back to slower parsing) or slow disk I/O on state file access.

---

## Brain System Operations

For tier details, CLI examples, and file layout, see [`docs/BRAIN_USER_GUIDE.md`](BRAIN_USER_GUIDE.md).

### Quick Reference

```bash
# Record a decision
admiral/bin/brain_record --type decision --content "Chose X over Y because..."

# Query the brain
admiral/bin/brain_query --query "authentication patterns"

# Audit brain consistency
admiral/bin/brain_audit
```

### Brain Health

Run `admiral/bin/brain_audit` to check for orphaned entries, stale entries, duplicates, and schema violations.

---

## Fleet Operations

### Fleet Registry

Agent definitions live in `admiral/config/fleet_registry.json`. Each agent has:
- **agent_id** — unique identifier
- **role** — orchestrator, implementer, qa, security, etc.
- **model_tier** — tier1_flagship, tier2_workhorse, etc.
- **capabilities** — what the agent can do
- **tools** — allowed/denied tool lists
- **authority** — autonomous/propose/escalate decision categories

### Validating Fleet Configuration

```bash
admiral/bin/validate_fleet.sh
admiral/bin/validate_agent_definitions.sh
```

### Fleet Health

```bash
# Generate fleet health report
admiral/bin/health_report

# Governance heartbeat (checks fleet liveness)
echo '{}' | .hooks/governance_heartbeat_monitor.sh
```

### Multi-Agent Coordination (Worktrees)

For parallel agent execution, use git worktrees:

```bash
# Spawn an isolated worktree for a worker
admiral/bin/spawn-worktree <branch-name>

# Workers coordinate via branch existence (no external lock service)
# A task branch = a claimed task
git branch -a --list 'task/phase-*/*'
```

---

## Validation & Health Checks

### Available Validators

| Script | Purpose | Invocation |
|--------|---------|------------|
| `validate_config` | Admiral configuration | `admiral/bin/validate_config --json` |
| `validate_fleet.sh` | Fleet registry | `admiral/bin/validate_fleet.sh` |
| `validate_agent_definitions.sh` | Agent definitions | `admiral/bin/validate_agent_definitions.sh` |
| `validate_ground_truth` | Ground truth consistency | `admiral/bin/validate_ground_truth` |
| `validate_boundaries` | Scope boundaries | `admiral/bin/validate_boundaries` |
| `validate_constants_sync` | Constants sync | `admiral/bin/validate_constants_sync` |
| `validate_plan` | Plan/todo consistency | `admiral/bin/validate_plan` |
| `validate_task_criteria` | Task completion criteria | `admiral/bin/validate_task_criteria` |

### Quality Gates

```bash
# Spec-first gate (enforces spec before implementation)
admiral/bin/spec_first_gate

# Go/no-go gate (phase readiness assessment)
admiral/bin/go_no_go_gate

# EDD gate (evaluation-driven design)
admiral/bin/edd_gate <task-id>
```

### Quality Metrics

```bash
# Generate quality metrics report
admiral/bin/quality_metrics

# Phase readiness assessment
admiral/bin/readiness_assess
```

---

## Common Failure Scenarios

### 1. Hook Exits with Code 2 (Hard Block)

**Symptom:** Tool execution denied. Claude Code reports a hook blocked the action.

**Diagnosis:**
- Check which hook blocked: the error JSON includes the hook name
- `scope_boundary_guard.sh` — writing to a protected path (aiStrat/, .env, etc.)
- `prohibitions_enforcer.sh` — attempting a prohibited pattern (force push, --no-verify, etc.)
- `tool_permission_guard.sh` — tool not in agent's allowed list
- `tier_validation.sh` — critical model tier mismatch

**Resolution:**
- If the block is correct: change your approach (use a different path, tool, or command)
- If the block is a false positive: check the hook's pattern list and file a routing suggestion

### 2. Session State Corruption

**Symptom:** Hooks produce unexpected results. State values are nonsensical.

**Diagnosis:**
```bash
jq . .admiral/session_state.json
# If jq fails, the file is corrupt
```

**Resolution:**
- Delete the state file — it will be recreated on next session start:
  ```bash
  rm .admiral/session_state.json
  ```
- The session start adapter reinitializes from the template automatically
- All hooks fail-open (ADR-004), so corrupt state does not block work

### 3. jq Not Found or Wrong Version

**Symptom:** Hooks output raw text instead of JSON. Multiple hooks fail simultaneously.

**Diagnosis:**
```bash
which jq
jq --version
# Requires jq 1.6+
```

**Resolution:**
- Install jq 1.6+: `brew install jq` (macOS) or `apt install jq` (Linux)
- Hooks fall back to basic string operations when jq is missing (fail-open)

### 4. Control Plane Server Won't Start

**Symptom:** `npm start` fails or port 4510 is in use.

**Diagnosis:**
```bash
# Check if port is in use
lsof -i :4510
# Or on Windows:
netstat -ano | findstr :4510
```

**Resolution:**
- Kill the existing process on port 4510
- Rebuild: `npm run build --prefix control-plane`
- Check for TypeScript compilation errors: `npx tsc --noEmit --prefix control-plane`

### 5. Loop Detector Fires Repeatedly

**Symptom:** Loop detector warns about repeated errors, suggesting the agent is stuck.

**Diagnosis:**
```bash
cat .admiral/session_state.json | jq '.hook_state.loop_detector'
```

**Resolution:**
- The loop detector is advisory — it does not block
- Address the underlying error causing repeated failures
- If the loop is a false positive, the counter resets on session restart

### 6. Standing Orders Not Loading

**Symptom:** Agent context is missing Standing Orders. `session_start_adapter.sh` output doesn't include SO text.

**Diagnosis:**
```bash
ls admiral/standing-orders/
# Should contain so01-*.json through so16-*.json
```

**Resolution:**
- Verify Standing Orders source files exist in `admiral/standing-orders/`
- Check `admiral/lib/standing_orders.sh` can render them
- Test rendering: `source admiral/lib/standing_orders.sh; render_standing_orders`

### 7. Brain Query Returns No Results

**Symptom:** `brain_query` returns empty results for known topics.

**Diagnosis:**
```bash
# Check brain entries exist
ls .brain/helm/
# Check entry format
jq . .brain/helm/<any-entry>.json
```

**Resolution:**
- Verify entries exist in `.brain/helm/`
- Check that entry content matches the query keywords (B1 uses grep, not semantic search)
- Run `admiral/bin/brain_audit` to check for schema violations

### 8. Git Worktree Conflicts

**Symptom:** Multiple workers claim the same task or produce merge conflicts.

**Diagnosis:**
```bash
git worktree list
git branch -a --list 'task/phase-*/*'
```

**Resolution:**
- Workers must check for existing task branches before claiming work
- If a branch exists, another worker has claimed that task — skip it
- For merge conflicts: resolve on the task branch before merging to slush

### 9. CI Checks Failing on Valid Code

**Symptom:** Tests pass locally but fail in CI.

**Diagnosis:**
- Check CI logs for environment differences (Node version, OS, missing tools)
- ShellCheck version differences can cause new warnings
- Coverage threshold may have ratcheted up

**Resolution:**
- Match local tool versions to CI (see `.github/workflows/`)
- Run `admiral/bin/check_dependencies` to verify tool versions
- For coverage failures: `npm test --prefix control-plane -- --experimental-test-coverage`

### 10. Configuration Validation Fails at Startup

**Symptom:** Session start warns about invalid configuration.

**Diagnosis:**
```bash
admiral/bin/validate_config --json
# Review specific errors in the output
```

**Resolution:**
- Fix the configuration errors reported
- Configuration validation is fail-open — the session continues despite errors
- Check `admiral/config/` for malformed JSON files

---

## Recovery Procedures

For component-specific recovery, see the relevant failure scenario above. This section covers full system reset only.

### Full State Reset

When the Admiral state is unrecoverable:

```bash
# 1. Remove session state (recreated on next session)
rm -f .admiral/session_state.json

# 2. Remove proofs and confirmations (optional — only if corrupt)
rm -rf .admiral/proofs/ .admiral/confirmations/

# 3. Validate configuration
admiral/bin/validate_config --json

# 4. Start a new session — state reinitializes automatically
```

---

## Monitoring & Observability

### Structured Logging

All hooks produce structured JSON logs on stderr via `admiral/lib/log.sh`:

```json
{
  "timestamp": "2026-03-27T12:00:00Z",
  "level": "info",
  "component": "scope_boundary_guard",
  "correlation_id": "sess_abc123",
  "message": "Path check passed",
  "context": {}
}
```

Log levels: `info`, `warn`, `error`.

### Key Metrics

- **Hook latency** — p50/p95/p99 per hook (from benchmarks)
- **Token usage** — tracked by `token_budget_tracker.sh`
- **Error rates** — tracked by `loop_detector.sh`
- **Brain usage** — tracked by `brain_context_router.sh`
- **Compliance flags** — tracked by `compliance_ethics_advisor.sh`

### Health Aggregation

The control plane provides aggregated health via `/health` and `/api/stats`. The governance heartbeat monitor checks fleet-wide liveness.

### Alert Management

```bash
# View active alerts
curl -s http://localhost:4510/api/alerts/active | jq .

# Resolve an alert
curl -s http://localhost:4510/api/alerts/<alert-id>/resolve

# View all alerts (including resolved)
curl -s http://localhost:4510/api/alerts | jq .
```

---

## Quick Reference

### Key Paths

| Path | Purpose |
|------|---------|
| `.hooks/` | Claude Code hook scripts |
| `.admiral/` | Runtime state (session state, proofs, confirmations) |
| `admiral/lib/` | Shared bash libraries |
| `admiral/bin/` | CLI tools and validators |
| `admiral/config/` | Configuration files |
| `admiral/standing-orders/` | Standing Orders source (SO-01 through SO-16) |
| `control-plane/` | TypeScript observability server |
| `.brain/` | Brain knowledge entries (B1) |
| `docs/` | Project documentation |
| `docs/adr/` | Architecture Decision Records |

### Key Files

| File | Purpose |
|------|---------|
| `.admiral/session_state.json` | Current session state |
| `admiral/config/fleet_registry.json` | Agent definitions and capabilities |
| `ADMIRAL_STYLE.md` | Coding conventions and standards |
| `AGENTS.md` | Agent identity and authority |
| `control-plane/API.md` | HTTP API reference |
