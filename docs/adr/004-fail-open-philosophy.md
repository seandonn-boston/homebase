# ADR-004: Fail-Open Philosophy

## Status

Accepted

## Context

Hooks and state management can fail (corrupt JSON, missing files, `jq` errors). Should failures block agent work or allow it to continue?

## Decision

Fail-open for advisory hooks (exit 0 on error). Fail-closed only for enforcement hooks that protect critical boundaries (scope guard, prohibitions enforcer — exit 2).

## Consequences

- Bugs in advisory hooks are silent. The `save_state()` function silently keeps old state if new state is invalid JSON.
- This is acceptable because the alternative (fail-closed everywhere) would make the governance system itself a reliability risk.
- Enforcement hooks (scope_boundary_guard, prohibitions_enforcer) are the exception: they hard-block on violations because the cost of a false negative (unauthorized action) exceeds the cost of a false positive (blocked legitimate action).
- File locking uses `flock` with a timeout and falls back to unlocked operation if unavailable.
