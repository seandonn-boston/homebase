# Homebase

**The operational headquarters for the Admiral Framework and supporting research, thesis documents, and early-stage implementation.**

Homebase is a monorepo containing four major workstreams — all converging on a single question: *How should organizations govern, coordinate, and operate fleets of autonomous AI agents?*

---

## What's Here

### 🔷 [`aiStrat/`](aiStrat/) — The Admiral Framework `v0.18.17-alpha.1773832706812`

The flagship project. **Admiral** is a comprehensive, model-agnostic specification for AI agent fleet orchestration — 114 files across 22 groups defining how autonomous AI agent systems should be structured, secured, coordinated, and governed.

Admiral is built on a core insight: *AI agents are not employees and they are not code. They are an entirely new category of resource — one that makes decisions, fails in novel ways, and forgets everything between sessions. They require governance designed from scratch for how they actually behave.*

#### Three Pillars

| Pillar | Directory | What It Defines |
|---|---|---|
| **Doctrine** | [`admiral/`](aiStrat/admiral/) | 12-part operational framework — strategy, context engineering, deterministic enforcement, fleet composition, the Brain knowledge system, execution patterns, quality assurance, operations, platform integration, meta-agent governance, universal protocols, and the closed-loop data ecosystem |
| **Fleet** | [`fleet/`](aiStrat/fleet/) | Agent catalog with 71 core + 34 extended role definitions, prompt assembly patterns, routing rules, interface contracts, model tier assignments, and context injection guides |
| **Design Artifacts** | [`brain/`](aiStrat/brain/) · [`monitor/`](aiStrat/monitor/) | Brain: 3-level semantic long-term memory architecture (B1-B3) with database schema. Monitor: ecosystem intelligence scanner with immune system design — runs daily via GitHub Actions |

#### Key Concepts

- **Enforcement Spectrum** — Deterministic hooks over advisory instructions. Hooks fire every time regardless of context pressure.
- **Decision Authority Tiers** — Enforced / Autonomous / Propose / Escalate. Agents earn trust per category, not globally.
- **Intent Engineering** — Communicating *what you want to achieve*, not *what you think the system needs to hear*.
- **Standing Orders** — 15 non-negotiable rules forming the behavioral floor for all agents.
- **Per-Component Scaling** — Seven independently-scaling components (Brain, Fleet, Enforcement, Control Plane, Security, Protocols, Data Ecosystem) with five Quick-Start Profiles: Starter → Team → Governed → Production → Enterprise.

#### Entry Points

| I need to... | Start here |
|---|---|
| Understand the full framework | [`admiral/spec/index.md`](aiStrat/admiral/spec/index.md) |
| See every file at a glance | [`MANIFEST.md`](aiStrat/MANIFEST.md) |
| See how agents are defined | [`fleet/prompt-anatomy.md`](aiStrat/fleet/prompt-anatomy.md) |
| Understand the fleet catalog | [`fleet/README.md`](aiStrat/fleet/README.md) |
| Understand the Brain architecture | [`brain/README.md`](aiStrat/brain/README.md) |
| Understand the Monitor / immune system | [`monitor/README.md`](aiStrat/monitor/README.md) |

---

### 🧪 [`control-plane/`](control-plane/) — Admiral Control Plane MVP `v0.1.0`

The first implementation code. A TypeScript-based control plane providing agent observability, runaway detection, and execution trace visualization.

**Modules:**
- **Event System** (`events.ts`) — Structured event types for agent lifecycle tracking
- **Execution Traces** (`trace.ts`) — Trace capture and analysis for agent sessions
- **Runaway Detector** (`runaway-detector.ts`) — Automated detection of looping, budget overrun, and scope explosion
- **Instrumentation** (`instrumentation.ts`) — Hook-based agent instrumentation layer
- **HTTP Server** (`server.ts`) — API surface for trace ingestion and dashboard queries
- **Dashboard** (`src/dashboard/`) — Visualization layer for fleet observability

**Prerequisites:** Node.js 22+ (see `.nvmrc`), `jq`

```bash
cd control-plane
npm install
npm run build
npm test          # Run unit tests
npm run example   # Run the demo
```

---

### 📚 [`research/`](research/) — Market Intelligence & Competitive Analysis

Deep research supporting Admiral's positioning and thesis:

- **Competitive Landscape** — Analysis of CrewAI, LangGraph, Google ADK, Microsoft Agent Framework, Credo AI, and other players across four categories
- **Akka Competitor Analysis** — Deep dive on the most credible adjacent threat (runtime infra moving toward governance)
- **Idea Competitors** — Who else is articulating the "agents need purpose-built governance" thesis (McKinsey, Gartner, NIST, etc.)
- **AI Models Timeline** — Comprehensive chronological timeline (2010–March 2026) across model releases, market events, geopolitics, infrastructure, and research
- **AI Pioneer Profiles** — 20 key figures in AI history from Hopfield and Hinton through the current era
- **Cutting-Edge Use Cases** — Real-world AI agent fleet deployments (Waymo, Tesla FSD, Figure AI, and beyond)
- **Agent Toolkits Survey** — Top Claude Code, Cursor, Windsurf, and Codex configurations and production setups
- **Governance Frameworks** — Analysis of McKinsey, Gartner, NIST, ISO, and other governance approaches
- **Product Strategy** — The "AI Work OS" reframe: Admiral as operating system, not just governance
- **Future Operations** — What the world looks like when Admiral becomes default infrastructure

---

### 📄 [`thesis/`](thesis/) — Strategic Thesis Documents

The intellectual foundation underlying everything else:

- **Fundamental Truths About AI** — Two axioms: capabilities keep improving, and what we know today may not be true tomorrow
- **AI Investment Thesis** — Why the current AI infrastructure cycle is a down payment, not a bubble
- **AI Inherits the Internet** — Why AI adoption is faster than any prior technology wave
- **Competitive Advantage Analysis** — Honest founder's assessment of Admiral's viability and moats
- **Agentic Engineering Ladder** — Nine-rung maturity model from prompt engineering through fleet governance
- **Systems Thinking Framework** — Five lenses (ecosystems, incentives, workflows, feedback loops, constraints) that differentiate Admiral's approach

---

## CI/CD & Automation

| Workflow | Trigger | Purpose |
|---|---|---|
| **Spec Validation** | Push/PR to `aiStrat/` | Validates VERSION semver, JSON/YAML syntax, and markdown cross-references |
| **Version Bump** | PR merge to `main` | Auto-bumps version based on conventional commits, creates git tags |
| **AI Landscape Monitor** | Daily 07:00 UTC / Weekly Monday 06:00 UTC | Scans AI ecosystem for new releases, trending repos, and developments; commits digests |

---

## Project Status

**Phase:** Specification + Early Implementation (Alpha)

The Admiral Framework specification is comprehensive (114 files, 15,000+ lines) and actively evolving. The control plane MVP is the first step toward runnable software. The project is positioned at the intersection of the **autonomous AI agent market** ($8.5B by 2026, projected $35–45B by 2030) and the **AI governance market** ($940M in 2025, projected $7.4B by 2030).

---

## License

MIT (control-plane). Specification licensing TBD.

---

*Built by [@seandonn-boston](https://github.com/seandonn-boston)*
