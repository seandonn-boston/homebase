#!/usr/bin/env python3
"""PreToolUse hook: Block file modifications outside allowed directories.

Exit 0 = allow, Exit 2 = block with message to stderr.
"""

import os
import sys

ALLOWED_PREFIXES = ["aiStrat/", "src/", "prisma/", ".claude/"]


def main() -> int:
    file_path = os.environ.get("CLAUDE_FILE_PATH", "")
    if not file_path:
        return 0  # No file path — allow (not a file operation)

    # Normalize to relative path
    cwd = os.getcwd()
    if file_path.startswith(cwd):
        file_path = os.path.relpath(file_path, cwd)

    for prefix in ALLOWED_PREFIXES:
        if file_path.startswith(prefix):
            return 0

    print(
        f"BLOCKED: Modification to '{file_path}' is outside allowed directories: "
        f"{', '.join(ALLOWED_PREFIXES)}",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
