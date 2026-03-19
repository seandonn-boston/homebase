# Stream 24: Security Hardening — Defense in Depth

> *"The only truly secure system is one that is powered off, cast in a block of concrete, and sealed in a lead-lined room with armed guards — and even then I have my doubts." — Gene Spafford*

**Scope:** Deep security implementation beyond the basics. Covers adversarial testing automation, injection defense layers, privilege hardening, secret scanning, audit integrity, incident response, supply chain security, and input validation. Draws from the attack corpus (18 ATK-* patterns), the Monitor's quarantine pipeline, and the enforcement spectrum defined in the Admiral Framework specification (Part 9, Part 12).

**Why this stream exists:** Security is not a feature — it is a property of every feature. The Admiral Framework governs AI agents that make decisions and write code. A compromised governance layer is worse than no governance at all, because it creates false confidence. This stream ensures that every layer of the framework resists adversarial input, detects tampering, and fails safely.

---

## 24.1 Adversarial Testing

- [ ] **SEC-01: Attack corpus test automation**
  - **Description:** Automate testing with all ATK-* attack patterns from `aiStrat/attack-corpus/`. The corpus includes 18 original entries (ATK-0001 through ATK-0018) plus 12 new entries from the MCP Security Analysis (ATK-0019 through ATK-0030) covering temporal threats (sleeper activation, rug pulls, behavioral drift), MCP-specific vectors (tool description poisoning, cross-server exfiltration, server-side prompt injection), A2A cascade attacks, trust transitivity, and Brain poisoning. Build a test runner that iterates through every corpus entry, injects the trigger into an agent session or quarantine pipeline, verifies the expected defense activates, and updates `times_passed`/`times_failed`/`last_tested` fields. Support both spec validation (no runtime required) and runtime validation (against a running fleet). Output a structured report showing pass/fail per scenario with severity weighting.
  - **Done when:** A single command runs all 30 scenarios, produces a structured JSON report, and updates corpus entry metadata. Spec validation passes for all entries. Runtime validation framework is functional (actual pass rates depend on defense implementation maturity). ATK-0019 through ATK-0030 entries are created from the templates in `admiral/MCP-SECURITY-ANALYSIS.md` Section 8.
  - **Files:** `admiral/tests/attack_corpus_runner.sh` (new), `admiral/tests/attack_corpus_report.json` (generated output), `aiStrat/attack-corpus/ATK-0019.json` through `aiStrat/attack-corpus/ATK-0030.json` (new, 12 entries)
  - **Size:** L (3+ hours)
  - **Spec ref:** `aiStrat/attack-corpus/README.md` — Testing Methodology section; `admiral/MCP-SECURITY-ANALYSIS.md` Rec 3, Section 8
  - **Depends on:** —

- [ ] **SEC-10: Security regression tests**
  - **Description:** Create a regression test suite that verifies previously-fixed security issues stay fixed. Every security fix must add a corresponding regression test that reproduces the original vulnerability and confirms the fix. The test suite runs as part of CI and blocks merges if any regression test fails. Maintain a registry mapping CVE/issue IDs to their regression test files.
  - **Done when:** Regression test framework exists with at least 5 seed regression tests derived from attack corpus entries. CI runs regression tests on every PR. A documented process exists for adding new regression tests alongside security fixes.
  - **Files:** `admiral/tests/security_regressions/` (new directory), `admiral/tests/security_regressions/registry.json` (new), `.github/workflows/security-regression.yml` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** `aiStrat/attack-corpus/README.md` — Scenario Maturity section
  - **Depends on:** SEC-01

---

## 24.2 Injection Defense Layers

