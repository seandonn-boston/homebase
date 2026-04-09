# Competitive Differentiation Matrix (R-10)

> Feature-by-feature comparison across 10+ dimensions

**Last updated:** 2026-04-09

---

## Matrix

| Dimension | Admiral | LangGraph | CrewAI | AutoGen | Semantic Kernel | StrongDM Leash | Perplexity Computer |
|---|---|---|---|---|---|---|---|
| **Deterministic enforcement** | Hooks fire every call (unforgeable) | None (advisory) | None | None | None | Kernel-level (strong) | None |
| **Agent identity** | Per-agent tokens + fleet registry | None | Role-based (informal) | None | None | Workload identity | None |
| **Graduated trust** | 4-stage progressive autonomy | None | None | None | None | Binary (allow/deny) | None |
| **Institutional memory** | 3-tier Brain (JSON → SQLite → Postgres) | None | Shared memory (basic) | None | Memory plugin | None | Session memory |
| **Fleet coordination** | 71 agents, routing engine, handoff protocol | Graph-based workflows | Crew assembly | GroupChat | Multi-agent | None | Multi-model |
| **Behavioral governance** | 16 Standing Orders, compliance agents | None | None | None | None | Policy rules | None |
| **Cross-platform** | Adapters for Claude Code, Cursor, Windsurf, API | LangChain ecosystem | CrewAI only | AutoGen only | Azure ecosystem | Multi-platform | Perplexity only |
| **Observability** | EventStream, tracing, SPC detection, dashboards | LangSmith | Basic logging | AutoGen Studio | Azure monitoring | Audit logs | Basic |
| **Spec-driven** | 11-part formal specification | No spec | No spec | No spec | No spec | No spec | No spec |
| **Self-governance** | Meta-governance agents monitor governance | None | None | None | None | None | None |
| **Attack defense** | 90-pattern detector, 30 ATK scenarios, 5-layer quarantine | None | None | None | None | Basic input validation | None |
| **Quality automation** | 6-stage quality gates, rating system, mutation testing | None | None | None | None | None | None |

## The "Good Enough" Stack Challenge

Enterprise buyers may assemble: **Leash** (enforcement) + **Computer** (orchestration) + **Comet Enterprise** (browser governance). This assembled stack:

- Has stronger kernel-level enforcement (Leash) for individual tool calls
- Has broader consumer reach (Perplexity's product surface)
- Lacks: institutional memory, graduated trust, behavioral governance, self-governance, spec-driven architecture, fleet coordination at the governance layer

**Admiral's counter-positioning:** Admiral is the only framework that treats governance as a first-class architectural concern rather than an add-on. The assembled stack governs at the edges; Admiral governs from the core.

## Honest Trade-off Assessment

| Admiral Advantage | Admiral Limitation |
|---|---|
| Deepest governance model in the market | Higher adoption complexity than "drop-in" solutions |
| Spec-driven (auditable, reproducible) | Requires organizational commitment to the Admiral model |
| Institutional memory compounds over time | Brain B3 (Postgres) not yet production-deployed |
| 71 agent definitions for common roles | Agent definitions are templates, not trained models |
| Cross-platform adapters | Adapter development required per new platform |
