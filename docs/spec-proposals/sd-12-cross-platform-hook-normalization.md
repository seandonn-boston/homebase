# SD-12: Spec Gap Proposal — Cross-Platform Hook Normalization

> Proposes a canonical hook interface, platform capability mapping, payload normalization, and management of platform-specific hooks for cross-platform Admiral deployment.
>
> Affected streams: 7, 17
>
> Priority: Constraining (Priority 2 per SD-02 queue — Phase 3 hooks, Phase 7 adapters)
>
> Date: 2026-03-20

---

## Background

The Admiral Framework's enforcement layer (Part 3) specifies 8 hook lifecycle events and a hook contract (input JSON on stdin, exit code semantics, timeout, chaining). The current implementation targets Claude Code exclusively, using adapter scripts (`.hooks/pre_tool_use_adapter.sh`, `.hooks/post_tool_use_adapter.sh`, `.hooks/session_start_adapter.sh`) that translate Claude Code payloads to Admiral hook contracts.

Stream 17 (Platform Adapters) will extend Admiral to Cursor, Windsurf, VS Code extensions, API-direct deployments, and CI/CD pipelines. Each platform has different hook mechanisms, different lifecycle events, and different payload formats. Without a canonical interface, each platform adapter will reinvent payload translation, lifecycle mapping, and capability detection — producing N incompatible enforcement layers instead of one.

The five underspecified areas from UNDERSPEC-03 (SD-01 inventory):

1. Canonical hook interface definition
2. Handling when platforms lack certain lifecycle events
3. Payload normalization across platforms
4. Platform compatibility matrix
5. Management of platform-specific hooks

---

## 1. Canonical Hook Interface

### Current State

The spec (Part 3) defines a hook contract with input format, exit code semantics, and execution model. The Claude Code adapters implement this contract by translating Claude Code's native `tool_name`/`tool_input` payload into the spec's expected format. However, the "canonical" interface is defined implicitly by the Claude Code implementation rather than explicitly as a platform-agnostic contract.

### Proposed Protocol

#### Admiral Canonical Hook Interface (ACHI)

Every Admiral hook, regardless of platform, receives and produces data in this format:

**Input (JSON on stdin):**

```json
{
  "achi_version": "1.0",
  "event": "PreToolUse",
  "timestamp": "2026-03-20T18:00:00Z",
  "trace_id": "abc-123-def",
  "agent_identity": {
    "agent_id": "backend-implementer",
    "role": "specialist",
    "authority_tier": "autonomous",
    "session_id": "sess-456"
  },
  "platform": {
    "name": "claude-code",
    "version": "1.2.0",
    "capabilities": ["PreToolUse", "PostToolUse", "SessionStart"]
  },
  "tool": {
    "name": "Write",
    "params": { "file_path": "/src/api/route.ts", "content": "..." }
  },
  "context": {
    "working_directory": "/project",
    "git_branch": "feature/auth",
    "tokens_used": 12000,
    "token_budget": 50000
  }
}
```

**Output contract:**

| Output | Meaning |
|--------|---------|
| Exit code 0 | Pass — action proceeds |
| Exit code 1 | Soft block — action blocked, agent receives stdout as error context for self-healing |
| Exit code 2 | Hard block — action blocked, no retry (safety-critical enforcement) |
| Stdout | Fed back to agent as `additionalContext` (PreToolUse) or `systemMessage` (PostToolUse) |
| Stderr | Logged to hook audit trail, not shown to agent |

**Required fields by event type:**

| Event | Required Fields | Optional Fields |
|-------|----------------|-----------------|
| PreToolUse | event, tool.name, tool.params | agent_identity, context |
| PostToolUse | event, tool.name, tool.params, tool.result | agent_identity, context |
| SessionStart | event, platform, context.working_directory | agent_identity |
| PreCommit | event, context.git_branch, context.staged_files | agent_identity |
| PostCommit | event, context.git_branch, context.commit_sha | agent_identity |
| PrePush | event, context.git_branch, context.remote | agent_identity |
| TaskCompleted | event, task.id, task.status | agent_identity, task.metrics |
| Periodic | event, context | agent_identity |

