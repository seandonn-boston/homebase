# TODO: Security & Robustness

> Sources: stream-24-security-hardening.md (SEC-01 to SEC-14), stream-09-platform-security-governance.md (S-20 to S-22), stream-10-protocols-ecosystem-gaps.md (S-44, S-45)

Defense in depth for the Admiral Framework: adversarial testing, injection defense, privilege hardening, secret scanning, audit integrity, data sensitivity, supply chain security, and MCP/A2A security. A compromised governance layer is worse than no governance at all because it creates false confidence.

---

## Attack Corpus & Testing

- [x] **SEC-01: Attack corpus test automation** — Build a test runner that iterates all 30 ATK scenarios (18 original + 12 new MCP/A2A/temporal entries ATK-0019 through ATK-0030), injects triggers into agent sessions or quarantine pipelines, verifies defenses activate, updates `times_passed`/`times_failed`/`last_tested` metadata, and produces a structured JSON report with severity weighting. Create the 12 new ATK entries from `MCP-SECURITY-ANALYSIS.md` Section 8 templates covering sleeper activation, rug pulls, behavioral drift, tool description poisoning, cross-server exfiltration, server-side prompt injection, A2A cascade attacks, trust transitivity, and Brain poisoning.
- [~] **SEC-10: Security regression test suite** — Create a regression test framework where every security fix adds a corresponding test reproducing the original vulnerability. Maintain a registry mapping CVE/issue IDs to test files. Seed with at least 5 regression tests from attack corpus entries. CI runs regression tests on every PR and blocks merges on failure. *(partial — see audit)*

## Injection Defense

- [x] **SEC-13: Extend `zero_trust_validator.sh` to scan ALL tool responses** — Remove the WebFetch/WebSearch tool name filter so injection marker scanning applies universally to all tool responses. Escalate MCP-sourced injection detections to CRITICAL severity (a vetted server delivering injection indicates compromise or rug pull). Verify with ATK-0027 scenario. Highest-priority security fix: smallest code change, highest impact.
- [x] **SEC-02: Injection detection Layer 1 — pattern-based input sanitization** — Implement regex-based sanitization catching known injection patterns: imperative overrides ("ignore previous instructions"), authority claims ("Admiral approved"), Standing Order manipulation, and role reassignment attempts. Use the Monitor's 70+ regex patterns as baseline. Must be < 10ms per input, < 1% false positive rate, and produce structured JSON detection results.
- [x] **SEC-03: Injection detection Layer 2 — structural validation** — *Completed in Phase 10.* — `layer2_structural.sh` validates handoff docs, brain entries, hook payloads, and event entries against structural expectations. Encoding normalization (base64, URL, Unicode) for ATK-0012 defense. Suspicious field name detection. DoS prevention via nesting depth limit (20). Now integrated into `quarantine_pipeline.sh` as Layer 2 gate before Layer 3. 25-test suite covering all validation paths.
- [x] **SEC-12: Input validation hardening** — Boundary validation at all external interfaces (control plane API, hook stdin, Brain MCP tool inputs, CLI arguments). Define and enforce maximum input sizes, allowed character sets, and structural constraints. Block null byte injection. Reject oversized inputs with 413 before processing. This is the outermost defense ring, before Layer 1 and Layer 2.

## Privilege & Access Control

- [~] **SEC-04: Privilege escalation hardening** — Prevent agents from gaining permissions beyond their role. Block authority tier self-modification (ATK-0003 defense), tool invocation outside declared allowlists, and identity token forging/transfer. Add runtime checks at every decision point where authority tier is consulted. Log all privilege check results to the audit trail. *(partial — see audit)*
- [x] **SEC-05: Secret scanning for Brain entries** — Pre-write scan detecting API keys (`sk-`, `ghp_`, `AKIA`), JWT tokens, PEM private keys, passwords in key-value pairs, and connection strings with credentials. Quarantine entries containing secrets with a clear explanation. Must have < 2% false positive rate on legitimate technical brain entries.

## Data Protection

- [x] **S-20: PII detection sanitizer (Layer 1)** — Pattern-based detection for PII (email, SSN, credit card, API keys, JWT tokens) before data is stored in the Brain. Fast regex-based scanner runs before every Brain write operation. Produces a sanitization report (what was found, what was redacted). False positive rate measurable and below 5%.
- [x] **S-21: Database-level PII rejection (Layer 2)** — SQL trigger on Brain B2/B3 tier tables rejecting INSERT/UPDATE operations containing PII patterns. Defense in depth: if the application layer (S-20) misses something, the data layer catches it. Rejection is logged with the specific pattern matched.
- [x] **S-45: Data classification tags and cross-server flow control** — *Completed in Phase 10.* — `admiral/security/data-classification.ts` implements 4-level sensitivity taxonomy (PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED), server sensitivity ceilings (configurable per MCP server in `approved_mcp_servers.json`), cross-classification transfer gates with Admiral approval mechanism, and provenance chain tracking. 20-test suite covering flow control, approvals, provenance, and utilities.

## Audit & Compliance

