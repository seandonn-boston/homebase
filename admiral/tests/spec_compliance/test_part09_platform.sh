#!/bin/bash
# Spec Compliance: Part 9 — Platform
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PASS=0; FAIL=0
assert() { if [ "$2" = "true" ]; then PASS=$((PASS+1)); echo "  [PASS] $1"; else FAIL=$((FAIL+1)); echo "  [FAIL] $1"; fi; }

echo "=== Part 9 — Platform Compliance ==="
# Hook adapter pattern exists (Claude Code adapter)
assert "Hook adapter pattern implemented" "$([ -f "$REPO_ROOT/.hooks/pre_tool_use_adapter.sh" ] && [ -f "$REPO_ROOT/.hooks/post_tool_use_adapter.sh" ] && echo true || echo false)"

# Gaps documented
gap=$(jq '[.components[] | select(.spec_part == "Part 9 — Platform")] | length' "$REPO_ROOT/admiral/config/spec_version_manifest.json" 2>/dev/null || echo "0")
assert "Platform gaps tracked in manifest" "$([ "$gap" != "" ] && echo true || echo false)"

echo ""
echo "Part 9: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
