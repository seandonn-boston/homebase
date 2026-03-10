"""Identity Validation hook.

SessionStart: Fires once at session start.
Validates that the project's auth configuration artifact exists and is valid.

From Section 08:
    Exit 0: auth configuration artifact exists and is valid.
    Exit non-zero: "Identity validation failed: auth configuration artifact
    missing or invalid at [path]. Agent session blocked."
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any


def execute(payload: dict[str, Any]) -> tuple[int, str, str]:
    """Execute the identity validation hook.

    Args:
        payload: Hook input with agent_identity, project_config.auth_artifact_path,
                 project_config.auth_artifact_hash.

    Returns:
        (exit_code, stdout, stderr)
    """
    agent_identity = payload.get("agent_identity", "unknown")
    project_config = payload.get("project_config", {})
    artifact_path = project_config.get("auth_artifact_path", "")
    expected_hash = project_config.get("auth_artifact_hash", "")

    # If no auth artifact configured, identity validation is not enforced
    if not artifact_path:
        result = {
            "status": "skipped",
            "reason": "No auth_artifact_path configured",
            "agent": agent_identity,
        }
        return 0, json.dumps(result), ""

    path = Path(artifact_path)

    # Check existence
    if not path.exists():
        return 1, (
            f"Identity validation failed: auth configuration artifact "
            f"missing at [{artifact_path}]. Agent session blocked until "
            f"artifact is produced by Auth & Identity Specialist."
        ), ""

    # Check non-empty
    if path.stat().st_size == 0:
        return 1, (
            f"Identity validation failed: auth configuration artifact "
            f"at [{artifact_path}] is empty. Agent session blocked."
        ), ""

    # Hash check (if expected hash provided)
    if expected_hash:
        actual_hash = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual_hash != expected_hash:
            return 1, (
                f"Identity validation failed: auth configuration artifact "
                f"at [{artifact_path}] has been modified outside authorized channels. "
                f"Expected hash: {expected_hash[:16]}..., "
                f"actual: {actual_hash[:16]}... Agent session blocked."
            ), ""

    result = {
        "status": "valid",
        "agent": agent_identity,
        "artifact_path": artifact_path,
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
