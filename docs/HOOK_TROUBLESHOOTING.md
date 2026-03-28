# Admiral Framework — Hook Troubleshooting Guide

> Failure modes, debugging steps, and resolution for all Admiral hooks.

---

## Quick Reference

| Hook | Type | Exit 2? | Standing Order |
|------|------|---------|----------------|
| `scope_boundary_guard.sh` | Pre-tool | Yes | SO-03 |
| `prohibitions_enforcer.sh` | Pre-tool | Yes | SO-10 |
| `tool_permission_guard.sh` | Pre-tool | Yes | S-08 |
| `privilege_check.sh` | Pre-tool | Yes | SEC-04 |
| `zero_trust_validator.sh` | Pre-tool | No | SO-12 |
| `pre_work_validator.sh` | Pre-tool | No | SO-15 |
| `loop_detector.sh` | Post-tool | No | SO-06 |
| `token_budget_tracker.sh` | Post-tool | No | SO-08 |
| `brain_context_router.sh` | Post-tool | No | SO-11 |
| `compliance_ethics_advisor.sh` | Post-tool | No | SO-14 |
| `identity_validation.sh` | Session | Yes | S-01 |
| `tier_validation.sh` | Session | Yes | S-02 |
| `governance_heartbeat_monitor.sh` | Post-tool | No | S-03 |
| `ground_truth_validator.sh` | Session | No | ST-06 |
| `protocol_registry_guard.sh` | Pre-tool | Yes | SO-16 |
| `context_baseline.sh` | Session | No | — |
| `context_health_check.sh` | Post-tool | No | — |

**Exit code semantics:** 0 = pass/fail-open, 1 = error/fail-open, 2 = hard-block.

---

## General Debugging Steps

For any misbehaving hook:

```bash
# 1. Test the hook directly with a sample payload
echo '{"tool_name":"Write","tool_input":{"file_path":"test.txt"}}' \
  | .hooks/<hook_name>.sh

# 2. Check exit code
echo $?

# 3. Verify JSON output is valid
echo '{"tool_name":"Read","tool_input":{}}' \
  | .hooks/<hook_name>.sh | jq .

# 4. Check for ShellCheck errors
shellcheck .hooks/<hook_name>.sh

# 5. Run the hook test suite
bash .hooks/tests/test_hooks.sh
```

### Common Cross-Hook Issues

**All hooks return empty output or raw text:**
- Cause: `jq` missing or wrong version
- Fix: Install jq 1.6+ (`jq --version` to check)

**All hooks fail with "source: not found":**
- Cause: `CLAUDE_PROJECT_DIR` not set
- Fix: Export `CLAUDE_PROJECT_DIR` to the repo root before invoking hooks manually

**State-dependent hooks produce stale results:**
- Cause: `.admiral/session_state.json` is corrupt or from a prior session
- Fix: Delete and restart: `rm -f .admiral/session_state.json`

---

## Hard-Block Hooks (Exit 2)

These hooks can deny tool execution. Understanding their failure modes is critical.

### scope_boundary_guard.sh

**What it does:** Blocks writes to protected paths (SO-03).

**Protected paths:** `aiStrat/`, `.github/workflows/`, `.claude/settings`

**Failure modes:**

| Symptom | Cause | Resolution |
|---------|-------|------------|
| Legitimate write blocked | Path matches a protected prefix | Check if the target is genuinely protected. If override is needed, set `ADMIRAL_SCOPE_OVERRIDE=1` |
| False positive on documentation | Protected path name appears in heredoc content | Already handled by heredoc stripping. If still triggering, the heredoc detection may not match — simplify the command |
| Bash write command not detected | Command uses an unrecognized write pattern | The hook detects: `rm`, `mv`, `cp`, `sed -i`, `chmod`, `chown`, `>`, `>>`, `tee`. Other patterns pass through |

**Debug:**
```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"aiStrat/test.md","content":"hello"}}' \
  | .hooks/scope_boundary_guard.sh
# Expected: exit 2, JSON with "blocked" status
```

---

### prohibitions_enforcer.sh

**What it does:** Blocks bypass patterns and irreversible operations (SO-10).

**Hard-block patterns:**
- Bypass: `--no-verify`, `--no-gpg-sign`, `eslint.*--fix.*--quiet`, `chmod.*\.hooks/`
- Irreversible: `rm -rf`, `git reset --hard`, `git commit.*--amend`, `git push.*--force`, `drop table`, `truncate`
- Privilege escalation: `sudo`, `su -`, `chmod 777`, `chown root`, `setuid`

**Advisory patterns (not blocking):**
- Secrets: `password=`, `api_key=`, `token=`, AWS keys, PGP/RSA blocks

**Failure modes:**

| Symptom | Cause | Resolution |
|---------|-------|------------|
| Legitimate command blocked | Command matches a prohibition pattern | Restructure the command. Use `git commit` (not `--amend`), `git push` (not `--force`) |
| False positive on documentation | Pattern appears in a heredoc or comment | Heredoc body is stripped before matching. If still triggering, move the pattern to a separate file |
| Secret advisory on test data | Test fixture contains `password=test` | Use non-matching test values (e.g., `credential: test`) or accept the advisory |

