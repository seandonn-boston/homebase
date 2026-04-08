# Error Message Improvement Audit (DX-07)

Audit of error messages across hooks, control plane, and CLI tools.
Each message should answer: what went wrong, why it matters, what to do.

## Applied Improvements

| # | File | Before | After |
|---|------|--------|-------|
| 1 | `execution-runtime.ts:117` | "Max concurrent sessions reached... Cannot spawn" | Added: "Wait for a session to complete or increase maxConcurrentSessions" |
| 2 | `task-queue.ts:104` | "Queue is full... Cannot enqueue" | Added: "Wait for tasks to complete or increase maxQueueDepth" |

## Documented for Future Improvement

| # | File | Current Message | Suggested Improvement |
|---|------|-----------------|----------------------|
| 3 | `agent-versioning.ts:47` | "Invalid version: X" | Add expected format: "Expected MAJOR.MINOR.PATCH" |
| 4 | `agent-versioning.ts:115` | "Agent not registered" | Add: "Call register() first" |
| 5 | `agent-versioning.ts:118` | "Version limit reached" | Add: "Archive old versions" |
| 6 | `cli.ts:22` | "Invalid port" | Include the invalid value |
| 7 | `config-management.ts:205` | "Author is required" | Explain the author field purpose |
| 8 | `config-management.ts:208` | "Rationale is required" | Explain the rationale field purpose |
| 9 | `config-management.ts:335` | "Invalid exported config set format" | Show expected format |
| 10 | `distributed-tracing.ts:97` | "Span not found" | Add: "Ensure session is active" |
| 11 | `ring-buffer.ts:14` | "capacity must be >= 1" | Include the invalid value |
| 12 | `escalation.sh:25` | "Missing required fields" | List the required fields |
| 13 | `escalation.sh:33` | "Invalid category" | Include the invalid value |
| 14 | `handoff.sh:30` | "Missing required fields" | Already lists them |
| 15 | `handoff.sh:36` | "must be different" | Include the actual values |
| 16 | `parallel_coordinator.sh:107` | "plan not found" | Include the filepath |
| 17 | `schema_validate.sh:89` | "payload type errors" | Add: "See hook documentation" |
| 18 | `ground_truth_validator.sh:48` | "Unknown validation error" | Suggest specific checks |
| 19 | `privilege_check.sh:52` | (no message, just exit 2) | Add context message |
| 20 | `http-helpers.ts:29` | "Invalid JSON" | Suggest Content-Type header |

## Methodology

- Searched `throw new Error`, `echo.*error`, `hook_block`, and `exit 2`
- Evaluated each against: what failed? why? what to do?
- Applied the most impactful changes directly; documented the rest
