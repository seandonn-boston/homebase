"""Model Tier Validation hook.

SessionStart: Fires once at session start.
Validates the instantiated model against the agent's tier assignment.

From Section 08:
    If primary model unavailable:
    - Degraded policy: allows session with fallback model,
      sets governance_audit_rate=2x, logs degradation event.
    - Blocked policy: rejects session, queues task for primary recovery,
      alerts Admiral directly.
    No cascading degradation: if fallback also fails, agent is Blocked.
"""

from __future__ import annotations

import json
import sys
from typing import Any

# Model tier hierarchy (higher index = higher tier)
TIER_HIERARCHY = {
    "economy": 0,
    "utility": 1,
    "workhorse": 2,
    "flagship": 3,
}


def execute(payload: dict[str, Any]) -> tuple[int, str, str]:
    """Execute the tier validation hook.

    Args:
        payload: Hook input with model_id, tier_assignment, degradation_policy.

    Returns:
        (exit_code, stdout, stderr)
    """
    agent_identity = payload.get("agent_identity", "unknown")
    model_id = payload.get("model_id", "")
    tier_assignment = payload.get("tier_assignment", "").lower()
    degradation_policy = payload.get("degradation_policy", {})

    if not model_id:
        return 1, (
            f"Model tier violation: agent [{agent_identity}] has no model assigned."
        ), ""

    if tier_assignment not in TIER_HIERARCHY:
        return 1, (
            f"Model tier violation: unknown tier '{tier_assignment}' "
            f"for agent [{agent_identity}]."
        ), ""

    # Determine actual model tier from model_id
    actual_tier = _infer_tier(model_id)

    if actual_tier is None:
        # Unknown model — check degradation policy
        policy = degradation_policy.get("blocked", "")
        if policy:
            return 1, (
                f"Model tier violation: agent [{agent_identity}] requires "
                f"Tier [{tier_assignment}], got unknown model [{model_id}]. "
                f"Degradation policy: Blocked. Action: queue."
            ), ""
        # Default: allow with warning
        result = {
            "status": "warning",
            "message": f"Unknown model '{model_id}' — cannot verify tier compliance.",
            "agent": agent_identity,
            "tier_assignment": tier_assignment,
        }
        return 0, json.dumps(result), ""

    actual_level = TIER_HIERARCHY.get(actual_tier, -1)
    required_level = TIER_HIERARCHY[tier_assignment]

    if actual_level >= required_level:
        # Model meets or exceeds tier
        result = {
            "status": "ok",
            "agent": agent_identity,
            "tier_assignment": tier_assignment,
            "actual_tier": actual_tier,
            "model_id": model_id,
        }
        return 0, json.dumps(result), ""

    # Model is below required tier — check degradation policy
    degraded_model = degradation_policy.get("degraded", "")
    blocked_actions = degradation_policy.get("blocked", "")

    if blocked_actions or not degraded_model:
        return 1, (
            f"Model tier violation: agent [{agent_identity}] requires "
            f"Tier [{tier_assignment}], got [{actual_tier}]. "
            f"Degradation policy: Blocked. Action: failover."
        ), ""

    # Degraded mode allowed
    result = {
        "status": "degraded",
        "agent": agent_identity,
        "tier_assignment": tier_assignment,
        "actual_tier": actual_tier,
        "model_id": model_id,
        "governance_audit_rate": "2x",
        "message": (
            f"Agent [{agent_identity}] running in degraded mode: "
            f"required [{tier_assignment}], actual [{actual_tier}]. "
            f"Governance audit rate doubled."
        ),
    }
    return 0, json.dumps(result), ""


def _infer_tier(model_id: str) -> str | None:
    """Infer model tier from model ID.

    This is a simplified mapping. In production, this would consult
    the model-tiers.md configuration.
    """
    model_lower = model_id.lower()

    # Flagship models (Tier 1)
    if any(kw in model_lower for kw in ["opus", "flagship", "o1", "o3"]):
        return "flagship"

    # Workhorse models (Tier 2)
    if any(kw in model_lower for kw in ["sonnet", "workhorse", "gpt-4"]):
        return "workhorse"

    # Utility models (Tier 3)
    if any(kw in model_lower for kw in ["haiku", "utility", "gpt-3.5", "flash"]):
        return "utility"

    # Economy models (Tier 4)
    if any(kw in model_lower for kw in ["economy", "batch", "mini"]):
        return "economy"

    return None


if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    code, stdout, stderr = execute(payload)
    if stdout:
        print(stdout)
    if stderr:
        print(stderr, file=sys.stderr)
    sys.exit(code)
