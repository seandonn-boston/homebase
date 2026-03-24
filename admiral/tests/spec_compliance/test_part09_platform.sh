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
# Verify Part 9 gaps are documented in the spec parts summary
gap_documented=$(jq '.spec_parts_summary[] | select(.part == "Part 9 — Platform") | .not_implemented' "$REPO_ROOT/admiral/config/spec_version_manifest.json" 2>/dev/null || echo "")
assert "Platform gaps tracked in manifest" "$([ -n "$gap_documented" ] && [ "$gap_documented" -ge 1 ] 2>/dev/null && echo true || echo false)"

echo ""
echo "Part 9: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