#### Adapter Responsibility

Each platform adapter is responsible for translating the platform's native payload into ACHI format. The adapter is the only platform-specific code. All downstream hooks consume ACHI payloads exclusively.

```
Platform Native Payload → [Platform Adapter] → ACHI Payload → [Admiral Hooks]
```

The existing Claude Code adapters already follow this pattern:
- `pre_tool_use_adapter.sh` reads Claude Code's `tool_name`/`tool_input` and dispatches to Admiral hooks
- `session_start_adapter.sh` loads Standing Orders and context on session start

This pattern is correct. The proposal formalizes it as the required architecture for all platforms.

---

## 2. Handling Missing Lifecycle Events

### Current State

The spec defines 8 lifecycle events. No platform supports all 8. Claude Code supports PreToolUse, PostToolUse, and a subset of others. Some platforms may lack tool-level hooks entirely (API-direct deployments) or lack git-related events (browser-based agents).

### Proposed Protocol

#### Event Availability Tiers

Classify each lifecycle event by how critical it is to Admiral enforcement:

| Tier | Events | Impact if Missing | Adapter Requirement |
|------|--------|-------------------|---------------------|
| **Critical** | PreToolUse, PostToolUse | Core enforcement broken — scope boundaries, prohibitions, budget tracking inoperable | Adapter MUST synthesize these events or Admiral cannot deploy on this platform |
| **Important** | SessionStart | Identity validation and context loading degraded — agents start without Standing Orders | Adapter SHOULD synthesize or provide equivalent initialization path |
| **Useful** | PreCommit, PostCommit, PrePush | Git-workflow enforcement degraded but core tool enforcement intact | Adapter MAY implement if platform has git integration |
| **Optional** | TaskCompleted, Periodic | Reporting and governance degraded but enforcement intact | Adapter MAY implement if platform supports task lifecycle or timers |

#### Synthesis Strategies

When a platform lacks a lifecycle event, the adapter can synthesize it:

| Missing Event | Synthesis Strategy |
|---------------|-------------------|
| **PreToolUse** | Wrap the platform's tool execution API — intercept before dispatch. If the platform has no interception point, Admiral cannot enforce on this platform (document as incompatible). |
| **PostToolUse** | Wrap the platform's tool result callback — intercept after completion. If unavailable, monitoring hooks (loop detection, context health) are disabled; enforcement hooks still work via PreToolUse. |
| **SessionStart** | Inject an initialization step at the start of the first tool call. The adapter detects "first call in session" and runs SessionStart hooks before the first PreToolUse. |
| **PreCommit** | Use git's native `pre-commit` hook (`.git/hooks/pre-commit`). Platform-independent — works on any platform with git. |
| **PostCommit** | Use git's native `post-commit` hook. Platform-independent. |
| **PrePush** | Use git's native `pre-push` hook. Platform-independent. |
| **TaskCompleted** | No synthesis. If the platform doesn't expose task boundaries, this event is unavailable. Governance agents must use alternative signals (e.g., commit messages, time gaps). |
| **Periodic** | Use OS-level scheduling (cron, setInterval). The adapter runs periodic hooks on a timer independent of the platform's event model. |

#### Degradation Reporting

When a platform lacks events, the adapter reports its capability set at SessionStart:

```json
{
  "event": "SessionStart",
  "platform": {
    "name": "cursor",
    "version": "0.48.0",
    "capabilities": ["PreToolUse", "PostToolUse"],
    "missing": ["SessionStart", "PreCommit", "PostCommit", "PrePush", "TaskCompleted", "Periodic"],
    "synthesized": ["SessionStart"],
    "degraded_features": [
      "Git-workflow enforcement unavailable (no PreCommit/PrePush) — using git native hooks as fallback",
      "Periodic governance checks unavailable — using OS cron fallback"
    ]
  }
}
```

