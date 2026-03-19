# Stream 17: Platform Adapters — Beyond Claude Code

> *"The Orchestrator speaks all protocols; specialists speak their native protocol." — Admiral Spec, Part 9*

**Scope:** This stream expands Admiral beyond Claude Code to other AI coding tools and platforms. The Admiral framework is designed to be platform-agnostic — the spec, standing orders, agent definitions, and governance rules are model-agnostic and tool-agnostic. But the current implementation is Claude Code-specific: hooks are Claude Code lifecycle hooks, context injection uses CLAUDE.md and `.claude/` conventions, and tool permissions use Claude Code's settings format. This stream creates an adapter layer that decouples Admiral governance from any single platform.

**Current state:** All enforcement is Claude Code-specific. Hooks are shell scripts invoked by Claude Code's PreToolUse/PostToolUse lifecycle. Context injection is via CLAUDE.md and `.claude/skills/`. Configuration is in `.claude/settings.local.json`. The spec (Part 9) describes heterogeneous protocol support and platform adaptation but provides no concrete adapter interface. The fleet control plane extension describes platform-independent concepts but the implementation is platform-dependent.

**Why this matters:** Admiral's value proposition is governance for AI agent fleets. If that governance only works in Claude Code, adoption is limited to one tool's ecosystem. The AI coding tool landscape is fragmented — teams use Cursor, Windsurf, VS Code extensions, and direct API access. Admiral governance should follow the team, not the tool. Platform adapters make the spec's promise of tool-agnostic governance real.

---

## PA-01: Platform Adapter Interface Specification

- [ ] **PA-01: Define the abstract platform adapter interface**
  - **Description:** Define the abstract interface that all platform adapters must implement. The interface must cover: lifecycle hooks (session start, pre-tool-use, post-tool-use, session end), context injection (how the platform loads AGENTS.md, standing orders, ground truth, and skills), tool permission enforcement (how the platform restricts which tools an agent can use), configuration loading (where the platform reads Admiral configuration from), event emission (how the platform emits structured events for the Control Plane), and subagent coordination (how the platform spawns and coordinates multiple agents). Each method in the interface must have a clear contract: inputs, outputs, error handling, and platform-specific adaptation notes.
  - **Done when:** Interface specification exists as a TypeScript interface file with full JSDoc documentation. Every method has typed inputs and outputs. Platform-specific adaptation guidance is documented for each method. The interface is minimal — it captures only what Admiral needs from a platform, not everything a platform can do.
  - **Files:** `platform/adapter-interface.ts` (new), `platform/adapter-interface.md` (new — human-readable spec for adapter implementers)
  - **Size:** L
  - **Spec ref:** Part 9 — Heterogeneous Protocol Support, Part 3 — Enforcement (hook lifecycle)

---

## PA-02: Claude Code Adapter Refactor

- [ ] **PA-02a: Extract Claude Code-specific logic into adapter**
  - **Description:** Refactor the existing Claude Code hooks, context injection, and configuration into the platform adapter interface pattern. Currently, Claude Code integration is spread across `.hooks/`, `.claude/`, and `admiral/` with no abstraction layer. Extract all Claude Code-specific logic into a single adapter module that implements the adapter interface (PA-01). The adapter translates between Claude Code hook payloads (JSON via stdin, exit codes for control flow) and the Admiral hook contracts (standing order evaluation, brain queries, governance checks).
  - **Done when:** All Claude Code-specific code lives in `platform/claude-code/`. The adapter implements every method of the adapter interface. Existing hooks continue to work identically (no behavior change). The adapter is the only place that knows about Claude Code payload formats, `.claude/` directory conventions, and Claude Code-specific tool names.
  - **Files:** `platform/claude-code/adapter.ts` (new), `platform/claude-code/hooks.ts` (new — extracted from `.hooks/`), `platform/claude-code/context.ts` (new), `platform/claude-code/config.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 9, Part 3 — Enforcement
  - **Depends on:** PA-01

- [ ] **PA-02b: Claude Code adapter tests**
  - **Description:** Create comprehensive tests for the Claude Code adapter that verify it correctly implements the adapter interface. Tests must cover: hook payload translation (Claude Code JSON format -> Admiral hook contract), context injection (CLAUDE.md + .claude/skills/ -> assembled context), configuration loading (.claude/settings.local.json -> Admiral config), and event emission (hook results -> structured events). These tests become the reference implementation for testing any adapter.
  - **Done when:** Claude Code adapter tests achieve full coverage of the adapter interface. Every interface method is tested with both valid and invalid inputs. Tests verify backward compatibility with existing hook behavior. Test patterns are documented as templates for other adapter tests.
  - **Files:** `platform/claude-code/adapter.test.ts` (new), `platform/claude-code/hooks.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 3 — Enforcement
  - **Depends on:** PA-02a

