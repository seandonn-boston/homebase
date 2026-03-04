#!/usr/bin/env python3
"""SessionStart hook: Check for active Brain halt on session start.

Prints a warning if the .claude/HALT file exists. Does not block.
"""

import json
import os
import sys


def main() -> int:
    halt_path = os.path.join(".claude", "HALT")
    if not os.path.exists(halt_path):
        return 0

    try:
        with open(halt_path, "r") as f:
            data = json.load(f)
        reason = data.get("reason", "unknown")
        reporter = data.get("reporter", "unknown")
        print(
            f"WARNING: Brain is HALTED by {reporter}: {reason}",
            file=sys.stderr,
        )
    except (json.JSONDecodeError, OSError):
        print("WARNING: Brain is HALTED (could not read halt details)", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
