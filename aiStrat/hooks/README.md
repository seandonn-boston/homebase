<!-- Admiral Framework v0.2.0-alpha -->
# Hook Ecosystem

**Manifest-first hook management for the Admiral Framework.**

Hooks are the deterministic enforcement layer — they fire every time, regardless of context pressure. This document specifies the hook ecosystem: how hooks declare their capabilities, how the runtime discovers and validates them, and how hook dependencies are resolved.

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

The following hooks are specified in `admiral/part3-enforcement.md` (Section 08). Their manifests would be:

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
