# Security Incident Response Playbook

Procedures for detecting, containing, investigating, remediating, and learning from security incidents in the Admiral Framework.

## Incident Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P1 Critical** | Active exploitation or data compromise | Immediate | Audit log tampering, identity spoofing in production |
| **P2 High** | Confirmed vulnerability, no active exploitation | < 1 hour | Compromised brain entry, unauthorized tool access |
| **P3 Medium** | Potential vulnerability, unconfirmed | < 4 hours | Suspicious query patterns, unexpected privilege checks |
| **P4 Low** | Security improvement or hardening opportunity | Next session | Missing coverage, configuration drift |

## Response Phases

Every incident follows five phases regardless of severity:

1. **Detection** - Identify the incident and assess severity
2. **Containment** - Stop the spread without destroying evidence
3. **Investigation** - Determine root cause, scope, and impact
4. **Remediation** - Fix the vulnerability and verify the fix
5. **Post-Mortem** - Document lessons and improve defenses

---

## Scenario 1: Compromised Brain Entry

A brain entry contains manipulated content (injected instructions, false facts, or poisoned data) that could influence agent decisions.

### Detection

Indicators:
- Quarantine pipeline flags an entry during retrieval
- Agent produces unexpected output after brain query
- Brain audit shows entry with suspicious provenance (unknown source_agent, missing source_type)
- Contradiction scan fires on write but entry was accepted anyway

Commands:
```bash
# Check recent brain entries for anomalies
brain_audit --recent 50 --format json | jq '.[] | select(.source_type == null or .confidence < 0.5)'

# Search for entries with injection patterns
brain_query --project all --format json | jq '.[] | select(.content | test("ignore|override|system prompt"; "i"))'

# Check quarantine log for recent flags
cat .admiral/security_audit.jsonl | jq 'select(.event_type == "injection_detected")' | tail -20
```

### Containment

Goal: prevent the compromised entry from influencing further agent decisions.

```bash
# 1. Identify the compromised entry
ENTRY_PATH=$(brain_retrieve --id "<entry-id>" --format json | jq -r '.path')

# 2. Quarantine it (move to quarantine, do not delete)
mkdir -p .brain/_quarantined
mv "$ENTRY_PATH" .brain/_quarantined/

# 3. Record quarantine action in audit trail
# (automatic if using brain_purge utility)
brain_purge --id "<entry-id>" --reason "Compromised content detected" --dry-run
brain_purge --id "<entry-id>" --reason "Compromised content detected"

# 4. Check if the entry was used in recent decisions
cat .admiral/event_log.jsonl | jq 'select(.type == "brain_query" and .results[]?.id == "<entry-id>")'
```

### Investigation

```bash
# 1. Check provenance: who created this entry and when?
brain_retrieve --id "<entry-id>" --format json | jq '{source_agent, source_type, source_server, created_at, updated_at}'

# 2. Check the hash chain for tampering around the entry's creation time
bash admiral/lib/audit_integrity.sh

# 3. Look for other entries from the same source
brain_query --format json | jq --arg agent "<source-agent>" '.[] | select(.source_agent == $agent)'

# 4. Check if any entries link to the compromised one
brain_query --format json | jq --arg id "<entry-id>" '.[] | select(.links[]?.target == $id)'

# 5. Review agent session logs around the time of creation
cat .admiral/event_log.jsonl | jq --arg ts "<creation-timestamp>" 'select(.timestamp >= $ts and .timestamp <= ($ts + "T01:00:00Z"))'
```

### Remediation

```bash
# 1. Quarantine all entries from the same untrusted source
brain_query --format json | jq -r --arg agent "<source-agent>" '.[] | select(.source_agent == $agent) | .id' | while read -r id; do
  brain_purge --id "$id" --reason "Source agent compromised"
done

# 2. If the entry was derived from MCP data, flag the MCP server
# Check .admiral/security_audit.jsonl for the server identity

# 3. Re-run affected agent tasks if decisions depended on the compromised entry
# Review the decision log for entries referencing the compromised data

# 4. Add the attack pattern to the quarantine pipeline
# Update admiral/monitor/quarantine/attack_corpus/ with the new pattern

# 5. Verify quarantine pipeline now catches the pattern
bash admiral/monitor/quarantine/tests/test_quarantine.sh
```

