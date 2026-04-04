# Admiral Framework — Security Model

> Threat model, attack surfaces, defense layers, and quarantine architecture for the Admiral governance framework.

---

## Table of Contents

1. [Security Philosophy](#security-philosophy)
2. [Threat Model](#threat-model)
3. [Attack Surfaces](#attack-surfaces)
4. [Defense Layers](#defense-layers)
5. [Identity & Authorization](#identity--authorization)
6. [Injection Prevention](#injection-prevention)
7. [Quarantine Pipeline](#quarantine-pipeline)
8. [Secret Detection](#secret-detection)
9. [Privilege Escalation Defense](#privilege-escalation-defense)
10. [Audit Trail](#audit-trail)
11. [Residual Risks](#residual-risks)

---

## Security Philosophy

**Core thesis:** Deterministic enforcement beats probabilistic defense.

The Admiral security model is built on three principles:

1. **Deterministic first.** The first three defense layers use pure bash, regex, and jq. No LLM involvement. An attacker who can fool a model-based detector has already won if that detector is the first line of defense.
2. **Fail-open for advisory, fail-closed for critical.** Advisory hooks (exit 0/1) never block work. Hard-block hooks (exit 2) deny tool execution for security violations. See [`ADMIRAL_STYLE.md`](../ADMIRAL_STYLE.md) for the full exit code taxonomy.
3. **Defense-in-depth.** No single layer is sufficient. Every security concern is addressed at multiple levels: hook enforcement, quarantine pipeline, audit trail, and Standing Orders.

---

## Threat Model

### Threat Actors

| Actor | Capability | Motivation |
|-------|-----------|------------|
| Prompt injection via input | Attacker-controlled text in tool responses, MCP server output, or user input | Override agent behavior, extract secrets, bypass governance |
| Compromised MCP server | Malicious tool descriptions or responses from an MCP server | Inject instructions, poison agent context, exfiltrate data |
| Rogue agent | A fleet agent attempting to exceed its authority | Privilege escalation, scope violation, bypass enforcement |
| Supply chain | Compromised dependencies or CI pipeline | Code execution, credential theft |

### Threat Categories

The attack corpus tracks 30 scenarios (ATK-XXXX format) across six categories:

| Category | Examples | Severity |
|----------|----------|----------|
| **Injection** | Role override, behavior manipulation, system prompt rewrite | Critical |
| **Privilege** | Authority tier self-modification, identity spoofing, registry manipulation | Critical |
| **MCP** | Tool poisoning via description drift, server impersonation | High |
| **A2A** | Agent-to-agent content injection, trust boundary violations | High |
| **Temporal** | Scope creep across sessions, sleeper behavior patterns | Medium |
| **Data** | PII exfiltration, secret exposure, unauthorized data classification | High |

---

## Attack Surfaces

### 1. Tool Input/Output (Primary)

Every tool call is a potential injection vector. Attacker-controlled text in file contents, web responses, or MCP tool output can contain instructions that an LLM agent might follow.

**Defense:** Pre-tool-use enforcement pipeline (6 hooks), post-tool-use monitoring (4 hooks), quarantine for high-risk content.

### 2. MCP Server Responses

MCP servers return tool descriptions and execution results. A compromised server can inject instructions via either channel.

**Defense:** Protocol registry guard (SO-16) enforces server approval and version pinning. Zero-trust validator flags MCP source injection as CRITICAL.

### 3. Session State

`.admiral/session_state.json` tracks hook state, token counts, and agent identity. Corruption or manipulation can disable enforcement.

**Defense:** File locking (flock), identity token binding, state corruption detection with automatic reinitialization.

### 4. Configuration Files

`fleet_registry.json`, `approved_mcp_servers.json`, and other config files define security policy. Unauthorized modification bypasses governance.

**Defense:** Scope boundary guard hard-blocks config writes. Privilege check blocks registry manipulation via bash.

### 5. Standing Orders Source

Standing Orders in `admiral/standing-orders/` define governance rules. Modification changes enforcement behavior.

**Defense:** Scope boundary guard protects the directory. Ground truth validator checks consistency at session start.

---

## Defense Layers

The Admiral security model implements defense-in-depth across four enforcement tiers:

```
┌─────────────────────────────────────────────────┐
│  Layer 1: Hook Enforcement (Runtime)             │
│  6 hard-block + 11 advisory hooks               │
│  Every tool call passes through the pipeline     │
├─────────────────────────────────────────────────┤
│  Layer 2: Quarantine Pipeline (Content)          │
│  5-layer analysis: format → structural →         │
│  semantic → LLM advisory → antibodies            │
├─────────────────────────────────────────────────┤
│  Layer 3: Audit Trail (Detection)                │
│  Append-only, SHA-256 hash-chained JSONL log     │
│  Tamper-evident event recording                  │
├─────────────────────────────────────────────────┤
│  Layer 4: Standing Orders (Policy)               │
│  16 governance rules, 9 hook-enforced            │
│  Policy-as-code with deterministic enforcement   │
└─────────────────────────────────────────────────┘
```

### Hook Enforcement Pipeline

**Pre-tool-use (blocks before execution):**

| Hook | Threat Addressed | Action |
|------|-----------------|--------|
| `scope_boundary_guard.sh` | Scope violation | Hard-block writes to protected paths |
| `prohibitions_enforcer.sh` | Bypass/irreversible ops | Hard-block dangerous patterns |
| `tool_permission_guard.sh` | Unauthorized tool use | Hard-block denied tools per agent |
| `privilege_check.sh` | Privilege escalation | Hard-block identity/authority changes |
| `protocol_registry_guard.sh` | MCP supply chain | Hard-block unapproved servers |
| `zero_trust_validator.sh` | External data injection | Advisory on untrusted sources |

**Post-tool-use (monitors after execution):**

| Hook | Threat Addressed | Action |
|------|-----------------|--------|
| `loop_detector.sh` | Stuck/confused agent | Advisory on error loops |
| `compliance_ethics_advisor.sh` | PII exposure | Advisory on detected PII |
| `brain_context_router.sh` | Uninformed decisions | Advisory on decisions without brain query |
| `governance_heartbeat_monitor.sh` | Governance agent failure | Advisory on missed heartbeats |

---

## Identity & Authorization

### Role Hierarchy

Four authorization tiers, from least to most privileged:

| Tier | Role | Capabilities |
|------|------|-------------|
| 1 (Observer) | Read-only agents | Scan, review, flag |
| 2 (Agent) | Implementation agents | Read/write within scope |
| 3 (Lieutenant) | Coordination agents | Route, decompose, orchestrate |
| 4 (Admiral) | Human operator | Policy decisions, merge approval |

### Identity Token Binding

At session start, `identity_validation.sh` validates the agent's identity against `fleet_registry.json`. The `privilege_check.sh` hook enforces **token binding** — an agent's identity cannot change mid-session. Any attempt to modify `agent_id` after session start triggers a hard-block (exit 2).

### Model Tier Enforcement

`tier_validation.sh` ensures critical roles (security, orchestrator) run on appropriate model tiers. Critical roles on economy models (tier 3+) are hard-blocked at session start.

### Per-Agent Tool Permissions

Each agent in `fleet_registry.json` has explicit `allowed` and `denied` tool lists. `tool_permission_guard.sh` enforces these at runtime. Explicitly denied tools trigger hard-blocks.

### Decision Authority Tiers

Each agent has three authority categories:
- **Autonomous** — can execute without approval
- **Propose** — must propose and get approval
- **Escalate** — must escalate to a higher authority

---

## Injection Prevention

### Detection Patterns

`admiral/lib/injection_detect.sh` implements 70+ regex patterns across categories:

| Category | Severity | Pattern Count | Examples |
|----------|----------|--------------|----------|
| Role Override | Critical | 13 | "ignore previous instructions", "you are now [role]" |
| Authority Spoofing | Critical | 12 | "i am the admin", "override authority" |
| Behavior Manipulation | Critical | 15 | "new system prompt", "forget everything above" |
| Credential Fabrication | High | 10 | "certified by admiral", "security clearance level" |
| Dangerous Advice | High | 10 | "disable security", "remove validation" |

**Performance:** < 10ms per input, < 1% false positive rate on benign corpus.

### LLM-Airgapped Design

The first three quarantine layers are fully deterministic — pure bash, regex, and jq. No LLM inference is involved in early-stage detection. This prevents an attacker from using the same techniques that fool models to bypass the security pipeline.

---

## Quarantine Pipeline

Five-layer content analysis pipeline. Each layer is independent and fail-closed (ambiguous content is rejected).

```
Input → [Layer 1: Format] → [Layer 2: Structural] → [Layer 3: Semantic]
         ↓ reject            ↓ reject                ↓ reject
         QUARANTINE           QUARANTINE               QUARANTINE

   → [Layer 4: LLM Advisory] → [Layer 5: Antibodies] → PASS
      ↓ reject (never approves)  (defensive learning)
      QUARANTINE
```

### Layer 1 — Format Validation

Basic input format checks. Rejects malformed input before deeper analysis.

### Layer 2 — Structural Validation

JSON schema validation and encoding normalization. Detects and decodes:
- Base64-encoded content (ATK-0012 defense)
- URL-encoded content
- Unicode escape sequences

### Layer 3 — Deterministic Semantic Analysis

**LLM-AIRGAPPED.** TF-IDF-weighted scoring against the attack corpus:

| Category | Weight | Threshold |
|----------|--------|-----------|
| Authority Spoofing | 3.0 | Combined score >= 1.0 |
| Behavior Manipulation | 5.0 | Combined score >= 1.0 |
| Credential Fabrication | 2.5 | Combined score >= 1.0 |
| Dangerous Advice | 4.0 | Combined score >= 1.0 |

**Fail-closed:** Scores at or above threshold trigger rejection.

### Layer 4 — LLM Advisory

LLM-based analysis with a critical constraint: **can REJECT but NEVER APPROVE.** This layer only runs if Layers 1–3 passed. It catches subtle attacks that escape regex patterns but cannot override deterministic rejections.

### Layer 5 — Antibodies

Converts rejected attacks into Brain FAILURE entries for defensive learning. Rate-limited (50/hour) and deduplicated by fingerprint to prevent write amplification attacks.

---

## Secret Detection

### Scanning Patterns

Two detection systems work in parallel:

**Hook-level (prohibitions_enforcer.sh)** — advisory on secrets in tool calls:
- `password=`, `api_key=`, `secret=`, `token=`
- AWS access keys, PEM private keys, PGP blocks

**Comprehensive scanner (admiral/lib/secret_scanner.sh)** — 40+ patterns:

| Category | Patterns |
|----------|----------|
| API Keys | OpenAI (`sk-`), GitHub (`ghp_`, `gho_`, `ghu_`, `ghs_`), AWS (`AKIA`), Google (`AIza`), Slack (`xox`), Stripe (`sk_live_`), Square, SendGrid |
| Tokens | JWT (`eyJ...`), Bearer tokens |
| Cryptographic | PEM private keys (RSA, EC, DSA, OPENSSH), certificates |
| Credentials | Password/secret key-value pairs, connection strings (mysql://, postgres://, mongodb://) |
| SSH | Public keys (ssh-rsa, ssh-ed25519, ssh-ecdsa) |

**PII detection (admiral/security/pii-detector.ts):**
- Email, SSN, credit card, phone, IP addresses
- Detection and redaction capabilities

### Sensitive File Protection

Files matching these patterns trigger additional scrutiny:
- `*.env`, `*credentials*`, `*secret*`, `*.pem`, `*.key`

---

## Privilege Escalation Defense

Three hard-block checks in `privilege_check.sh`:

### 1. Identity Token Binding

Agent identity cannot change mid-session. The hook compares the current `agent_id` against the value stored at session start. Mismatch triggers exit 2.

### 2. Authority Tier Self-Modification (ATK-0003)

Blocks any attempt to modify authority tiers in the fleet registry or brain system. Detected patterns:
- `authority.*(tier|level).*change`
- `promote.*to.*autonomous`
- `grant.*unrestricted`
- `escalate.*own.*permissions`
- `override.*standing.*order`

### 3. Registry Manipulation via Shell

Blocks bash commands that modify the fleet registry directly:
- `sed.*fleet_registry`, `awk.*fleet_registry`
- `jq.*fleet_registry.*>` (jq with output redirect)

---

## Audit Trail

### Architecture

Append-only, SHA-256 hash-chained JSONL log at `.admiral/security_audit.jsonl`. Each entry includes a hash of the previous entry, making the chain tamper-evident.

### Event Types

| Event Type | Trigger | Severity |
|------------|---------|----------|
| `blocked_tool` | Hard-block hook fired | High |
| `injection_detected` | Quarantine layer rejection | Critical |
| `privilege_escalation` | Authority/identity violation | Critical |
| `pii_detected` | PII found in content | High |
| `zero_trust_failure` | Untrusted data ingested | Medium |
| `policy_violation` | Standing Order violation | High |
| `standing_order_enforcement` | SO rule enforced | Medium |

### Entry Structure

```json
{
  "timestamp": "2026-03-27T12:00:00Z",
  "event_type": "injection_detected",
  "action": "quarantined",
  "severity": "critical",
  "agent_id": "backend-implementer",
  "details": { "layer": 3, "score": 2.4, "category": "behavior_manipulation" },
  "prev_hash": "a1b2c3..."
}
```

### Query Capabilities

```bash
# Query recent events by type
source admiral/lib/security_audit.sh
query_audit_log "injection_detected" 10

# Count events by type
audit_event_counts
```

TypeScript audit trail (`admiral/security/audit-trail.ts`) provides the same capabilities for the control plane with zero external dependencies.

---

## Residual Risks

Known security gaps and mitigations:

| Risk | Severity | Current State | Mitigation Path |
|------|----------|--------------|-----------------|
| **Temporal threats** | Medium | No detection for scope creep across sessions or sleeper behavior | Phase 10: temporal pattern analysis |
| **Supply chain enforcement** | Medium | Spec-level policies exist but no runtime hook enforcement for dependency changes | Phase 10: SBOM generation in CI |
| **Tool poisoning via description drift** | High | MCP server approval enforced, but tool descriptions can change between versions | Version pinning + periodic re-audit |
| **LLM Layer 4 bypass** | Medium | Layer 4 can be fooled by sophisticated prompts | Mitigated by Layers 1–3 being LLM-airgapped |
| **Standing Order coverage gaps** | Medium | 56% hook-enforced (target 81%) | Phase 10: additional enforcement hooks |
| **Cross-session state persistence** | Low | Brain entries persist across sessions without re-validation | Brain audit and consolidation tools |
| **A2A content injection** | Medium | Basic content inspection, no deep analysis of agent-to-agent messages | Phase 10: A2A content inspection hooks |

---

## Standing Orders — Security-Relevant

| SO | Name | Enforcement |
|----|------|------------|
| SO-01 | Identity Discipline | Instruction-embedded |
| SO-03 | Scope Boundaries | Hard-block (`scope_boundary_guard.sh`) |
| SO-05 | Decision Authority | Advisory (`brain_context_router.sh`) |
| SO-10 | Prohibitions | Hard-block (`prohibitions_enforcer.sh`) |
| SO-12 | Zero-Trust Self-Protection | Advisory (`zero_trust_validator.sh`) |
| SO-14 | Compliance & Ethics | Advisory (`compliance_ethics_advisor.sh`) |
| SO-16 | Protocol Governance | Hard-block (`protocol_registry_guard.sh`) |

See [`admiral/docs/standing-orders-enforcement-map.md`](../admiral/docs/standing-orders-enforcement-map.md) for the complete enforcement map.