- [ ] **SEC-02: Injection detection Layer 1 — Pattern-based input sanitization**
  - **Description:** Implement regex-based input sanitization that catches known injection patterns before they reach the agent context. Patterns include: imperative instruction overrides ("ignore previous instructions", "from now on", "you must always"), authority claims ("Admiral approved", "fleet-wide directive", "system-level permission"), Standing Order manipulation ("override standing order", "suspend standing order"), and role reassignment attempts ("you are now the"). Use the Monitor's 70+ regex patterns as the baseline. The layer must be fast (< 10ms per input) and produce structured detection results including the matched pattern, input position, and severity.
  - **Done when:** Layer 1 catches all ATK-0008, ATK-0011, and ATK-0012 trigger patterns. False positive rate < 1% on a benign input corpus. Latency < 10ms per input. Detection results are structured JSON.
  - **Files:** `admiral/monitor/quarantine/layer1_patterns.sh` (new or modify existing), `admiral/monitor/quarantine/tests/test_layer1.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** `aiStrat/attack-corpus/README.md` — ATK-0008, ATK-0011, ATK-0012
  - **Depends on:** —

- [ ] **SEC-03: Injection detection Layer 2 — Structural validation**
  - **Description:** Implement JSON schema validation that prevents malformed input from reaching processing layers. Validate all external inputs against their expected schemas: handoff documents against `aiStrat/handoff/v1.schema.json`, brain entries against the brain entry schema, hook payloads against hook input schemas, and event log entries against the event schema. Reject inputs that fail schema validation with clear error messages identifying the specific validation failure. Handle encoding normalization (base64, URL encoding, Unicode) to prevent payload smuggling (ATK-0012).
  - **Done when:** All external input paths have schema validation. Handoff validation uses `v1.schema.json`. Encoding normalization catches base64 and Unicode bypass attempts. Malformed inputs are rejected with structured error responses, not crashes.
  - **Files:** `admiral/monitor/quarantine/layer2_structural.sh` (new or modify existing), `admiral/monitor/quarantine/tests/test_layer2.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** `aiStrat/handoff/v1.schema.json`, `aiStrat/attack-corpus/README.md` — ATK-0012
  - **Depends on:** —

- [ ] **SEC-12: Input validation hardening**
  - **Description:** Validate all external inputs at system boundaries — control plane API endpoints, hook stdin, Brain MCP tool inputs, and CLI arguments. Define maximum input sizes, allowed character sets, and structural constraints for every external-facing interface. Implement validation as close to the boundary as possible (before any processing occurs). Reject oversized inputs, inputs with null bytes, and inputs that fail character set validation. This is the outermost defense ring — before Layer 1 pattern matching and Layer 2 schema validation.
  - **Done when:** Every external input path has boundary validation. Maximum input sizes are defined and enforced. Null byte injection is blocked. Oversized inputs return 413 (or equivalent) without being processed. Validation errors are logged with source attribution.
  - **Files:** `control-plane/src/input-validation.ts` (new), `admiral/lib/input_validation.sh` (new), `control-plane/src/input-validation.test.ts` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

---

## 24.3 Privilege and Access Control

- [ ] **SEC-04: Privilege escalation hardening**
  - **Description:** Prevent agents from gaining permissions beyond their role. Implement checks that verify: (1) agents cannot modify their own authority tier assignments, (2) brain entries cannot contain authority-tier escalation patterns (ATK-0003), (3) agents cannot invoke tools outside their declared tool allowlist, (4) session-scoped identity tokens cannot be forged or transferred between agents. Add runtime checks at every decision point where authority tier is consulted. Log all privilege check results to the audit trail.
  - **Done when:** Authority tier self-escalation is blocked and logged (ATK-0003 defense verified). Tool invocation outside allowlist is blocked. Identity token binding is verified at session start and cannot be modified mid-session. All privilege checks produce audit trail entries.
  - **Files:** `.hooks/privilege_check.sh` (new), `admiral/tests/test_privilege_escalation.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** `aiStrat/attack-corpus/README.md` — ATK-0003 (authority tier self-escalation)
  - **Depends on:** —

- [ ] **SEC-05: Secret scanning in brain entries**
  - **Description:** Prevent API keys, tokens, passwords, and other secrets from being stored in the Brain. Implement a pre-write scan that checks brain entry content for common secret patterns: API keys (alphanumeric strings with common prefixes like `sk-`, `ghp_`, `AKIA`), tokens (JWT format, Bearer tokens), passwords (key-value pairs where key contains "password", "secret", "key"), private keys (PEM format headers), and connection strings (containing credentials). Entries containing detected secrets are quarantined with a clear explanation of what was found. The scan must have low false positive rates to avoid blocking legitimate technical content.
  - **Done when:** Brain write operations pass through secret scanning. Common secret formats are detected (API keys, JWTs, PEM keys, connection strings). Detected secrets are quarantined, not stored. False positive rate < 2% on a corpus of legitimate technical brain entries. Scan results are logged to the audit trail.
  - **Files:** `admiral/monitor/quarantine/secret_scanner.sh` (new), `admiral/monitor/quarantine/tests/test_secret_scanner.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