### Post-Mortem

Document in `.admiral/incidents/`:
- Entry ID and content summary (redacted if sensitive)
- How it bypassed existing defenses (which quarantine layer missed it?)
- Timeline from entry creation to detection
- Blast radius: which agents and decisions were affected?
- Defense improvements: new quarantine patterns, tighter provenance checks

---

## Scenario 2: Identity Spoofing

An agent operates under a false identity (wrong agent_id, forged session token, or identity token reuse).

### Detection

Indicators:
- `privilege_check.sh` fires identity_change alert
- Security audit shows `privilege_escalation` events with `identity_change` type
- Agent performs actions outside its declared capability set
- Session state shows agent_id mismatch between session start and current

Commands:
```bash
# Check for identity-related security events
cat .admiral/security_audit.jsonl | jq 'select(.event_type == "privilege_escalation" and .details.attempted == "identity_change")'

# Check session state for identity consistency
cat .admiral/session_state.json | jq '{session_agent_id: .agent_id, hook_state}'

# Check tool permission violations (may indicate wrong identity)
cat .admiral/security_audit.jsonl | jq 'select(.event_type == "scope_violation" or .event_type == "tool_permission_denied")'
```

### Containment

```bash
# 1. The privilege_check.sh hook should have already hard-blocked (exit 2)
# Verify the block was effective
cat .admiral/security_audit.jsonl | jq 'select(.action == "blocked")' | tail -5

# 2. If the spoofing bypassed hooks, terminate the session
# Kill any running agent processes
# The session_start_adapter.sh records the session PID

# 3. Invalidate the current session token
# Remove or rotate .admiral/session_state.json
rm .admiral/session_state.json

# 4. Preserve evidence before cleanup
cp -r .admiral/ .admiral_incident_backup_$(date +%Y%m%d_%H%M%S)/
```

### Investigation

```bash
# 1. How did the identity change occur?
# Check the full event log for the session
cat .admiral/event_log.jsonl | jq 'select(.session_id == "<session-id>")' | head -50

# 2. Was the identity token forged or reused from another session?
# Check if the agent_id exists in fleet registry
cat fleet/agents/registry/fleet_registry.json | jq --arg id "<spoofed-id>" '.agents[] | select(.id == $id)'

# 3. What actions were taken under the false identity?
cat .admiral/event_log.jsonl | jq 'select(.agent_id == "<spoofed-id>")'

# 4. Check audit chain integrity (spoofing may have involved log manipulation)
bash admiral/lib/audit_integrity.sh
```

### Remediation

```bash
# 1. Review and revert any actions taken under the false identity
# Check git log for commits made during the spoofed session
git log --after="<incident-start>" --before="<incident-end>" --oneline

# 2. Strengthen identity binding
# Verify privilege_check.sh is in the hook chain
cat .claude/settings.local.json | jq '.hooks'

# 3. Add the spoofing vector to the attack corpus
# Create a new ATK entry in admiral/monitor/quarantine/attack_corpus/

# 4. Run the full security test suite
bash admiral/tests/test_hooks.sh
```

### Post-Mortem

Document:
- How was the identity spoofed? (token reuse, missing validation, hook bypass)
- Was the hard-block effective or did it fail?
- What actions were taken under the false identity?
- Defense improvements: tighter token binding, additional validation points

---

## Scenario 3: Unauthorized Tool Access

An agent invokes a tool outside its declared allowlist (capability set) or accesses a restricted resource.

### Detection

