"""Level 1 hook implementations.

Five hooks implementing the deterministic enforcement layer (Section 08):
    1. token_budget_tracker  — PostToolUse: cumulative token tracking, 80%/90% warnings
    2. token_budget_gate     — PreToolUse: block if budget exceeded
    3. loop_detector         — PostToolUse: track error signatures, break retry loops
    4. context_baseline      — SessionStart: measure initial context utilization
    5. context_health_check  — PostToolUse: monitor context health vs thresholds

Level 2+ hooks (tier_validation, identity_validation, governance_heartbeat_monitor)
are deferred until those adoption levels are implemented.
"""
