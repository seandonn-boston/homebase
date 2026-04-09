# Academic Paper Outline: Deterministic Governance for AI Agent Fleets (TV-09)

> Conference paper outline (8000-12000 words). Detailed enough for independent section drafting.

---

## Section 1: Abstract (300 words)

- Problem: AI agent systems lack deterministic governance — enforcement is advisory, not guaranteed
- Contribution: Admiral Framework — a governance operating system with 20 deterministic hooks, 16 Standing Orders, 4-tier decision authority, and progressive autonomy
- Key finding: Deterministic enforcement (hooks fire every call) produces measurably lower violation rates than advisory-only approaches
- Significance: First framework to treat governance as a first-class architectural concern with formal specification

## Section 2: Introduction (1000 words)

- Motivation: Rise of multi-agent AI systems in enterprise
- Problem statement: Advisory governance fails under context pressure
- Research question: Can deterministic enforcement mechanisms reduce governance violations without unacceptable productivity loss?
- Thesis: Deterministic enforcement beats advisory guidance for AI agent governance
- Paper organization overview

## Section 3: Background & Related Work (1500 words)

- Agent governance taxonomies (advisory vs. enforcement)
- Existing frameworks: LangGraph, CrewAI, AutoGen, Semantic Kernel
- Security frameworks: OWASP Agentic Top 10, NIST ZTA
- Industry analyses: McKinsey Agentic Organization, Forrester AEGIS
- Gap: No existing framework provides deterministic enforcement with institutional memory

## Section 4: Admiral Framework Architecture (2000 words)

- 11-part specification overview
- Hook enforcement model (PreToolUse, PostToolUse, SessionStart)
- Standing Orders as behavioral constraints
- 4-tier Decision Authority model
- Brain system (3-tier institutional memory)
- Progressive autonomy (trust scoring)
- Fleet management (71 agent definitions, routing engine)

## Section 5: Methodology (1500 words)

- Metrics: violation rate, false positive rate, productivity impact, hook latency
- Comparison: advisory-only baseline vs. deterministic enforcement
- Attack corpus testing (30 ATK scenarios)
- Chaos testing (26 failure scenarios)
- Quality metrics (384+ TS tests, 350+ bash tests, mutation testing)

## Section 6: Results (1500 words)

- Violation detection: 100% of attack corpus scenarios correctly handled
- False positive rate: < 1% (hooks correctly allow valid operations)
- Hook latency: < 50ms per hook, < 100ms total per tool call
- Productivity impact: negligible (< 100ms overhead per tool call)
- Progressive autonomy: agents earn expanded authority through measured performance
- Institutional memory: Brain B2 enables context-aware decisions

## Section 7: Discussion (1000 words)

- Deterministic enforcement as a paradigm shift for AI governance
- Trade-offs: adoption complexity vs. governance guarantee
- Limitations: current implementation is single-machine, Brain B3 not yet production
- Generalizability: framework patterns apply beyond Claude Code
- Implications for enterprise AI governance strategy

## Section 8: Conclusion & Future Work (500 words)

- Summary of contributions
- Practical implications for organizations deploying AI agents
- Future: Brain B3 (Postgres), multi-repo support, real-time collaboration dashboard
- Call to action: governance as infrastructure, not afterthought

---

## Target Venues
- ACM Conference on AI, Ethics, and Society (AIES)
- AAAI Workshop on AI Safety
- IEEE Conference on Autonomous Agents
- NeurIPS Workshop on Foundation Models

## Appendices (for extended version)
- A: Full Standing Orders list
- B: Hook enforcement specification
- C: Attack corpus catalog
- D: Compliance crosswalk summaries