---

## PA-03: Cursor Adapter

- [ ] **PA-03: Cursor IDE adapter**
  - **Description:** Create a platform adapter for Cursor IDE. Cursor uses `.cursorrules` for context injection and has its own tool permission model. The adapter must translate: Admiral standing orders and agent definitions into `.cursorrules` format, Admiral tool permissions into Cursor's permission model, Admiral hook contracts into Cursor's lifecycle events (if available) or into a polling-based alternative, and structured events into the Control Plane event format. Must handle Cursor-specific features: composer mode, multi-file editing, and inline chat context.
  - **Done when:** Cursor adapter implements the full adapter interface. Standing orders are injected via `.cursorrules`. Tool permissions are enforced to the extent Cursor's model allows. A gap analysis documents which Admiral features work fully, partially, or not at all in Cursor. Integration test runs a basic governance scenario in Cursor.
  - **Files:** `platform/cursor/adapter.ts` (new), `platform/cursor/context.ts` (new), `platform/cursor/config.ts` (new), `platform/cursor/adapter.test.ts` (new), `platform/cursor/README.md` (new — setup and gap analysis)
  - **Size:** L
  - **Spec ref:** Part 9 — Heterogeneous Protocol Support
  - **Depends on:** PA-01

---

## PA-04: Windsurf Adapter

- [ ] **PA-04: Windsurf/Codeium IDE adapter**
  - **Description:** Create a platform adapter for Windsurf (Codeium). Windsurf uses `.windsurfrules` for context injection and has its own agent framework (Cascade). The adapter must translate Admiral governance into Windsurf's conventions: standing orders into `.windsurfrules`, agent definitions into Windsurf's agent format, and tool permissions into Windsurf's capability model. Must handle Windsurf-specific features: Cascade flows, multi-step task execution, and Windsurf's built-in context management.
  - **Done when:** Windsurf adapter implements the full adapter interface. Standing orders are injected via `.windsurfrules`. A gap analysis documents feature coverage. Integration test runs a basic governance scenario.
  - **Files:** `platform/windsurf/adapter.ts` (new), `platform/windsurf/context.ts` (new), `platform/windsurf/config.ts` (new), `platform/windsurf/adapter.test.ts` (new), `platform/windsurf/README.md` (new — setup and gap analysis)
  - **Size:** L
  - **Spec ref:** Part 9 — Heterogeneous Protocol Support
  - **Depends on:** PA-01

---

## PA-05: API-Direct Adapter

- [ ] **PA-05: Headless API-direct adapter**
  - **Description:** Create a headless adapter for CI/CD pipelines, scripted usage, and direct API access (Anthropic API, OpenAI API, etc.). This adapter has no IDE — it runs agents programmatically via API calls. Must implement all adapter interface methods: lifecycle hooks fire as function calls (not shell scripts), context injection assembles the prompt programmatically, tool permissions are enforced at the API call layer, and events are emitted to stdout or a log sink. This is the adapter for event-driven agent patterns from Part 9 (PR review, CI failure diagnosis, issue triage, scheduled operations).
  - **Done when:** API-direct adapter runs agents headlessly with full Admiral governance. Lifecycle hooks fire at the correct points in the agent execution loop. Context is assembled and injected programmatically. Events are emitted in the structured JSON-lines format defined by the Fleet Control Plane (CP1). Integration test runs a CI/CD-triggered agent scenario end-to-end.
  - **Files:** `platform/api-direct/adapter.ts` (new), `platform/api-direct/runtime.ts` (new), `platform/api-direct/config.ts` (new), `platform/api-direct/adapter.test.ts` (new), `platform/api-direct/README.md` (new)
  - **Size:** L
  - **Spec ref:** Part 9 — CI/CD & Event-Driven Operations, Event-Driven Agent Patterns
  - **Depends on:** PA-01