Admiral hooks can check `platform.capabilities` and `platform.missing` to adjust behavior when running on limited platforms.

---

## 3. Payload Normalization

### Current State

Different platforms send different payload structures. Claude Code sends `{ "tool_name": "Write", "tool_input": { "file_path": "..." } }`. Other platforms may use different field names, nesting, or data types. The spec's hook contract defines the *Admiral-side* format but not the translation rules.

### Proposed Protocol

#### Normalization Rules

Each adapter normalizes the platform payload to ACHI format using these rules:

| ACHI Field | Claude Code | Cursor | Windsurf | API-Direct |
|-----------|-------------|--------|----------|------------|
| `tool.name` | `tool_name` | `action.type` | TBD | `tool_use.name` |
| `tool.params` | `tool_input` | `action.params` | TBD | `tool_use.input` |
| `tool.result` | `result` | `action.result` | TBD | `tool_result.content` |
| `agent_identity` | Derived from session config | Derived from workspace config | TBD | Provided in request headers |
| `context.working_directory` | `$CLAUDE_PROJECT_DIR` | Workspace root | TBD | Configured per deployment |

**TBD fields**: Cursor and Windsurf hook APIs are not yet publicly documented as of March 2026. The adapter architecture supports adding these mappings when platform APIs stabilize. The table above reserves columns for them.

#### Tool Name Normalization

Different platforms may name the same tool differently. The adapter normalizes to a canonical tool vocabulary:

| Canonical Name | Claude Code | Cursor | API-Direct | Semantics |
|---------------|-------------|--------|------------|-----------|
| `Read` | `Read` | `file.read` | `read_file` | Read file contents |
| `Write` | `Write` | `file.write` | `write_file` | Write file contents |
| `Edit` | `Edit` | `file.edit` | `edit_file` | Modify file contents |
| `Bash` | `Bash` | `terminal.run` | `execute_command` | Execute shell command |
| `Glob` | `Glob` | `file.search` | `glob_files` | Search for files by pattern |
| `Grep` | `Grep` | `content.search` | `grep_files` | Search file contents |

Hooks reference canonical tool names only. The adapter handles the mapping. This means a hook written for `tool.name == "Write"` works on every platform without modification.

#### Unmapped Tools

When a platform provides a tool with no canonical equivalent:

1. The adapter passes through the platform-native name prefixed with the platform: `cursor:ai_edit`, `windsurf:cascade`
2. Hooks can match on the prefixed name for platform-specific enforcement
3. The tool is logged as unmapped in the capability report

#### Normalization Validation

Each adapter includes a normalization test suite that verifies:

1. Every platform-native tool name maps to either a canonical name or a prefixed pass-through
2. Every ACHI required field is populated (no null/undefined after normalization)
3. Field types match the ACHI schema (e.g., `tool.params` is always an object, never a string)

---

## 4. Platform Compatibility Matrix

### Current State

No formal matrix exists mapping platforms to their hook capabilities, limitations, and Admiral feature availability.

### Proposed Protocol

#### Compatibility Matrix Template

| Dimension | Claude Code | Cursor | Windsurf | VS Code Extension | API-Direct | CI/CD |
|-----------|------------|--------|----------|-------------------|------------|-------|
| **Hook mechanism** | Native hooks API | Extension API | Extension API | Extension API | Middleware wrapper | Pipeline step |
| **PreToolUse** | Native | Synthesized | TBD | Synthesized | Native (middleware) | N/A |
| **PostToolUse** | Native | Synthesized | TBD | Synthesized | Native (middleware) | N/A |
| **SessionStart** | Native | Synthesized | TBD | Synthesized | Synthesized | Synthesized |
| **PreCommit** | Git native | Git native | Git native | Git native | Git native | Git native |
| **PostCommit** | Git native | Git native | Git native | Git native | Git native | Git native |
| **PrePush** | Git native | Git native | Git native | Git native | Git native | Git native |
| **TaskCompleted** | Partial | TBD | TBD | N/A | Native | Native |
| **Periodic** | OS cron | OS cron | OS cron | Extension timer | App timer | Pipeline schedule |
| **Identity tokens** | Session config | Workspace config | TBD | Extension config | Request headers | Pipeline vars |
| **Brain access** | CLI (B1) / MCP (B3) | MCP (B3) | TBD | MCP (B3) | MCP (B3) | REST API |
| **Admiral enforcement tier** | Full (E1-E3) | E1-E2 | TBD | E1 | Full (E1-E3) | E1 only |
| **Limitations** | Single-agent focus | Multi-cursor conflicts | TBD | No terminal access | No interactive UI | Batch only |

