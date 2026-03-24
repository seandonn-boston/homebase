#!/bin/bash
# Spec Compliance: Part 5 — Brain Architecture
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PASS=0; FAIL=0

assert() {
  if [ "$2" = "true" ]; then PASS=$((PASS+1)); echo "  [PASS] $1"
  else FAIL=$((FAIL+1)); echo "  [FAIL] $1"; fi
}

echo "=== Part 5 — Brain Compliance ==="

assert "brain_query exists" "$([ -x "$REPO_ROOT/admiral/bin/brain_query" ] && echo true || echo false)"
assert "brain_record exists" "$([ -x "$REPO_ROOT/admiral/bin/brain_record" ] && echo true || echo false)"
assert "brain_retrieve exists" "$([ -x "$REPO_ROOT/admiral/bin/brain_retrieve" ] && echo true || echo false)"
assert "brain_audit exists" "$([ -x "$REPO_ROOT/admiral/bin/brain_audit" ] && echo true || echo false)"
assert "brain_context_router hook exists" "$([ -f "$REPO_ROOT/.hooks/brain_context_router.sh" ] && echo true || echo false)"

source "$REPO_ROOT/admiral/config/reference_constants.sh" 2>/dev/null
assert "BRAIN_QUERY_DEFAULT_LIMIT=10" "$([ "$BRAIN_QUERY_DEFAULT_LIMIT" = "10" ] && echo true || echo false)"
assert "BRAIN_QUERY_MAX_LIMIT=50" "$([ "$BRAIN_QUERY_MAX_LIMIT" = "50" ] && echo true || echo false)"
assert "BRAIN_COSINE_MIN_SCORE=0.7" "$([ "$BRAIN_COSINE_MIN_SCORE" = "0.7" ] && echo true || echo false)"
assert "BRAIN_DECAY_AWARENESS_DAYS=90" "$([ "$BRAIN_DECAY_AWARENESS_DAYS" = "90" ] && echo true || echo false)"

echo ""
echo "Part 5: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