---

## PA-06: VS Code Extension Scaffold

- [ ] **PA-06: VS Code extension scaffold**
  - **Description:** Create a VS Code extension that integrates with Admiral hooks and provides a basic Control Plane UI within the editor. The extension must: display fleet status in a sidebar panel (CP1/CP2 level), show agent identity and current task in the status bar, fire Admiral hooks when VS Code-based AI tools (GitHub Copilot, Continue, etc.) execute actions, and surface alerts as VS Code notifications. This is a scaffold — full feature parity with the web-based Control Plane is not required.
  - **Done when:** VS Code extension installs, displays fleet status in a sidebar, shows agent identity in status bar, and surfaces CRITICAL/HIGH alerts as VS Code notifications. Extension communicates with the MCP server (Stream 16) for fleet data. Extension scaffold is documented for future feature development.
  - **Files:** `platform/vscode/extension.ts` (new), `platform/vscode/package.json` (new), `platform/vscode/sidebar.ts` (new), `platform/vscode/status-bar.ts` (new), `platform/vscode/README.md` (new)
  - **Size:** L
  - **Spec ref:** Fleet Control Plane extension — CP1/CP2
  - **Depends on:** PA-01, Stream 16 M-01 (MCP server)

---

## Event-Driven & Scheduled Agent Patterns (Part 9)

- [ ] **PA-10: Event-driven agent framework**
  - **Description:** Define agent trigger patterns for automated events: PR opened triggers code review agent, CI failure triggers diagnosis agent, issue created triggers triage agent, webhook triggers custom agent, monitor finding triggers intelligence agent. Each pattern specifies: trigger condition, context bootstrap sequence, authority level (Autonomous-1 by default — shifted one tier down from interactive), allowed actions, result routing, and cost cap.
  - **Files:** `platform/event-driven/framework.ts` (new), `platform/event-driven/triggers.ts` (new), `platform/event-driven/bootstrap.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 9 — CI/CD & Event-Driven Operations

- [ ] **PA-11: Headless agent authority narrowing**
  - **Description:** Default headless agents to Autonomous-1 tier (Autonomous→Propose, Propose→Escalate). Cannot merge PRs, delete branches, modify production infrastructure without explicit config. Enforced by hook, not instruction.
  - **Files:** `platform/event-driven/authority.ts` (new), `.hooks/headless_authority_gate.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 9 — Headless Guardrails

- [ ] **PA-12: Scheduled agent runner**
  - **Description:** Cron-like scheduler for maintenance agents: knowledge gardening, stale entry cleanup, health report generation, dependency auditing. Config-driven schedule with cost circuit breakers per invocation and monthly budget ceilings.
  - **Files:** `platform/scheduled/runner.ts` (new), `platform/scheduled/config.json` (new), `platform/scheduled/cost-breaker.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 9 — Scheduled Agents

- [ ] **PA-13: Context bootstrap for headless agents**
  - **Description:** Automated context assembly for agents without interactive sessions: load event payload, load Ground Truth, query Brain for relevant context, apply scope constraints, configure result routing.
  - **Files:** `platform/event-driven/context-bootstrap.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 9 — Context Bootstrapping

---

## PA-07: Platform Capability Matrix

- [ ] **PA-07: Platform capability matrix documentation**
  - **Description:** Create a comprehensive matrix documenting which Admiral features work on which platforms. For each platform (Claude Code, Cursor, Windsurf, API-direct, VS Code), document: lifecycle hook support (full/partial/none for each hook type), context injection mechanism, tool permission granularity, subagent support, MCP server access, event emission capability, and Control Plane integration level. This matrix is the authoritative reference for users choosing a platform or understanding feature gaps.
  - **Done when:** Capability matrix covers all platforms with all Admiral feature dimensions. Each cell is rated (Full/Partial/None) with notes explaining limitations. Matrix is maintained alongside adapter code (not a separate document that drifts). Matrix is referenced from the main project documentation.
  - **Files:** `platform/capability-matrix.md` (new)
  - **Size:** M
  - **Spec ref:** Part 9 — Heterogeneous Protocol Support
  - **Depends on:** PA-02a, PA-03, PA-04, PA-05, PA-06