#### Compatibility Scoring

Each platform receives a compatibility score based on event coverage:

| Score | Meaning | Criteria |
|-------|---------|----------|
| **A — Full** | All Admiral enforcement features available | Critical + Important events native or synthesized; all hook types operational |
| **B — Functional** | Core enforcement available, some governance degraded | Critical events available; Important events synthesized; some Optional missing |
| **C — Minimal** | Basic enforcement only | Critical events synthesized; Important/Optional mostly missing |
| **D — Incompatible** | Cannot run Admiral enforcement | Critical events cannot be synthesized; platform lacks interception points |

#### Matrix Maintenance

The compatibility matrix is maintained as a machine-readable file:

```yaml
# admiral/platform/compatibility-matrix.yaml
version: "1.0"
platforms:
  claude-code:
    score: "A"
    events:
      PreToolUse: native
      PostToolUse: native
      SessionStart: native
      PreCommit: git-native
      # ...
    limitations: ["Single-agent focus at E1"]
    adapter: ".hooks/pre_tool_use_adapter.sh"
  cursor:
    score: "B"
    events:
      PreToolUse: synthesized
      PostToolUse: synthesized
      SessionStart: synthesized
      # ...
    limitations: ["Multi-cursor conflicts", "No native hook API"]
    adapter: "admiral/adapters/cursor/adapter.sh"
```

Adapters read this matrix at initialization to configure their capability set and degradation behavior.

---

## 5. Management of Platform-Specific Hooks

### Current State

All hooks are currently Claude Code-specific. When platform adapters are built, some hooks will need platform-specific behavior (e.g., Cursor-specific tool interception) while most should remain platform-agnostic.

### Proposed Protocol

#### Hook Classification

| Classification | Location | Behavior |
|---------------|----------|----------|
| **Universal hooks** | `admiral/hooks/` | Platform-agnostic. Consume ACHI payloads. Work on every platform with a compatible adapter. |
| **Platform hooks** | `admiral/adapters/{platform}/hooks/` | Platform-specific extensions. Handle platform-unique tools, events, or constraints. |
| **Adapter hooks** | `.hooks/` (project root) | The adapter layer itself. Translates platform native → ACHI. One per platform per lifecycle event. |

#### Directory Structure

```
admiral/
  hooks/                          # Universal hooks (platform-agnostic)
    prohibitions_enforcer.sh
    scope_boundary_guard.sh
    zero_trust_validator.sh
    brain_context_router.sh
    token_budget_tracker.sh
    loop_detector.sh
    context_health_check.sh
    pre_work_validator.sh
  adapters/
    claude-code/                  # Claude Code adapter
      adapter.sh                  # Payload translator
      hooks/                      # Claude Code-specific hooks (if any)
    cursor/                       # Cursor adapter
      adapter.sh
      hooks/
        multi_cursor_guard.sh     # Platform-specific: prevent conflicting edits
    windsurf/
      adapter.sh
      hooks/
    api-direct/
      adapter.sh
      hooks/
    ci-cd/
      adapter.sh
      hooks/
    compatibility-matrix.yaml     # Machine-readable platform capabilities
```

#### Hook Resolution Order