Indicators:
- `tool_permission_guard.sh` fires hard-block
- `scope_boundary_guard.sh` fires for protected path access
- Security audit shows `tool_permission_denied` or `scope_violation` events
- Agent attempts to write to `aiStrat/`, `.github/workflows/`, or other protected paths

Commands:
```bash
# Check for tool permission violations
cat .admiral/security_audit.jsonl | jq 'select(.event_type == "tool_permission_denied")'

# Check for scope boundary violations
cat .admiral/security_audit.jsonl | jq 'select(.event_type == "scope_violation")'

# Check which tools the agent is authorized to use
cat fleet/agents/registry/fleet_registry.json | jq --arg id "<agent-id>" '.agents[] | select(.id == $id) | .tools'
```

### Containment

```bash
# 1. Hooks should have already blocked the action (exit 2)
# Verify by checking the most recent security audit entries
tail -5 .admiral/security_audit.jsonl | jq '.'

# 2. If the tool access succeeded despite hooks, check for:
#    a. Hook not in the chain (misconfiguration)
#    b. Hook returned exit 0 when it should have returned exit 2
#    c. Tool invoked before hooks ran (race condition)

# 3. Check if any files were modified in protected paths
git status
git diff --name-only
```

### Investigation

```bash
# 1. Was the tool in the agent's declared allowlist?
cat fleet/agents/registry/fleet_registry.json | jq --arg id "<agent-id>" '.agents[] | select(.id == $id) | {tools, authority_tier}'

# 2. Was the hook chain intact?
cat .claude/settings.local.json | jq '.hooks.PreToolUse'

# 3. Was there a legitimate override? (e.g., ADMIRAL_OVERRIDE env var)
# Check for override patterns in the session
cat .admiral/event_log.jsonl | jq 'select(.type == "tool_use" and .tool_name == "<tool-name>")'

# 4. Check the prohibitions_enforcer for the specific tool/command
cat .admiral/security_audit.jsonl | jq 'select(.event_type == "prohibition_enforced")'
```

### Remediation

```bash
# 1. If files were modified in protected paths, revert them
git checkout -- <protected-path>

# 2. Verify hook configuration is correct
# All three guards must be present: scope_boundary_guard, tool_permission_guard, prohibitions_enforcer
cat .claude/settings.local.json | jq '.hooks.PreToolUse[].command'

# 3. If the agent's allowlist is wrong, update the fleet registry
# Edit fleet/agents/registry/fleet_registry.json

# 4. Run the hook test suite to verify guards are working
bash .hooks/tests/test_hooks.sh
```

### Post-Mortem

Document:
- Which tool was accessed and what was the target?
- Was this a hook misconfiguration, a bypass, or a legitimate gap?
- What data or state was affected?
- Defense improvements: allowlist tightening, additional guards, test coverage

---

## Scenario 4: Audit Log Tampering

The security audit trail (`.admiral/security_audit.jsonl`) has been modified, truncated, or its hash chain has been broken.

### Detection

Indicators:
- `audit_integrity.sh` reports chain break on startup or periodic check
- Audit log file has unexpected modification time
- Missing entries in the log (gaps in timestamps)
- Chain checkpoint mismatch

Commands:
```bash
# Run integrity check
bash admiral/lib/audit_integrity.sh

# Check file modification time
ls -la .admiral/security_audit.jsonl

# Check last few entries for chain continuity
tail -5 .admiral/security_audit.jsonl | jq '{timestamp, event_type, prev_hash}'

# Compare entry count with expected (based on session activity)
wc -l .admiral/security_audit.jsonl
```

### Containment

This is the most critical scenario because a tampered audit log means you cannot trust any other security assertions.

```bash
# 1. IMMEDIATELY preserve the current state
cp .admiral/security_audit.jsonl .admiral/security_audit.jsonl.evidence.$(date +%Y%m%d_%H%M%S)
cp -r .admiral/ .admiral_tamper_evidence_$(date +%Y%m%d_%H%M%S)/

# 2. Check git for the last known-good version
git log --oneline -- .admiral/security_audit.jsonl | head -5

# 3. Do NOT continue operations until the log is verified
# A compromised audit log means all other security events are suspect
```

