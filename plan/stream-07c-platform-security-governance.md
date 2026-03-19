# Stream 7C: Platform Adapters, Security & Meta-Governance (Spec Parts 8, 9, 10)

> *"Defense in depth is not optional — it is the architecture." — The Admiral Philosophy*

**Current score:** 3/10 | **Target:** 8/10

Only Claude Code has an adapter. Security lacks data sensitivity and audit trails. Meta-governance is entirely unimplemented.

---

### 7.6 Platform Adapters (Part 8)

Currently only Claude Code has an adapter. The spec envisions platform-agnostic operation. Without a defined adapter interface, each new platform integration is built from scratch.

- [ ] **S-18: Generic adapter interface**
  - **Description:** Define the adapter contract — what methods any IDE or platform adapter must implement to integrate with the Admiral Framework. Then refactor the existing Claude Code adapter to conform to this interface, proving the interface is sufficient for a real integration.
  - **Done when:** Interface is documented with all required methods (session lifecycle, hook dispatch, tool permission check, event emission), Claude Code adapter is refactored to implement the interface, a second adapter can be built by following the interface alone.
  - **Files:** `admiral/adapters/interface.md` (new), `admiral/adapters/claude-code/` (restructure)
  - **Size:** M
  - **Spec ref:** Part 8

- [ ] **S-19: API-direct adapter**
  - **Description:** Adapter for direct API usage without any IDE — headless mode. Enables hooks to be triggered via CLI or API calls, making the Admiral Framework usable in CI/CD pipelines, automated testing, and scripted workflows where no human is operating an IDE.
  - **Done when:** All hooks can be triggered via CLI commands, session lifecycle (start/stop) is managed programmatically, hook results are returned as structured output (JSON), adapter passes the same integration tests as the Claude Code adapter.
  - **Files:** `admiral/adapters/api-direct/` (new)
  - **Size:** L
  - **Spec ref:** Part 8

---

### 7.7 Security Hardening (Part 9)

Security infrastructure exists (zero-trust validator, prohibitions enforcer) but lacks data sensitivity handling and audit trails. The spec defines layered security; current implementation covers the outer layers only.

- [ ] **S-20: Data sensitivity Layer 1 — Pattern-based PII detection**
  - **Description:** Pattern-based detection for PII (email addresses, SSNs, credit card numbers, API keys, JWT tokens) before data is stored in the Brain. This is the first line of defense — a fast regex-based scanner that catches obvious PII before it enters persistent storage.
  - **Done when:** Sanitizer catches all OWASP-listed PII patterns, runs before every Brain write operation, produces a sanitization report (what was found, what was redacted), false positive rate is measurable and below 5%.
  - **Files:** `admiral/security/sanitizer.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 9

- [ ] **S-21: Data sensitivity Layer 2 — Database-level rejection**
  - **Description:** Database-level rejection trigger for B2/B3 Brain writes containing PII. This is the second line of defense — even if Layer 1 misses something, the database itself refuses to store PII. Defense in depth: if the application layer fails, the data layer catches it.
  - **Done when:** SQL trigger on Brain tables rejects INSERT/UPDATE operations containing PII patterns, rejection is logged with the specific pattern matched, trigger covers all B2 and B3 tier tables.
  - **Files:** `aiStrat/brain/schema/` (extend)
  - **Size:** M
  - **Spec ref:** Part 9

- [ ] **S-22: Security audit trail**
  - **Description:** Persistent log of all security-relevant events: blocked tool uses, injection attempt detections, privilege escalation attempts, PII detection events, zero-trust validation failures. This trail is essential for post-incident forensics and compliance evidence.
  - **Done when:** All security events from existing hooks (prohibitions_enforcer, zero_trust_validator) and new hooks (sanitizer, database trigger) are logged to `admiral/logs/security.jsonl`, each entry includes timestamp/event type/agent ID/action taken/details, log is append-only.
  - **Files:** `admiral/security/audit.sh` (new), `.hooks/prohibitions_enforcer.sh`, `.hooks/zero_trust_validator.sh`
  - **Size:** M
  - **Spec ref:** Part 9

---

### 7.8 Meta-Agent Governance (Part 10)

The spec defines agents governing other agents — the meta-governance layer. This is entirely unimplemented. Without it, agent quality degrades silently because no one is watching the watchers.

- [ ] **S-23: Sentinel agent pattern**
  - **Description:** Implement the loop-breaking governance agent that monitors other agents for runaway behavior, circular dependencies, and infinite loops. The Sentinel observes agent output patterns and intervenes when it detects repetitive or non-converging behavior — the automated version of a human noticing "this agent is stuck."
  - **Done when:** Sentinel detects loops (repeated identical outputs), breaks loops (sends interrupt signal), logs loop detection events, operates with minimal overhead (sampling-based observation, not full output interception).
  - **Files:** `admiral/agents/sentinel.sh` (new) or `control-plane/src/sentinel.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 10

- [ ] **S-24: Decision authority tracking**
  - **Description:** Track per-agent, per-category decision authority with dynamic promotion and demotion. An agent that makes 5 consecutive successful decisions in a category is promoted to higher authority (less oversight required). An agent that makes 1 failed decision is demoted (more oversight required). This creates a trust-but-verify system that adapts to agent reliability.
  - **Done when:** Authority tiers are tracked per agent per decision category, promotion occurs after 5 consecutive successes, demotion occurs after 1 failure, authority state persists across sessions, authority level influences routing decisions.
  - **Files:** `admiral/governance/authority-tracker.sh` (new), `admiral/lib/state.sh`
  - **Size:** L
  - **Spec ref:** Part 10

- [ ] **S-25: Governance health dashboard**
  - **Description:** Visibility into the meta-governance layer: which agents are currently governed, their authority tier states, decision history, promotion/demotion events, and Sentinel intervention history. Without visibility, meta-governance is a black box that humans cannot audit or tune.
  - **Done when:** Dashboard endpoint returns governance state as structured JSON, shows per-agent authority tiers, shows recent decisions with outcomes, shows Sentinel intervention log, accessible via control plane API.
  - **Files:** `control-plane/src/server.ts`
  - **Size:** M
  - **Spec ref:** Part 10

---

## Summary

| Subsection | Items | Total Size | Spec Parts Covered |
|---|---|---|---|
| 7.6 Platform Adapters | S-18 through S-19 | 1L + 1M | Part 8 |
| 7.7 Security Hardening | S-20 through S-22 | 3M | Part 9 |
| 7.8 Meta-Governance | S-23 through S-25 | 2L + 1M | Part 10 |
| **Totals** | **8 items** | **3L + 4M** | **3 spec parts** |

**Key dependencies:** S-23 (Sentinel) must be implemented before S-25 (governance health dashboard) — the dashboard has nothing to display until the Sentinel and authority tracker are operational. S-18 (generic adapter interface) must precede S-19 (API-direct adapter) — the API-direct adapter should implement the interface, not be built in isolation.

**Recommended execution order:**
1. S-18 (adapter interface) — establishes the contract before building the second adapter.
2. S-20 and S-21 (PII detection layers) — implement defense in depth together so neither layer is left incomplete.
3. S-22 (security audit trail) — wire up the existing hooks plus the new sanitizer into a single persistent log.
4. S-23 (Sentinel) and S-24 (authority tracking) — the two core meta-governance primitives that S-25 depends on.
5. S-19 (API-direct adapter) — headless adapter, unblocked once the interface is defined.
6. S-25 (governance dashboard) — the observability layer, unblocked once S-23 and S-24 are live.
