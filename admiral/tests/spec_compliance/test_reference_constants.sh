#!/bin/bash
# Spec Compliance: Reference Constants
# Verifies registries exist and are in sync
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PASS=0; FAIL=0
assert() { if [ "$2" = "true" ]; then PASS=$((PASS+1)); echo "  [PASS] $1"; else FAIL=$((FAIL+1)); echo "  [FAIL] $1"; fi; }

echo "=== Reference Constants Compliance ==="
assert "Shell registry exists" "$([ -f "$REPO_ROOT/admiral/config/reference_constants.sh" ] && echo true || echo false)"
assert "JSON registry exists" "$([ -f "$REPO_ROOT/admiral/config/reference_constants.json" ] && echo true || echo false)"
assert "Sync validator exists" "$([ -x "$REPO_ROOT/admiral/bin/validate_constants_sync" ] && echo true || echo false)"

# Run sync check
rc=0
"$REPO_ROOT/admiral/bin/validate_constants_sync" > /dev/null 2>&1 || rc=$?
assert "Registries in sync" "$([ "$rc" = "0" ] && echo true || echo false)"

echo ""
echo "Reference Constants: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
