"""Governance Heartbeat Monitor hook.

Periodic: Runs on a configurable interval (default: 60 seconds).
Tracks heartbeat timestamps per governance agent.

From Section 08:
    2 consecutive misses → alert Admiral directly (bypasses Orchestrator).
    If confidence_self_assessment < 0.5 → alert even if heartbeat present.
    Routes DIRECTLY to Admiral — never through the Orchestrator.
"""

from __future__ import annotations

import json
import sys
import time
from typing import Any

# Default expected governance agents
DEFAULT_EXPECTED_AGENTS = [
    "Token Budgeter",
    "Drift Monitor",
    "Hallucination Auditor",
    "Bias Sentinel",
    "Loop Breaker",
    "Context Health Monitor",
    "Contradiction Detector",
]

# Track consecutive misses per agent
_consecutive_misses: dict[str, int] = {}
_last_check_time: float = 0.0

CONSECUTIVE_MISS_THRESHOLD = 2
CONFIDENCE_THRESHOLD = 0.5


def reset() -> None:
    """Reset state (for testing or new sessions)."""
    global _consecutive_misses, _last_check_time
    _consecutive_misses = {}
    _last_check_time = 0.0


def execute(payload: dict[str, Any]) -> tuple[int, str, str]:
    """Execute the governance heartbeat monitor hook.

    Args:
        payload: Hook input with expected_agents and received_heartbeats.

    Returns:
        (exit_code, stdout, stderr)
    """
    global _last_check_time

    expected = payload.get("expected_agents", DEFAULT_EXPECTED_AGENTS)
    heartbeats = payload.get("received_heartbeats", {})
    current_time = time.time()
    _last_check_time = current_time

    alerts = []

    for agent_name in expected:
        hb = heartbeats.get(agent_name)

        if hb is None:
            # No heartbeat received
            _consecutive_misses[agent_name] = _consecutive_misses.get(agent_name, 0) + 1
            misses = _consecutive_misses[agent_name]

            if misses >= CONSECUTIVE_MISS_THRESHOLD:
                alerts.append({
                    "agent": agent_name,
                    "type": "heartbeat_missing",
                    "consecutive_misses": misses,
                    "message": (
                        f"Governance heartbeat failure: {agent_name} missed "
                        f"{misses} consecutive heartbeats. "
                        f"Alerting Admiral directly."
                    ),
                    "route": "ADMIRAL_DIRECT",
                })
        else:
            # Heartbeat received — reset miss counter
            _consecutive_misses[agent_name] = 0

            # Check confidence
            confidence = hb.get("confidence_self_assessment", 1.0)
            if confidence < CONFIDENCE_THRESHOLD:
                alerts.append({
                    "agent": agent_name,
                    "type": "low_confidence",
                    "confidence": confidence,
                    "message": (
                        f"Governance agent {agent_name} reporting low confidence "
                        f"({confidence:.2f} < {CONFIDENCE_THRESHOLD}). "
                        f"Alive but degraded. Alerting Admiral directly."
                    ),
                    "route": "ADMIRAL_DIRECT",
                })

    if alerts:
        result = {
            "status": "alert",
            "alerts": alerts,
            "timestamp": current_time,
        }
        return 1, json.dumps(result), ""

    result = {
        "status": "healthy",
        "agents_reporting": len(heartbeats),
        "agents_expected": len(expected),
        "timestamp": current_time,
    }
    return 0, json.dumps(result), ""


if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    code, stdout, stderr = execute(payload)
    if stdout:
        print(stdout)
    if stderr:
        print(stderr, file=sys.stderr)
    sys.exit(code)
