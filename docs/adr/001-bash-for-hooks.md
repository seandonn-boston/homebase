# ADR-001: Bash for Hook Scripts

## Status

Accepted

## Context

Hooks need to run deterministically on every tool call. They must be fast, portable, and have no dependency on the control plane's runtime. The hook system intercepts Claude Code events before and after tool use.

## Decision

Use POSIX-compatible Bash for all hooks. Require only `jq` and GNU coreutils as external dependencies.

## Consequences

- Hooks can't share TypeScript types with the control plane. JSON is the interface contract.
- Startup cost (~50ms per hook invocation) is acceptable for the enforcement guarantee.
- Shell scripts are more accessible to operators who may not know TypeScript.
- ShellCheck provides static analysis for correctness.
