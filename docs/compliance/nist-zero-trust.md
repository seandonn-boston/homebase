# NIST Zero Trust Alignment (R-04)

> Admiral Framework alignment to NIST SP 800-207 (Zero Trust Architecture)

**Last updated:** 2026-04-09
**Scope:** Maps Admiral identity tokens, access control, and enforcement to NIST ZTA tenets and SPIFFE/SPIRE identity concepts.

---

## NIST ZTA Tenets Mapping

### 1. All data sources and computing services are considered resources

| NIST Requirement | Admiral Implementation |
|---|---|
| Every resource requires authentication | Every agent session requires identity validation (`identity_validation.sh`, SO-01) |
| No implicit trust based on network location | Zero-trust hook (`zero_trust_validator.sh`) validates every tool call regardless of agent history |

### 2. All communication is secured regardless of network location

| NIST Requirement | Admiral Implementation |
|---|---|
| Encrypted communication channels | Hook-to-control-plane via JSONL event log (local file I/O, no network) |
| MCP server communication secured | Protocol registry guard (`protocol_registry_guard.sh`) blocks unregistered MCP servers |

### 3. Access to individual enterprise resources is granted on a per-session basis

| NIST Requirement | Admiral Implementation |
|---|---|
| Per-session access decisions | Agent version pinning at session start (`AgentVersionRegistry.pinSession()`) |
| Session-scoped permissions | Tool permission guard validates per-session, per-agent tool access |
| No persistent access tokens | Identity tokens are session-scoped, not persisted across sessions |

### 4. Access to resources is determined by dynamic policy

| NIST Requirement | Admiral Implementation |
|---|---|
| Policy-based access control | 16 Standing Orders define policy; hooks enforce deterministically |
| Context-aware decisions | Brain B2 integration enables context-aware hook decisions (ADR-010) |
| Risk-based assessment | Progressive autonomy (4-stage trust model) adjusts permissions based on demonstrated behavior |

### 5. Enterprise monitors and measures integrity and security posture

| NIST Requirement | Admiral Implementation |
|---|---|
| Continuous monitoring | Control plane EventStream captures every agent action |
| Anomaly detection | RunawayDetector with SPC (Statistical Process Control) for behavioral drift |
| Audit trail | Tamper-proof audit trail with SHA-256 hash chain |
| Health monitoring | Fleet health aggregation, governance dashboard, session thermal model |

### 6. All resource authentication and authorization are dynamic and strictly enforced

| NIST Requirement | Admiral Implementation |
|---|---|
| Dynamic policy enforcement | Hooks fire on every tool call — no caching, no bypassing |
| Real-time authorization | PreToolUse hooks evaluate in real-time before each action |
| Fail-closed enforcement | `prohibitions_enforcer.sh` hard-blocks (exit 2) on violations |

### 7. Enterprise collects information about current state of assets, network infrastructure

| NIST Requirement | Admiral Implementation |
|---|---|
| Asset inventory | Fleet registry (`fleet_registry.json`) with 71+ agent definitions |
| Capability tracking | Machine-readable capability registry, agent versioning |
| State observation | Session state machine (5 states), thermal model, distributed tracing |

---

## SPIFFE/SPIRE Identity Mapping

| SPIFFE Concept | Admiral Equivalent |
|---|---|
| SPIFFE ID (workload identity) | Agent ID from fleet registry (`agent_id` field) |
| SVID (identity document) | Agent identity token validated at SessionStart |
| Trust Domain | Fleet boundary — agents within the registered fleet |
| Workload Registration | Agent definition registration in fleet registry + capability registry |
| Attestation | Identity validation hook + model tier verification |
| Federation | Cross-platform adapter interface (Stream 17) for multi-platform trust |

---

## Zero Trust Enforcement Boundaries

```
┌─────────────────────────────────────────────┐
│  Trust Boundary: Fleet Registry              │
│                                              │
│  ┌─────────────┐    ┌─────────────┐         │
│  │  Agent A     │    │  Agent B     │        │
│  │  (identity   │    │  (identity   │        │
│  │   validated) │    │   validated) │        │
│  └──────┬───────┘    └──────┬───────┘        │
│         │                    │                │
│  ┌──────▼────────────────────▼───────┐       │
│  │  Hook Enforcement Layer            │       │
│  │  (PreToolUse + PostToolUse)        │       │
│  │  Every action verified. No bypass. │       │
│  └──────┬────────────────────────────┘       │
│         │                                     │
│  ┌──────▼───────────────────────────┐        │
│  │  Control Plane (Observation)      │        │
│  │  Events → Detection → Alerts      │        │
│  └───────────────────────────────────┘       │
└─────────────────────────────────────────────┘
```

---

## Coverage Assessment

| ZTA Tenet | Coverage | Evidence |
|---|---|---|
| 1. Resources require auth | Full | identity_validation.sh, SO-01 |
| 2. Secured communication | Full | Local I/O, protocol_registry_guard |
| 3. Per-session access | Full | Version pinning, session-scoped tokens |
| 4. Dynamic policy | Full | 16 SOs, hooks, Brain-informed decisions |
| 5. Continuous monitoring | Full | EventStream, RunawayDetector, SPC |
| 6. Dynamic enforcement | Full | Real-time hooks, fail-closed |
| 7. Asset state collection | Full | Fleet registry, capability tracking |

**Overall: 7/7 tenets addressed.**
