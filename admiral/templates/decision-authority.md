# Decision Authority Table

| Decision | Tier | Rationale |
|---|---|---|
| Token budget enforcement | **Enforced** | Hook-controlled, no agent discretion |
| Loop detection response | **Enforced** | Automated, deterministic |
| Code pattern violations | **Autonomous** | Agent fixes without asking |
| Test coverage gaps | **Autonomous** | Agent writes tests without asking |
| Documentation updates | **Autonomous** | Agent updates docs without asking |
| Architecture changes | **Propose** | Requires Admiral review |
| Dependency upgrades | **Propose** | Risk assessment needed |
| Enforcement config changes | **Escalate** | Security-critical |
| Security decisions | **Escalate** | Always requires human review |
| Scope contradictions | **Escalate** | Ambiguity resolution |

## Escalation Routing

| Severity | Route To | Response Expectation |
|---|---|---|
| **Critical** | Admiral directly | Immediate — blocks all dependent work |
| **High** | Orchestrator → Admiral if unresolvable | Within current work cycle |
| **Medium** | Orchestrator | Next routing decision point |
