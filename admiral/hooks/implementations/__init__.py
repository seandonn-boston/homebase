"""Core hook implementations.

Eight hooks implementing the deterministic enforcement layer:
    1. token_budget_tracker  — PostToolUse: cumulative token tracking, 80%/90% warnings
    2. token_budget_gate     — PreToolUse: block if budget exceeded
    3. loop_detector         — PostToolUse: track error signatures, break retry loops
    4. context_baseline      — SessionStart: measure initial context utilization
    5. context_health_check  — PostToolUse: monitor context health vs thresholds
    6. tier_validation       — SessionStart: validate model matches agent tier
    7. identity_validation   — SessionStart: validate agent identity token
    8. governance_heartbeat_monitor — Periodic: track governance agent heartbeats
"""