- [x] **S-22: Security audit trail** — Persistent append-only JSONL log of all security-relevant events: blocked tool uses, injection attempt detections, privilege escalation attempts, PII detection events, zero-trust validation failures. Wire into `prohibitions_enforcer.sh`, `zero_trust_validator.sh`, sanitizer, and database triggers. Each entry includes timestamp, event type, agent ID, action taken, and details.
- [x] **SEC-06: Audit trail tamper detection** — SHA-256 hash chain on the audit log where each entry includes a `prev_hash` field. Validate chain integrity on startup and periodically during operation. Store chain checkpoints at configurable intervals. Chain break triggers a critical alert identifying the break position. Validation completes in < 1 second for logs up to 100K entries.
- [x] **SEC-07: Security incident response playbook** — *Completed in Phase 10.* — `docs/INCIDENT_RESPONSE.md` with 5-phase procedures (detect, contain, investigate, remediate, post-mortem) for 4 critical scenarios (compromised brain, identity spoofing, unauthorized tool, audit tampering). 16 bash code blocks with runbook commands, severity levels P1-P4, Standing Orders integration (SO-09/10/13/16), incident log template. 26-test validation suite.

## MCP/A2A Security

- [~] **S-44: A2A payload content inspection** — Run all incoming A2A messages through quarantine Layers 1-2 before execution. Detect injection patterns in A2A payloads. Flag behavioral anomalies (statistically unusual outputs). Implement taint tracking recording agent contribution chains for cascade containment. *(partial — see audit)*
- [~] **SEC-14: Cascade containment circuit breakers** — On MCP server compromise: (1) quarantine all Brain entries written by agents that used the flagged server (exclude from queries, do not delete), (2) suspend A2A connections for affected agents, (3) compute contamination graph tracing data lineage through agents and Brain entries. Analogous to epoch-based trust revocation applied to data integrity. *(partial — see audit)*

## Advanced Quarantine Layers

- [x] **SEC-16: Quarantine Layer 4 — LLM Advisory** — Additive rejection only; invoked only on content passing Layers 1-3; hardcoded prompt template (no dynamic interpolation); can REJECT but never APPROVE; compromised Layer 4 cannot weaken pipeline.
- [x] **SEC-17: Quarantine Layer 5 — Antibody** — Convert detected attacks into Brain FAILURE entries in defanged form for future defense learning; no LLM involvement; deterministic write; Admiral approval gate prevents auto-activation.

## Leash Integration

- [ ] **SEC-15: Leash Cedar policy generation spec** — Design mapping from Admiral's Decision Authority Tiers (Autonomous/Propose/Escalate/Blocked) to Cedar policy language. Generate Cedar policies from agent tier assignments for StrongDM Leash kernel-level enforcement. Cover tier-to-Cedar mapping, policy generation triggers, Leash-present and Leash-absent deployment. Turns Leash from competitor into enforcement backend. Depends on SEC-04.

## CI Security

- [x] **SEC-08: Dependency vulnerability scanning** — *Completed in Phase 10.* — `admiral/bin/audit_dependencies.sh` runs `npm audit --json`, produces structured report with severity breakdown, affected packages, fix availability, blocking decision. CI workflow runs on PR (package changes), daily cron (main), and manual dispatch. Report uploaded as artifact. 19-test validation suite.
- [x] **SEC-09: SBOM generation** — *Completed in Phase 10.* — `admiral/bin/generate_sbom.sh` generates CycloneDX 1.5 JSON SBOM covering all 5 npm workspace projects (direct + transitive from lockfiles) and 8 system dependencies with version detection. CI workflow (`.github/workflows/sbom.yml`) runs on PR (package changes), weekly cron, and manual dispatch. SBOM uploaded as artifact with 90-day retention. 41-test validation suite.
- [x] **SEC-11: Rate limiting for control plane API** — *Completed in Phase 10.* — `control-plane/src/rate-limiter.ts` implements sliding window rate limiting with 3 tiers: high (120/min for health, events, stats), medium (60/min for config, alerts, session), admin (20/min for agent resume, alert resolve). Returns 429 with Retry-After header. Limits configurable via `RATE_LIMIT_*` environment variables. Violations tracked. 22-test suite (unit + integration).

---

## Dependencies

| Task | Depends on | Downstream |
|------|-----------|------------|
| SEC-01 | — | SEC-10, SEC-14 |
| SEC-02 | — | — |
| SEC-03 | — | — |
| SEC-04 | — | — |
| SEC-05 | — | — |
| SEC-06 | — | SEC-07 |
| SEC-07 | SEC-06 | — |
| SEC-08 | — | SEC-09 |
| SEC-09 | SEC-08 | — |
| SEC-10 | SEC-01 | — |
| SEC-11 | — | — |
| SEC-12 | — | — |
| SEC-13 | — | — |
| SEC-14 | SEC-01, Stream 16 M-10 (behavioral baselining) | — |
| SEC-15 | SEC-04 (privilege escalation hardening) | — |
| S-20 | — | S-21 |
| S-21 | S-20 | — |
| S-22 | — | SEC-06 |
| S-44 | S-40 (inter-agent communication) | — |
| S-45 | — | — |

**Recommended execution order:**
1. **Immediate:** SEC-13 (zero trust validator expansion) — smallest change, highest impact.
2. **Foundation:** SEC-01 (attack corpus automation, 30 entries) — enables validation of all other security work.
3. **Parallel:** SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-08, SEC-11, SEC-12, S-20, S-22 — no blocking dependencies.
4. **Dependent:** SEC-07 (after SEC-06), SEC-09 (after SEC-08), SEC-10 (after SEC-01), S-21 (after S-20), SEC-14 (after SEC-01 + M-10), S-44 (after S-40).