---

## PA-08: Platform Adapter Testing Framework

- [ ] **PA-08: Shared adapter test suite**
  - **Description:** Create a shared test suite that all platform adapters must pass. The test suite exercises every method in the adapter interface with standardized test cases. Adapters import the shared test suite and run it against their implementation. This ensures consistent governance behavior across platforms — an Admiral standing order must produce the same enforcement regardless of whether it runs in Claude Code, Cursor, or CI/CD. The shared suite also defines platform-specific test extension points for adapter-specific features.
  - **Done when:** Shared test suite exists with test cases for every adapter interface method. Claude Code adapter passes the shared suite. Test suite is runnable via a single command per adapter. Test report shows pass/fail per method per adapter. Extension points allow adapters to add platform-specific tests without modifying the shared suite.
  - **Files:** `platform/tests/shared-suite.ts` (new), `platform/tests/shared-suite.test.ts` (new), `platform/tests/README.md` (new)
  - **Size:** M
  - **Spec ref:** Part 3 — Enforcement (consistency requirement)
  - **Depends on:** PA-01, PA-02a

---

## PA-09: Platform-Specific Context Injection

- [ ] **PA-09: Customize context injection per platform capabilities**
  - **Description:** Implement platform-specific context injection strategies that optimize for each platform's capabilities. Claude Code has CLAUDE.md + .claude/skills/ (progressive disclosure). Cursor has .cursorrules (single file, limited size). Windsurf has .windsurfrules. API-direct has full programmatic control (no size limits). VS Code extensions have custom context providers. The context injection adapter must: select the right strategy per platform, handle platform-specific size limits (some platforms truncate context silently), prioritize context per the budget allocation table in `fleet/context-injection.md` (Identity/Authority/Constraints are never sacrificed), and verify context sufficiency after injection.
  - **Done when:** Each platform adapter injects context using its platform's optimal mechanism. Context budget allocation follows the priority table. Identity, Authority, and Constraints are never truncated regardless of platform limits. Context sufficiency check runs after injection (agent can answer the three minimum-viable-intent questions). Integration test verifies context injection on each platform.
  - **Files:** `platform/context-injection/strategy.ts` (new), `platform/context-injection/budget.ts` (new), `platform/context-injection/strategy.test.ts` (new)
  - **Size:** M
  - **Spec ref:** `fleet/context-injection.md` — Context Budget Guidelines, `fleet/prompt-anatomy.md` — Assembly Order
  - **Depends on:** PA-01, Stream 15 O-03a (context assembly)

---

## Stream 17 Summary

| Item | Description | Size | Depends on |
|------|-------------|------|------------|
| PA-01 | Platform adapter interface specification | L | — |
| PA-02a | Extract Claude Code-specific logic into adapter | L | PA-01 |
| PA-02b | Claude Code adapter tests | M | PA-02a |
| PA-03 | Cursor IDE adapter | L | PA-01 |
| PA-04 | Windsurf/Codeium IDE adapter | L | PA-01 |
| PA-05 | Headless API-direct adapter | L | PA-01 |
| PA-06 | VS Code extension scaffold | L | PA-01, Stream 16 M-01 |
| PA-07 | Platform capability matrix documentation | M | PA-02a, PA-03, PA-04, PA-05, PA-06 |
| PA-08 | Shared adapter test suite | M | PA-01, PA-02a |
| PA-09 | Platform-specific context injection | M | PA-01, Stream 15 O-03a |
| PA-10 | Event-driven agent framework | L | — |
| PA-11 | Headless agent authority narrowing | M | — |
| PA-12 | Scheduled agent runner | M | — |
| PA-13 | Context bootstrap for headless agents | M | — |
