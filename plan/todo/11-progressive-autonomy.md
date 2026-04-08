# TODO: Progressive Autonomy

> Source: stream-18-progressive-autonomy.md (AU-01 to AU-10)

Trust mechanics let agents earn independence through demonstrated competence. Without this, governance is binary — either the human reviews everything or the agent acts freely. Progressive autonomy creates the middle ground where routine work flows autonomously and operator attention focuses on genuinely hard decisions.

---

## Trust Data Model

- [x] **AU-01: Trust level data model** — Define the four autonomy stages (Manual Oversight, Assisted Automation, Partial Autonomy, Full Autonomy) with per-agent, per-category trust tracking. Data model includes trust score, consecutive successes/failures, stage transition history, and serialization for persistence.

## Trust Scoring & Gating

- [x] **AU-02: Trust score calculation** — Implement the scoring engine that records decision outcomes (success/failure/partial) by category and severity. Successful decisions increment trust; failures reset the category score; high-risk successes carry more weight than low-risk ones.
- [x] **AU-03: Trust-based permission gating** — Translate trust levels into concrete permission changes by integrating with the hook system. Higher trust means fewer confirmation prompts — Stage 1 requires approval for everything, Stage 3 allows most actions autonomously.
- [x] **AU-09: Trust-aware routing** — Integrate trust levels into the routing engine so sensitive tasks (security review, production deployment) only route to agents meeting minimum trust thresholds. Escalate when no qualifying agent exists.

## Trust Lifecycle

- [x] **AU-04: Trust demotion on failure** — Automatically reduce trust when an agent produces failures in a category. Critical failures trigger immediate demotion; model changes revert to Stage 2; security incidents revert the fleet to Stage 1 for security categories.
- [x] **AU-05: Trust promotion on consistent success** — Surface promotion recommendations when graduation criteria are met (configurable thresholds over minimum time windows). Promotions require explicit operator approval and are logged with full context.
- [x] **AU-06: Trust persistence across sessions** — Store trust state in the Brain so trust survives session boundaries. Implement trust decay — categories not exercised within 30 days revert to the previous stage to prevent stale calibration.

## Trust Approval & Operations

- [x] **AU-11: Admiral approval UI/API** — Operator-facing interface for approving/deferring trust promotions via CLI and API. Presents evidence (consecutive successes, time period, failure history); requires rationale; logs to Brain; pattern recognition for rubber-stamped approvals.

## Trust Operations

- [x] **AU-07: Trust dashboard** — Visualize per-agent trust levels by category, score trends, recent promotions/demotions, upcoming graduation signals, decay warnings, and the fleet-wide autonomy matrix. Provide both terminal rendering and API access.
- [x] **AU-08: Human trust override** — Allow operators to manually adjust trust levels with a required reason and full audit trail. Distinguish earned (automatic) from imposed (override) trust changes; restrict promotions beyond Stage 2 to Owner-level operators.
- [~] **AU-10: Trust reporting and analytics** — Generate fleet-wide reports covering trust distribution, trust velocity, demotion frequency, trust-cost correlation, and operator override frequency. Store reports in Brain for long-term trend analysis. *(partial — see audit)*

---

## Dependencies

| Task | Depends on | Downstream |
|------|-----------|------------|
| AU-01 | — | AU-02, AU-03, AU-04, AU-05, AU-06, AU-07, AU-08, AU-09, AU-10 |
| AU-02 | AU-01 | AU-03, AU-04, AU-05 |
| AU-03 | AU-01, AU-02 | — |
| AU-04 | AU-01, AU-02 | — |
| AU-05 | AU-01, AU-02 | — |
| AU-06 | AU-01, Stream 16 (brain_record, brain_query) | AU-07, AU-08, AU-10 |
| AU-07 | AU-01, AU-06 | AU-10 |
| AU-08 | AU-01, AU-06 | — |
| AU-09 | AU-01, Stream 15 O-01 (routing engine) | — |
| AU-10 | AU-01, AU-06, AU-07 | — |
| AU-11 | AU-01, AU-05 | — |
