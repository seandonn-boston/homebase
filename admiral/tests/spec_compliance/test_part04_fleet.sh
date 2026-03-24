#!/bin/bash
# Spec Compliance: Part 4 — Fleet Composition
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PASS=0; FAIL=0

assert() {
  if [ "$2" = "true" ]; then PASS=$((PASS+1)); echo "  [PASS] $1"
  else FAIL=$((FAIL+1)); echo "  [FAIL] $1"; fi
}

echo "=== Part 4 — Fleet Compliance ==="

# Agent definition schema exists
assert "Agent definition schema exists" "$([ -f "$REPO_ROOT/admiral/schemas/agent-definition.v1.schema.json" ] && echo true || echo false)"

# Fleet constants
source "$REPO_ROOT/admiral/config/reference_constants.sh" 2>/dev/null
assert "FLEET_MIN_AGENTS=1" "$([ "$FLEET_MIN_AGENTS" = "1" ] && echo true || echo false)"
assert "FLEET_MAX_AGENTS=12" "$([ "$FLEET_MAX_AGENTS" = "12" ] && echo true || echo false)"

# Gap documented in spec version manifest
gap=$(jq -r '.spec_parts_summary[] | select(.part == "Part 4 — Fleet Composition") | .partial_compliance' "$REPO_ROOT/admiral/config/spec_version_manifest.json" 2>/dev/null)
assert "Fleet gaps documented in manifest" "$([ -n "$gap" ] && echo true || echo false)"

echo ""
echo "Part 4: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