When an event fires, hooks execute in this order:

1. **Platform adapter** translates native payload to ACHI
2. **Universal hooks** execute in declared order (same on every platform)
3. **Platform hooks** execute after universal hooks (platform-specific extensions)

This ensures universal enforcement is consistent across platforms, with platform-specific hooks adding capabilities where needed.

#### Platform Hook Guidelines

Platform hooks should be used sparingly. A hook that exists only for one platform is a sign of either:

1. **A platform limitation** requiring a workaround (acceptable — document why)
2. **A universal concern** that should be promoted to `admiral/hooks/` (refactor)

Platform hooks MUST NOT weaken universal enforcement. A platform hook may add restrictions beyond universal hooks but may never relax them. The universal enforcement is the floor, not the ceiling.

#### Adapter Testing Requirements

Each adapter must pass:

1. **ACHI compliance tests**: Normalized output matches the ACHI schema for all supported events
2. **Tool normalization tests**: All platform-native tool names map correctly
3. **Degradation tests**: Missing events are correctly reported and synthesized where possible
4. **Round-trip tests**: A known platform payload produces the expected ACHI output, which produces the expected hook behavior
5. **Regression tests**: Platform API changes don't silently break normalization (version-pinned test fixtures)

---

## Impact Assessment

### Streams Unblocked

| Stream | What This Unblocks |
|--------|-------------------|
| **7** (Hooks & Fleet Foundation) | Missing hooks can be implemented against ACHI rather than Claude Code-specific payloads |
| **17** (Platform Adapters) | Adapter architecture, directory structure, and testing requirements are defined |

### New Artifacts Required for Implementation

| Artifact | Stream | Description |
|----------|--------|-------------|
| `admiral/schemas/achi.v1.schema.json` | 7 | JSON Schema for the Admiral Canonical Hook Interface |
| `admiral/adapters/compatibility-matrix.yaml` | 17 | Machine-readable platform compatibility matrix |
| `admiral/adapters/claude-code/adapter.sh` | 17 | Refactored Claude Code adapter (extracted from `.hooks/`) |
| `admiral/hooks/` directory | 7 | Universal hooks extracted from `.hooks/` |
| Tool name normalization map | 7 | Canonical tool vocabulary as YAML/JSON |

### Backward Compatibility

- **Existing hooks continue to work.** The current `.hooks/` adapters already implement the adapter pattern. This proposal formalizes and generalizes it.
- **No breaking changes.** The ACHI format is a superset of what existing hooks already consume (event, tool name, params).
- **Migration path:** Extract universal hooks from `.hooks/` to `admiral/hooks/`. Refactor `.hooks/` adapters to the `admiral/adapters/claude-code/` structure. This is Stream 17 work, not immediate.

### Open Questions for Admiral Review

1. **Adapter language**: Should adapters be shell scripts (portable but limited) or can they use Node.js/Python (more capable but adds runtime dependencies)?
2. **ACHI versioning**: When ACHI v2 is needed, should adapters support both v1 and v2 simultaneously, or is a clean version cutover acceptable?
3. **Cursor/Windsurf timing**: These platforms' extension APIs may change rapidly. Should adapter development wait until APIs stabilize, or ship early and iterate?
4. **Hook marketplace**: Should platform-specific hooks be shareable across Admiral deployments (a hook registry), or are they always deployment-specific?

---

## Relationship to Other SD Tasks

| Task | Relationship |
|------|-------------|
| **SD-10** (Fleet orchestration protocol) | Agent unavailability signals may differ across platforms — ACHI normalizes the signal format |
| **SD-11** (Brain graduation) | Brain CLI tools (B1) vs MCP tools (B3) require different access patterns per platform |
| **SD-03** (Amendment proposals) | This proposal is a candidate amendment to Part 3 (Enforcement) and Part 9 (Platform Integration) |
| **SD-06** (Reference constants) | Hook timeouts, max retries, and synthesis strategies should be added to reference constants |
