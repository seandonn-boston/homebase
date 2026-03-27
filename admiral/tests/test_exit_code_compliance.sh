#!/bin/bash
# Admiral Framework — Exit Code Taxonomy Compliance Test (Q-13)
# Verifies all hooks use only approved exit codes per ADMIRAL_STYLE.md.
# Approved: 0 (pass/fail-open), 1 (error/fail-open), 2 (hard-block)
# Exit code: 0 = all pass, 1 = violations found
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOKS_DIR="$PROJECT_DIR/.hooks"

PASS=0
FAIL=0
ERRORS=""

echo "=== Exit Code Taxonomy Compliance (Q-13) ==="
echo ""

# Approved exit codes for hooks
APPROVED_CODES="0 1 2"

for hook_file in "$HOOKS_DIR"/*.sh; do
  [ -f "$hook_file" ] || continue
  basename=$(basename "$hook_file")

  # Skip test directories
  [ "$basename" = "tests" ] && continue

  # Extract all exit codes used
  EXIT_CODES=$(grep -oE 'exit [0-9]+' "$hook_file" 2>/dev/null | grep -oE '[0-9]+' | sort -u) || true

  VIOLATIONS=""
  for code in $EXIT_CODES; do
    FOUND=false
    for approved in $APPROVED_CODES; do
      if [ "$code" = "$approved" ]; then
        FOUND=true
        break
      fi
    done
    if [ "$FOUND" = "false" ]; then
      VIOLATIONS+=" $code"
    fi
  done

  if [ -z "$VIOLATIONS" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $basename — uses only approved exit codes: $EXIT_CODES"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $basename — unapproved exit codes:$VIOLATIONS\n"
    echo "  [FAIL] $basename — unapproved exit codes:$VIOLATIONS"
  fi
done

echo ""

# Verify advisory hooks never use exit 2
echo "--- Advisory hook enforcement ---"

ADVISORY_HOOKS=(
  "loop_detector.sh"
  "token_budget_tracker.sh"
  "compliance_ethics_advisor.sh"
  "zero_trust_validator.sh"
  "context_health_check.sh"
  "brain_context_router.sh"
  "context_baseline.sh"
  "repeat_audit_logger.sh"
)

for hook in "${ADVISORY_HOOKS[@]}"; do
  hook_path="$HOOKS_DIR/$hook"
  [ -f "$hook_path" ] || continue

  if grep -q 'exit 2' "$hook_path" 2>/dev/null; then
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $hook — advisory hook must never use exit 2\n"
    echo "  [FAIL] $hook — advisory hook must never use exit 2"
  else
    PASS=$((PASS + 1))
    echo "  [PASS] $hook — no exit 2 (advisory-only confirmed)"
  fi
done

echo ""

# Verify hard-block hooks document their exit 2 usage
echo "--- Hard-block hook documentation ---"

HARD_HOOKS=(
  "scope_boundary_guard.sh"
  "prohibitions_enforcer.sh"
  "tool_permission_guard.sh"
  "privilege_check.sh"
  "protocol_registry_guard.sh"
  "tier_validation.sh"
)

for hook in "${HARD_HOOKS[@]}"; do
  hook_path="$HOOKS_DIR/$hook"
  [ -f "$hook_path" ] || continue

  if grep -q 'exit 2' "$hook_path" 2>/dev/null; then
    # Check if the header documents the hard-block behavior
    if head -10 "$hook_path" | grep -qi 'hard-block\|exit 2\|fail-closed\|deny'; then
      PASS=$((PASS + 1))
      echo "  [PASS] $hook — documents hard-block behavior"
    else
      FAIL=$((FAIL + 1))
      ERRORS+="  [FAIL] $hook — uses exit 2 but header doesn't document it\n"
      echo "  [FAIL] $hook — uses exit 2 but header doesn't document it"
    fi
  fi
done

# ─── Summary ─────────────────────────────────────────────────────────

echo ""
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Violations:"
  printf '%b' "$ERRORS"
  exit 1
fi

echo "  All hooks comply with exit code taxonomy."
exit 0
