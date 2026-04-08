# ISO 42001 (AI Management System) Alignment (R-08)

> Clause-by-clause mapping of ISO 42001 to Admiral Framework capabilities

**Last updated:** 2026-04-09

---

## Coverage Matrix

| ISO 42001 Clause | Admiral Coverage | Key Components |
|---|---|---|
| **4. Context of the Organization** | Full | AGENTS.md (organizational context), Ground Truth document, readiness assessment |
| **5. Leadership** | Full | Admiral role (human oversight), Standing Orders (management commitment), Decision Authority tiers |
| **6. Planning** | Full | plan/ROADMAP.md (risk treatment), plan/todo/ (objectives), stream definitions (risk assessment) |
| **7. Support** | Full | CONTRIBUTING.md (competence), docs/ (awareness), ADMIRAL_STYLE.md (documented information) |
| **8. Operation** | Full | Hook enforcement (operational planning), fleet registry (AI system inventory), execution runtime (operational control) |
| **9. Performance Evaluation** | Full | Control plane monitoring (performance evaluation), scanner (internal audit), rating system (management review) |
| **10. Improvement** | Full | Brain B2 (institutional memory for lessons learned), escalation pipeline (corrective action), roadmap reconciliation (continual improvement) |

## Statement of Applicability Template

| Control | Applicable | Justification | Implementation |
|---|---|---|---|
| Risk assessment for AI systems | Yes | All agent operations assessed via Standing Orders | SO-05, SO-14, Progressive Autonomy |
| AI system lifecycle management | Yes | Agent versioning, definition templates, fleet registry | AgentVersionRegistry, F-12a schema |
| Data management | Yes | Brain B2 with classification, quarantine pipeline | 5-layer quarantine, sensitivity labels |
| Human oversight | Yes | Decision Authority tiers, Admiral approval API | AU-11, SO-05 4-tier model |
| Transparency | Yes | Audit trail, event stream, execution trace | EventStream, SHA-256 hash chain |
| Bias and fairness | Yes | Bias Sentinel agent, SO-13 Bias Awareness | Governance agents, compliance_ethics_advisor |
| Security and privacy | Yes | Injection detection, PII scanning, access control | 90-pattern detector, identity tokens |
| Third-party management | Yes | MCP server security, protocol registry | protocol_registry_guard, 5-layer MCP security |

**Overall coverage: 8/8 control areas addressed.**
