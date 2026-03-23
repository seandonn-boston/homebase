#!/usr/bin/env bash
# Q-09: ShellCheck strict mode enforcement
# Runs ShellCheck with warning severity on all hook and lib scripts.
# Exits non-zero if any warnings or errors are found.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

HOOKS_DIR="$PROJECT_DIR/.hooks"
LIB_DIR="$PROJECT_DIR/admiral/lib"

echo "ShellCheck Strict Mode Check"
echo "============================"

files=()
for f in "$HOOKS_DIR"/*.sh "$LIB_DIR"/*.sh; do
  [ -f "$f" ] && files+=("$f")
done

echo "Checking ${#files[@]} scripts..."

if ! command -v shellcheck &>/dev/null; then
  echo "SKIP: shellcheck not installed"
  exit 0
fi

rc=0
shellcheck --severity=warning "${files[@]}" 2>&1 || rc=$?

if [ "$rc" -eq 0 ]; then
  echo "PASS: ${#files[@]} scripts pass ShellCheck strict mode (zero warnings)"
else
  echo "FAIL: ShellCheck found warnings/errors"
  exit 1
fi
