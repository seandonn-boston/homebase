<!-- Admiral Framework v0.3.1-alpha -->
# Hook Ecosystem

**Manifest-first hook management for the Admiral Framework.**

Hooks are the deterministic enforcement layer — they fire every time, regardless of context pressure. "Deterministic" means: an instruction in AGENTS.md can be forgotten as the session lengthens and context pressure builds; a hook fires on every invocation regardless of what the agent has or hasn't remembered. This is the fundamental insight of the enforcement spectrum (Section 08) — any constraint that must hold with zero exceptions must be a hook, not an instruction.

This document specifies the hook ecosystem: how hooks declare their capabilities, how the runtime discovers and validates them, and how hook dependencies are resolved.

For hook lifecycle events, execution model, and contract specification, see `admiral/part3-enforcement.md` (Section 08).

-----

## Manifest-First Design

Every hook ships with a `hook.manifest.json` that self-describes the hook's capabilities, dependencies, and contract version. The manifest is the hook's identity — without it, the runtime will not load the hook.

### Directory Convention

```
hooks/
├── README.md                    ← this file
├── manifest.schema.json         ← JSON Schema for hook manifests
└── [hook-name]/
    ├── hook.manifest.json       ← manifest (required)
    └── [hook executable]        ← shell script, Python, or binary
```

Each hook lives in its own directory under `hooks/`. The directory name must match the hook's `name` field in the manifest.

> **Implementation Note:** The hook directories in `aiStrat/hooks/` contain manifests only — they are specification artifacts, not executable implementations. Implementations live in the consuming project (e.g., `admiral/hooks/implementations/` for the reference implementation). The manifest declares *what* the hook does; the implementation project provides the *how*.

### Manifest Format

Every hook manifest must conform to `hooks/manifest.schema.json`. Example:

```json
{
  "name": "token_budget_gate",
  "version": "1.0.0",
  "events": ["PreToolUse"],
  "timeout_ms": 5000,
  "requires": ["token_budget_tracker"],
  "input_contract": "v1",
  "description": "Blocks tool invocations that would exceed the session token budget."
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Hook identifier. Lowercase, alphanumeric + underscores. Must match directory name. |
| `version` | string | Yes | Semantic version (e.g., `1.0.0`). |
| `events` | array | Yes | Lifecycle events this hook binds to. One or more of: `PreToolUse`, `PostToolUse`, `PreCommit`, `PostCommit`, `SessionStart`, `TaskCompleted`, `PrePush`, `Periodic`. |
| `timeout_ms` | integer | Yes | Maximum execution time in milliseconds (100–300000). |
| `requires` | array | No | Names of hooks that must be active in the session for this hook to function. |
| `input_contract` | string | Yes | Contract version string (e.g., `v1`). Hooks with the same version are wire-compatible. |
| `description` | string | Yes | Human-readable description (minimum 10 characters). |
| `async` | boolean | No | If `true`, hook executes asynchronously (does not block the agent). Default: `false`. |

-----

## Runtime Lifecycle

### Discovery

At `SessionStart`, the runtime scans the `hooks/` directory tree for `hook.manifest.json` files. Each manifest is validated against `hooks/manifest.schema.json`. Invalid manifests are rejected with a descriptive error; the session does not start with invalid hooks.

### Dependency Resolution

**Why manifest-first:** The manifest is the hook's declaration of intent — what it does, when it fires, what it depends on. Without manifests, hooks are opaque scripts that the runtime loads blindly. With manifests, the runtime can validate the hook ecosystem *before* the session starts, preventing mid-session failures from missing dependencies or incompatible contracts.

After discovery, the runtime builds a dependency graph from the `requires` fields:

1. For each hook, verify that every entry in `requires` corresponds to an active hook in the session.
2. Detect circular dependencies. If found, reject the session with: `"Circular hook dependency: A requires B requires A."`
3. Hooks execute in dependency order — a hook's dependencies always run before it does.

If any dependency is unsatisfied (a required hook is not present or failed validation), the session is rejected: `"Hook dependency unsatisfied: [hook_name] requires [missing_hook]."`

### Execution Order

When multiple hooks bind to the same lifecycle event:

1. Dependencies execute first (topological sort).
2. Among hooks at the same dependency level, execution follows declaration order.
3. First failure stops the chain (fail-fast) — consistent with the hook chaining behavior in Section 08.

### Hook State Propagation

Hooks can pass state to downstream hooks within the same event chain. When a hook writes JSON to stdout containing a `"hook_state"` key, the runtime merges those values into the payload for subsequent hooks. This enables stateful patterns such as the loop detector maintaining error counts across a PostToolUse chain.

Key behaviors:

- State is merged via shallow update: `payload["hook_state"].update(output["hook_state"])`. State is keyed by hook name by convention (e.g., `"loop_detector": {...}`).
- **State merges even on hook failure.** A failing hook can still communicate state to subsequent hooks or to the next invocation of the same chain. This is intentional — diagnostic state from a failure is valuable for debugging and recovery.
- Non-JSON stdout does not break propagation (silently ignored).
- The runtime persists the merged `hook_state` to its session state file between event firings, so state survives across separate tool invocations within the same session.

-----

## Contract Versioning

The `input_contract` field is a simple version string (`v1`, `v2`, etc.) that indicates the shape of the JSON payload the hook expects on stdin.

- Hooks with the same `input_contract` version are wire-compatible — they accept the same JSON structure.
- Breaking changes to the input format require a new version string.
- Non-breaking additions (new optional fields) are permitted within a version.

For v0.2.0, contract versions are convention-based strings. No formal JSON Schema validation of hook payloads is performed at runtime.

### Future Extension: Schema Registry (v0.3.0+)

When hook ecosystem complexity warrants formal payload validation, the `input_contract` field can be extended to reference a JSON Schema in `hooks/schemas/`:

```json
{
  "input_contract": { "$ref": "hooks/schemas/pre_tool_use_v2.schema.json" }
}
```

This extension is planned for v0.3.0+. For v0.2.0, the simple version string is sufficient.

-----

## Reference Manifests

The following 8 hooks are specified in `admiral/part3-enforcement.md` (Section 08). Their manifests would be:

**token_budget_tracker:**
```json
{
  "name": "token_budget_tracker",
  "version": "1.0.0",
  "events": ["PostToolUse"],
  "timeout_ms": 5000,
  "requires": [],
  "input_contract": "v1",
  "description": "Tracks cumulative token consumption per session and emits warnings at 80% and 90% utilization."
}
```

**token_budget_gate:**
```json
{
  "name": "token_budget_gate",
  "version": "1.0.0",
  "events": ["PreToolUse"],
  "timeout_ms": 5000,
  "requires": ["token_budget_tracker"],
  "input_contract": "v1",
  "description": "Blocks tool invocations that would exceed the session token budget."
}
```

**loop_detector:**
```json
{
  "name": "loop_detector",
  "version": "1.0.0",
  "events": ["PostToolUse"],
  "timeout_ms": 5000,
  "requires": [],
  "input_contract": "v1",
  "description": "Detects retry loops by tracking error signature recurrence across invocations."
}
```

**context_baseline:**
```json
{
  "name": "context_baseline",
  "version": "1.0.0",
  "events": ["SessionStart"],
  "timeout_ms": 10000,
  "requires": [],
  "input_contract": "v1",
  "description": "Measures initial context window utilization and records baseline metrics for comparison."
}
```

**context_health_check:**
```json
{
  "name": "context_health_check",
  "version": "1.0.0",
  "events": ["PostToolUse"],
  "timeout_ms": 10000,
  "requires": ["context_baseline"],
  "input_contract": "v1",
  "description": "Monitors context health by checking utilization thresholds and critical context presence.",
  "async": false
}
```

**tier_validation:**
```json
{
  "name": "tier_validation",
  "version": "1.0.0",
  "events": ["SessionStart"],
  "timeout_ms": 10000,
  "requires": [],
  "input_contract": "v1",
  "description": "Validates instantiated model against agent tier assignment and consults degradation policy on failure."
}
```

**identity_validation:**
```json
{
  "name": "identity_validation",
  "version": "1.0.0",
  "events": ["SessionStart"],
  "timeout_ms": 10000,
  "requires": [],
  "input_contract": "v1",
  "description": "Validates agent identity token and auth configuration artifact at session start. Independent of Auth & Identity Specialist availability."
}
```

**governance_heartbeat_monitor:**
```json
{
  "name": "governance_heartbeat_monitor",
  "version": "1.0.0",
  "events": ["Periodic"],
  "timeout_ms": 10000,
  "requires": [],
  "input_contract": "v1",
  "description": "Tracks governance agent heartbeats and alerts Admiral on missed beats or low confidence.",
  "async": true
}
```