---

## 24.4 Audit and Integrity

- [ ] **SEC-06: Audit trail tamper detection**
  - **Description:** Implement a hash chain on the audit log to detect tampering. Each audit log entry includes a SHA-256 hash of the previous entry, creating an append-only chain where any modification to a historical entry is detectable by hash mismatch. On system startup and periodically during operation, validate the hash chain integrity. If a break in the chain is detected, emit a critical alert with the position of the break. Store chain checkpoints (hash of the full chain at known-good points) to enable efficient validation without re-reading the entire log.
  - **Done when:** Every audit log entry includes a `prev_hash` field. Hash chain validation runs on startup and detects any tampered entries. Chain checkpoints are stored at configurable intervals. A tampered entry triggers a critical alert identifying the break position. Chain validation completes in < 1 second for logs up to 100K entries.
  - **Files:** `admiral/lib/audit_chain.sh` (new), `admiral/tests/test_audit_chain.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **SEC-07: Security incident response playbook**
  - **Description:** Document procedures for security incidents including: (1) detection — how incidents are identified (audit chain break, attack corpus failure, privilege escalation attempt), (2) containment — immediate actions (fleet pause, session revocation, hook disablement), (3) investigation — how to trace the incident through audit logs, event streams, and brain entries, (4) remediation — how to fix the vulnerability and add regression tests, (5) post-mortem — structured format for recording lessons learned. Include runbooks for the most critical scenarios: compromised brain entry, identity spoofing, unauthorized tool access, and audit log tampering.
  - **Done when:** Playbook covers all 5 phases for 4 critical scenarios. Each scenario has step-by-step runbook commands. The playbook is integrated into the Standing Orders as a reference from SO-related security governance.
  - **Files:** `admiral/docs/security-incident-playbook.md` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** SEC-06

---

## 24.5 Supply Chain and Infrastructure

- [ ] **SEC-08: Dependency vulnerability scanning**
  - **Description:** Automate scanning of npm dependencies for known vulnerabilities using `npm audit` and/or a dedicated tool like Snyk or Socket. Run scans in CI on every PR and on a daily schedule for the main branch. Fail the CI check on critical or high severity vulnerabilities. Produce a structured report including affected packages, severity, available fixes, and whether the vulnerability is reachable from Admiral code paths.
  - **Done when:** CI runs dependency vulnerability scanning on every PR. Critical/high vulnerabilities block merges. Daily scheduled scan runs against main branch. Scan results are structured JSON for dashboard integration.
  - **Files:** `.github/workflows/dependency-audit.yml` (new), `control-plane/package.json` (modify — add audit script)
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **SEC-09: SBOM generation**
  - **Description:** Generate a Software Bill of Materials (SBOM) for supply chain transparency. Produce SBOM in CycloneDX or SPDX format listing all direct and transitive dependencies with versions, licenses, and known vulnerabilities. Generate SBOM as part of the release process and store alongside release artifacts. Include both npm dependencies (control plane) and system dependencies (bash hooks — jq, curl, shellcheck, etc.).
  - **Done when:** SBOM generation produces a valid CycloneDX or SPDX document. SBOM includes both npm and system dependencies. SBOM is generated as part of CI and stored as an artifact. SBOM validates against the chosen format's schema.
  - **Files:** `.github/workflows/sbom.yml` (new), `admiral/scripts/generate_sbom.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** SEC-08

- [ ] **SEC-11: Rate limiting for control plane API**
  - **Description:** Prevent denial-of-service on the control plane server by implementing rate limiting on API endpoints. Apply per-endpoint rate limits based on expected usage patterns: high-frequency endpoints (events, health) get higher limits, administrative endpoints (configuration, pause) get lower limits. Use a token bucket or sliding window algorithm. Return 429 (Too Many Requests) with Retry-After header when limits are exceeded. Log rate limit violations for monitoring.
  - **Done when:** All control plane API endpoints have rate limits configured. Rate limiting uses token bucket or sliding window. 429 responses include Retry-After header. Rate limit violations are logged. Rate limits are configurable via environment variables.
  - **Files:** `control-plane/src/rate-limiter.ts` (new), `control-plane/src/rate-limiter.test.ts` (new), `control-plane/src/server.ts` (modify)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

---

## 24.6 MCP/A2A Security (from MCP-SECURITY-ANALYSIS.md)