### Investigation

```bash
# 1. Find the exact break point in the hash chain
bash admiral/lib/audit_integrity.sh 2>&1 | grep "BREAK\|MISMATCH\|INVALID"

# 2. Compare current log with last git-committed version
git diff HEAD -- .admiral/security_audit.jsonl | head -100

# 3. Check if entries were added, removed, or modified
# Get the last committed version
git show HEAD:.admiral/security_audit.jsonl > /tmp/audit_committed.jsonl
diff <(wc -l < /tmp/audit_committed.jsonl) <(wc -l < .admiral/security_audit.jsonl)

# 4. Check system-level access
# Who or what modified the file outside of the audit library?
# On Linux: check file access with auditd if available

# 5. Cross-reference with event log (separate file, may be intact)
cat .admiral/event_log.jsonl | jq 'select(.type == "security_event")' | tail -20
```

### Remediation

```bash
# 1. Restore from the last known-good checkpoint
# Option A: restore from git
git checkout HEAD -- .admiral/security_audit.jsonl

# Option B: restore from backup
# cp .admiral/backups/security_audit.jsonl.bak .admiral/security_audit.jsonl

# 2. Re-validate the chain
bash admiral/lib/audit_integrity.sh

# 3. Re-run all security checks to regenerate trustworthy events
bash .hooks/tests/test_hooks.sh
bash admiral/tests/test_hook_idempotency.sh

# 4. Investigate whether the tampering masked other incidents
# Compare the tampered log with the restored log
# Look for removed entries that may have recorded other attacks

# 5. Strengthen tamper detection
# Reduce the chain checkpoint interval
# Add file integrity monitoring (inotifywait or similar)
```

### Post-Mortem

Document:
- Where in the chain was the break? (entry number, timestamp range)
- What was the likely method? (direct file edit, process injection, git reset)
- Were any security events removed or modified?
- Were there other incidents hidden by the tampering?
- Defense improvements: more frequent checkpoints, external backup, file integrity monitoring

---

## Standing Orders Integration

The following Standing Orders are directly relevant to incident response:

| SO | Relevance |
|----|-----------|
| **SO-09: Zero-Trust on External Data** | All external data is untrusted until verified through quarantine |
| **SO-10: Prohibitions** | Defines hard limits that, if violated, indicate a potential incident |
| **SO-13: Security Posture** | Requires defense-in-depth; incidents reveal gaps in layers |
| **SO-16: Scope Boundaries** | Violations of scope boundaries are security events |

During an active incident:
- **Do not relax Standing Orders** to work around the incident
- **Do not disable hooks** to bypass blocks caused by the incident
- **Do preserve all evidence** before attempting remediation
- **Do escalate to Admiral** if the incident severity is P1 or involves audit log tampering

## Incident Log Template

Create incident records in `.admiral/incidents/` using this format:

```
Filename: YYYY-MM-DD-<short-description>.md

# Incident: <Short Description>

**Severity:** P1/P2/P3/P4
**Detected:** <timestamp>
**Resolved:** <timestamp>
**Scenario:** 1 (Compromised Brain) / 2 (Identity Spoofing) / 3 (Unauthorized Tool) / 4 (Audit Tampering)

## Timeline
- HH:MM — Detection: <what triggered it>
- HH:MM — Containment: <what was isolated>
- HH:MM — Investigation: <what was found>
- HH:MM — Remediation: <what was fixed>

## Root Cause
<description>

## Blast Radius
- Affected agents: <list>
- Affected data: <list>
- Affected decisions: <list>

## Defense Improvements
- [ ] <improvement 1>
- [ ] <improvement 2>

## Lessons Learned
<what would have prevented or caught this earlier>
```