**Debug:**
```bash
echo '{"tool_name":"Bash","tool_input":{"command":"git push --force origin main"}}' \
  | .hooks/prohibitions_enforcer.sh
# Expected: exit 2, JSON with irreversible pattern match
```

---

### tool_permission_guard.sh

**What it does:** Enforces per-agent tool permissions from the fleet registry (S-08).

**Failure modes:**

| Symptom | Cause | Resolution |
|---------|-------|------------|
| Tool unexpectedly blocked | Tool is in the agent's `denied` list | Check `admiral/config/fleet_registry.json` for the agent's tool permissions |
| No enforcement at all | No `agent_id` in session state | Single-agent mode — guard passes through. This is expected for non-fleet sessions |
| Unregistered agent warning | Agent not in registry | Add the agent to `fleet_registry.json` or accept advisory |

---

### privilege_check.sh

**What it does:** Prevents privilege escalation attacks (SEC-04).

**Hard-block triggers:**
1. Agent identity changes mid-session (token binding violation)
2. Writes to fleet registry with escalation patterns (`authority.*tier.*change`, `promote.*autonomous`)
3. Bash commands targeting fleet registry with `sed`/`awk`/`jq`

**Failure modes:**

| Symptom | Cause | Resolution |
|---------|-------|------------|
| Blocked on legitimate registry update | Content matches escalation regex | Restructure the change to avoid escalation-like patterns in content |
| Identity binding failure | `session_agent_id` missing from state | Ensure `identity_validation.sh` ran at session start |

---

### protocol_registry_guard.sh

**What it does:** Enforces MCP server approval and blocks unapproved protocol changes (SO-16).

**Hard-block triggers:**
- Writes to MCP configuration files
- Unapproved MCP server names
- Servers using `"latest"` version

**Failure modes:**

| Symptom | Cause | Resolution |
|---------|-------|------------|
| MCP server blocked | Server not in `admiral/config/approved_mcp_servers.json` | Add the server to the approved list with a specific version |
| `"latest"` version blocked | Version pinning enforced | Specify an exact version number |
| Config edit blocked | File path matches MCP config patterns | Expected behavior — MCP config changes require approved servers |
| False positive on non-MCP file | File name contains "mcp" | Rename if possible, or accept the extra validation |

---

### tier_validation.sh

**What it does:** Validates model tier meets role requirements at session start (S-02).

**Hard-block trigger:** Critical roles (security, orchestrator) assigned to tier 3+ models.

**Tier mapping:**
- Tier 1: Opus, o1, gpt-4o
- Tier 2: Sonnet, gpt-4, claude-3.5
- Tier 3: Haiku, gpt-3.5, Flash
- Tier 4: Mini, Nano, Lite

**Failure modes:**

| Symptom | Cause | Resolution |
|---------|-------|------------|
| Session blocked at start | Critical role on economy model | Use a higher-tier model for security/orchestrator roles |
| "Unknown model" warning | Model name not in tier mapping | Model is new — add to the tier mapping in `tier_validation.sh` |
| No validation occurs | No role field in agent definition | Ensure `fleet_registry.json` has role defined for the agent |

---

## Advisory Hooks (Exit 0 Only)

These hooks never block tool execution. They produce warnings and track metrics.

### zero_trust_validator.sh

**What it does:** Flags external data and injection risks (SO-12).

**Alert types:**
- External data ingestion (WebFetch/WebSearch)
- Prompt injection markers in tool responses
- MCP source injection (CRITICAL — potential server compromise)
- Blast radius warnings on writes to `.hooks/`, `admiral/lib/`, `.claude/`, config files
- Excessive scope in bash (`chmod -R`, `find /`, `git add -A`)

**Common false positives:**
- Configuration URLs in code comments flagged as external data
- Documentation containing injection example patterns
- Legitimate writes to config files flagged for blast radius

**Debug:** Check the `advisory` field in output for the specific concern.

---

### loop_detector.sh

**What it does:** Detects repeated errors suggesting the agent is stuck (SO-06).

**How it works:**
- Error signatures = SHA-256 hash of (agent_id + normalized error), first 16 chars
- Tracks per-signature count and session total
- Success decay: each successful tool call decrements total by 1
- Alerts when same error repeats ≥ threshold or total ≥ threshold

**Failure modes:**

| Symptom | Cause | Resolution |
|---------|-------|------------|
| False loop alert | Unrelated errors with similar normalized text | The signature hash may collide — check actual error messages |
| No alerts despite loops | Intermittent successes resetting the counter | Success decay prevents accumulation — this is by design |
| Counters persist across sessions | State not reset | Delete `.admiral/session_state.json` to reset |

---

### pre_work_validator.sh

**What it does:** Checks context readiness before substantive work (SO-15).

**Checks performed:**
1. Standing Orders loaded
2. Token budget defined (> 0)
3. Minimum prior tool calls (>= 2)
4. Project readiness (AGENTS.md or Ground Truth exists)

**Failure modes:**