- [ ] **SEC-13: Extend `zero_trust_validator.sh` to scan ALL tool responses**
  - **Description:** The current `zero_trust_validator.sh` restricts injection detection to `WebFetch` and `WebSearch` tool responses (lines 24-35). MCP tool responses bypass injection scanning entirely. This is the #1 priority fix from `admiral/MCP-SECURITY-ANALYSIS.md`. Remove the tool name filter so injection marker scanning applies to all tool responses from all tools. Additionally, escalate severity for MCP-sourced injection — a vetted server delivering injection payloads indicates compromise or rug pull, warranting CRITICAL severity vs. the expected-and-handled web injection.
  - **Done when:** `zero_trust_validator.sh` scans ALL tool responses for injection patterns, not just WebFetch/WebSearch. MCP tool responses receive CRITICAL severity on detection. Existing regex patterns apply universally. Tests verify injection detection in MCP tool responses (ATK-0027 scenario).
  - **Files:** `.hooks/zero_trust_validator.sh` (modify), `admiral/tests/test_zero_trust_all_tools.sh` (new)
  - **Size:** S (< 1 hour)
  - **Spec ref:** MCP-SECURITY-ANALYSIS.md Rec 1; OWASP MCP06; ATK-0027
  - **Depends on:** —

- [ ] **SEC-14: Cascade containment circuit breakers**
  - **Description:** When an MCP server is flagged as compromised, execute an automated containment cascade: (1) quarantine all Brain entries written by any agent that used the flagged server since its last clean verification — entries are marked as potentially compromised and excluded from query results until reviewed; (2) suspend A2A connections involving agents that used the flagged server to prevent lateral movement; (3) trace data lineage from the compromised server through all agents that consumed its outputs, through all Brain entries those agents wrote, and through all agents that subsequently read those entries — producing a contamination graph. This is analogous to the epoch-based trust revocation in Part 3, applied to data integrity rather than credentials.
  - **Done when:** Compromise detection triggers automated containment. Brain entries are quarantined (excluded from queries, not deleted). A2A connections are suspended for affected agents. Contamination graph computation traces data lineage through agents and Brain. Containment completes within hook chain response time, not manual review time. Tests verify cascade mechanics with synthetic compromise scenarios.
  - **Files:** `admiral/security/circuit_breaker.sh` (new), `admiral/security/contamination_graph.sh` (new), `admiral/tests/test_circuit_breaker.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** MCP-SECURITY-ANALYSIS.md Rec 12; Part 3 epoch mechanism; Part 7 Recovery
  - **Depends on:** SEC-01, M-10 (behavioral baselining provides compromise detection signals)

---

## Stream 24 Summary

| Subsection | Items | Total Size |
|---|---|---|
| 24.1 Adversarial Testing | SEC-01, SEC-10 | 1L + 1M |
| 24.2 Injection Defense Layers | SEC-02, SEC-03, SEC-12 | 3M |
| 24.3 Privilege and Access Control | SEC-04, SEC-05 | 1L + 1M |
| 24.4 Audit and Integrity | SEC-06, SEC-07 | 2M |
| 24.5 Supply Chain and Infrastructure | SEC-08, SEC-09, SEC-11 | 1S + 2M |
| 24.6 MCP/A2A Security | SEC-13, SEC-14 | 1S + 1L |
| **Totals** | **14 items** | **3L + 9M + 2S** |

**Critical path:** SEC-13 (zero_trust_validator extension) is the highest-priority security fix — smallest code change, highest impact (MCP-SECURITY-ANALYSIS Rec 1). SEC-01 (attack corpus automation) is the testing foundation — now covers 30 ATK entries including 12 new MCP/A2A/temporal scenarios. SEC-14 (circuit breakers) depends on SEC-01 and Stream 16 M-10 (behavioral baselining).

**Recommended execution order:**
1. **Immediate:** SEC-13 (zero_trust_validator extension) — smallest change, highest impact.
2. **Foundation:** SEC-01 (attack corpus automation, now 30 entries) — enables validation of all other security work.
3. **Independent:** SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-08, SEC-11, SEC-12 — no dependencies, can be parallelized.
4. **Dependent:** SEC-07 (playbook, after SEC-06), SEC-09 (SBOM, after SEC-08), SEC-10 (regression tests, after SEC-01), SEC-14 (circuit breakers, after SEC-01 + M-10).
