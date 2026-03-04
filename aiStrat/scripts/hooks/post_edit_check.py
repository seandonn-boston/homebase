#!/usr/bin/env python3
"""PostToolUse hook: Syntax-check Python files after modification.

Runs py_compile on the modified file. Prints a warning if syntax is invalid
but does not block (exit 0 always — syntax errors are informational).
"""

import os
import py_compile
import sys


def main() -> int:
    file_path = os.environ.get("CLAUDE_FILE_PATH", "")
    if not file_path or not file_path.endswith(".py"):
        return 0

    if not os.path.exists(file_path):
        return 0

    try:
        py_compile.compile(file_path, doraise=True)
    except py_compile.PyCompileError as e:
        print(f"WARNING: Syntax error in {file_path}: {e}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