| Symptom | Cause | Resolution |
|---------|-------|------------|
| Advisory on every tool call | Validation state not persisting | Check that `hook_state.pre_work_validator.validated` updates in session state |
| "Standing Orders not loaded" | Session start adapter didn't run | Verify `session_start_adapter.sh` is configured in Claude Code settings |
| "Token budget not defined" | Budget set to 0 | Budget of 0 means unlimited — this is a false warning if intentional |

---

### brain_context_router.sh

**What it does:** Detects Propose/Escalate decisions without prior brain queries (SO-11).

**How it works:**
- Tracks `brain_query`/`brain_retrieve` invocations via Bash commands
- Detects ESCALATE/PROPOSE tier markers in Write/Edit content
- Alerts if decision detected without preceding brain query
- Alerts if brain query is stale (> 20 tool calls since last query)

**Failure modes:**

| Symptom | Cause | Resolution |
|---------|-------|------------|
| "Decision without brain query" | Code or text contains tier marker keywords | Run `brain_query` before making Propose/Escalate decisions |
| Stale query warning | Brain not consulted recently | Run a fresh `brain_query` |
| No brain suggestions | Brain entries don't match extracted keywords | Brain B1 uses grep — keywords must match literally |

---

### token_budget_tracker.sh

**What it does:** Estimates and tracks token usage (SO-08).

**Failure modes:**

| Symptom | Cause | Resolution |
|---------|-------|------------|
| Inaccurate token counts | Estimation uses character-based heuristic | Treat as approximate — not suitable for precise budgeting |
| No warnings despite high usage | Budget set to 0 (unlimited) | Set a token budget in session state if tracking is desired |

---

### compliance_ethics_advisor.sh

**What it does:** Detects PII in written content (SO-14).

**PII patterns detected:** Email, SSN, phone, credit card numbers.

**Exclusions (to reduce false positives):** `example.com`, `test.com`, `localhost`, `noreply`, `@anthropic`, `@types/`, version numbers, ports, timeouts.

**Failure modes:**

| Symptom | Cause | Resolution |
|---------|-------|------------|
| False positive on version numbers | Phone/SSN pattern matches numeric formats | Accept the advisory — it's a known limitation of regex-based detection |
| False positive on example emails | Email not in exclusion list | Add the domain to the exclusion list in the hook |
| PII in test fixtures flagged | Test data contains realistic patterns | Use obviously fake data (`test@example.com`, `000-00-0000`) |

---

### identity_validation.sh

**What it does:** Validates agent identity at session start (S-01).

**Failure modes:**

| Symptom | Cause | Resolution |
|---------|-------|------------|
| "Single-agent mode" info | No `agent_id` in session payload | Expected for non-fleet Claude Code sessions |
| Agent not found warning | Agent not in `fleet_registry.json` | Add the agent or check for typos in agent_id |
| No validation at all | Hook not configured in settings | Verify `session_start_adapter.sh` calls `identity_validation.sh` |

---

### governance_heartbeat_monitor.sh

**What it does:** Monitors Sentinel and Arbiter agent health via heartbeats.

**Configuration:**
- `ADMIRAL_HEARTBEAT_INTERVAL_S` — expected interval (default: 60s)
- `ADMIRAL_HEARTBEAT_MISSED_THRESHOLD` — missed beats before alert (default: 2)

**Failure modes:**

| Symptom | Cause | Resolution |
|---------|-------|------------|
| Constant alerts | No governance agents running | Expected in single-agent mode — alerts are informational |
| Timestamp comparison errors | `date` command unavailable | Hook falls back to Python — ensure one is available |
| Alerts despite agents running | Agents not writing heartbeats | Check that governance agents call the heartbeat API |

---

### ground_truth_validator.sh

**What it does:** Validates Ground Truth document at session start (ST-06).

**File search order:** `ground-truth.{yaml,yml,json}`, `.admiral/ground-truth.{yaml,json}`

**Failure modes:**

| Symptom | Cause | Resolution |
|---------|-------|------------|
| "No Ground Truth found" | File missing or in unexpected location | Create a Ground Truth file or check file naming |
| LLM-Last section warning | Missing `llm_last` or `deterministic_first` section | Add the section to the Ground Truth document |
| Validation errors | Schema violations | Run `admiral/bin/validate_ground_truth` manually to see details |

---

### context_baseline.sh / context_health_check.sh

**What they do:** Measure standing context at session start; verify critical sections every 10th tool call.

**Failure modes:**

| Symptom | Cause | Resolution |
|---------|-------|------------|
| SO token count = 0 | Standing Orders directory not found | Verify `admiral/standing-orders/` contains `so01-*.json` through `so16-*.json` |
| Missing critical sections | Context compressed away | Advisory only — sections may be re-injected on next session |
| No health checks running | Hook not invoked often enough | Runs every 10th tool call by design |

---

## Running the Full Test Suite

```bash
bash .hooks/tests/test_hooks.sh
```

This validates:
- All hooks produce valid JSON output
- Exit codes match expected semantics
- Heredoc stripping prevents false positives
- Pattern matching precision (trailing spaces, regex anchors)
- State persistence for memoizing hooks
- Default values for all jq extractions
