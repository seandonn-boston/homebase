# Level 1: Disciplined Solo — Completion Status

Tracks what Level 1 requires per `aiStrat/admiral/index.md` Section 01 and
whether `admiral/` satisfies each requirement.

## Requirements vs. Status

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | AGENTS.md (<150 lines) | Done | 86 lines, mission/boundaries/success criteria |
| 2 | Tool-specific pointers (CLAUDE.md) | Done | Points to AGENTS.md, test commands |
| 3 | Standing Orders (Section 36) loaded into context | Done | 15 SOs, priority-sorted, rendered for injection |
| 4 | One agent with clear Identity/Scope/Boundaries | Done | Simple agent-id + role model, no crypto signing |
| 5 | Enforcement spectrum defined (Section 08) | Done | HOOK > INSTRUCTION > GUIDANCE classification |
| 6 | Hook: token budget (PreToolUse gate + PostToolUse tracker) | Code done, not deployed | See Gap 1 |
| 7 | Hook: loop detection (PostToolUse) | Code done, not deployed | See Gap 1 |
| 8 | Hook: context health (SessionStart baseline + PostToolUse check) | Code done, not deployed | See Gap 1 |
| 9 | CODEOWNERS set (Section 10, Level 1 item 6) | Done | `.github/CODEOWNERS` |
| 10 | Self-healing loop with cycle detection | Done | 3 per-hook, 10 session-wide, SHA-256 signatures |

## Gaps

### Gap 1: Hooks not deployed as live enforcement (BLOCKER)

**Spec says:** "Deploy hooks for safety-critical constraints — token budget,
loop detection, and context health (Section 08) — as live enforcement in your
agent runtime, not just as tested code."

**Current state:** All 5 Level 1 hooks are implemented in
`admiral/hooks/implementations/` with full test coverage. They follow the hook
contract (JSON stdin, exit code 0/non-zero, stdout feedback). But they are
**not wired to Claude Code's runtime**.

**Root cause:** Contract mismatch. Admiral hooks expect runtime telemetry that
Claude Code's hook system does not provide:

- `session_state.tokens_used` / `session_state.token_budget` — Claude Code
  doesn't expose token counts to hooks.
- `context.current_utilization` / `context.standing_context_present` — Claude
  Code doesn't expose context window metrics.
- `hook_state` persistence — Claude Code doesn't carry state between hook
  invocations.
- `result.exit_code` / `result.error` — Claude Code PostToolUse provides tool
  output but not in admiral's expected format.

**To resolve:** Either:
1. Build an adapter layer that translates Claude Code's hook payload into
   admiral's expected format and maintains state in a sidecar file, OR
2. Wait for Claude Code to expose richer runtime telemetry to hooks, OR
3. Build a standalone admiral runtime that wraps Claude Code invocations.

Option 1 is the most pragmatic for Level 1 completion. The adapter would need
to track token usage independently (e.g., counting stdin/stdout bytes as a
proxy) and persist hook state in `.admiral/session_state.json`.

### Gap 2: `.claude/hooks.json` references non-existent scripts

The existing `.claude/hooks.json` points to `aiStrat/scripts/hooks/*.py` which
does not exist. These entries are dead configuration:
- `check_file_scope.py` — broken path
- `post_edit_check.py` — broken path
- `session_halt_check.py` — broken path

These should be either removed or pointed at working implementations.

### Gap 3: Async hook execution not implemented

`HookEngine._execute_single()` only supports synchronous execution via
`subprocess.run()`. The spec declares async hooks as a capability
("Async hooks must be explicitly declared"), but this is only needed at Level 3+
(governance heartbeat monitor). Not a Level 1 blocker.

### Gap 4: PipelineEntry / LLM-Last boundary not enforced

The spec defines LLM-Last as a design principle (Section 02) and the
Classification Decision Process (Section 08) describes when constraints should
be hooks vs. instructions. The implementation classifies constraints but
doesn't verify that all deterministic-checkable constraints have corresponding
hooks. Not a Level 1 blocker — this is framework infrastructure.

## Test Coverage

149 tests passing across 7 test files:
- `test_hooks.py` — 65 tests (engine, implementations, edge cases)
- `test_standing_orders.py` — 19 tests (load, priority, titles, rendering)
- `test_enforcement.py` — enforcement model validation
- `test_models.py` — data model tests
- `test_identity.py` — identity model tests
- `test_schema_validation.py` — spec schema compliance
- `conftest.py` — shared fixtures

## Verdict

Level 1 is **substantially complete** in implementation and test coverage.
The single blocking gap is Gap 1: hooks exist as tested code but are not
deployed as live enforcement. This requires an adapter layer to bridge
admiral's hook contract with Claude Code's hook system.
