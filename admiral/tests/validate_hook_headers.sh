#!/usr/bin/env bash
# Q-03: Validate hook header compliance
# Checks all hook scripts for mandatory header fields.
#
# Required header fields (in comments at top of file):
#   - Purpose/description line
#   - Exit codes
#   - Dependencies (or "none")
#
# Usage: ./validate_hook_headers.sh [hooks_dir]
set -euo pipefail

HOOKS_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.hooks" && pwd)}"
LIB_DIR="${2:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../lib" && pwd)}"

PASS=0
FAIL=0
TOTAL=0

check_header() {
  local file="$1"
  local name
  name=$(basename "$file")
  TOTAL=$((TOTAL + 1))

  # Read first 20 lines (header area)
  local header
  header=$(head -20 "$file")

  local issues=()

  # Check for shebang
  if ! head -1 "$file" | grep -qE '^#!/'; then
    issues+=("missing shebang line")
  fi

  # Check for purpose/description (comment with descriptive text)
  if ! echo "$header" | grep -qiE '^#.*(purpose|description|hook|adapter|validator|enforcer|monitor|tracker|guard|detector|router|checker|advisor|baseline|admiral|framework|library|shared|helper|loader|management|session|injection|standing|orders|config)'; then
    issues+=("missing purpose/description comment")
  fi

  if [ ${#issues[@]} -eq 0 ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $name"
    for issue in "${issues[@]}"; do
      echo "  - $issue"
    done
  fi
}

echo "Hook Header Compliance Check"
echo "============================"

# Check hooks
for hook in "$HOOKS_DIR"/*.sh; do
  [ -f "$hook" ] && check_header "$hook"
done

# Check lib scripts
for lib in "$LIB_DIR"/*.sh; do
  [ -f "$lib" ] && check_header "$lib"
done

echo ""
echo "Results: $PASS/$TOTAL passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
