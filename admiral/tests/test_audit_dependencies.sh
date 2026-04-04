#!/bin/bash
# Admiral Framework — Dependency Audit Script Tests (SEC-08)
# Validates the audit_dependencies.sh script structure and report format.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/../lib/assert.sh"

AUDIT_SCRIPT="$PROJECT_DIR/admiral/bin/audit_dependencies.sh"
WORKFLOW="$PROJECT_DIR/.github/workflows/security-audit.yml"

echo "=== Dependency Audit Script Tests (SEC-08) ==="
echo ""

# ─── Script and workflow existence ───────────────────────────────────

echo "--- File existence ---"

assert_file_exists "Audit script exists" "$AUDIT_SCRIPT"
assert_file_exists "CI workflow exists" "$WORKFLOW"

# ─── Script syntax ───────────────────────────────────────────────────

echo ""
echo "--- Script syntax ---"

if bash -n "$AUDIT_SCRIPT" 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] Script passes bash -n syntax check"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Script fails bash -n syntax check\n"
  echo "  [FAIL] Script fails bash -n syntax check"
fi

# ─── Script content checks ──────────────────────────────────────────

echo ""
echo "--- Script capabilities ---"

FEATURES=(
  "npm audit --json"
  "audit-report.json"
  "critical"
  "high"
  "moderate"
  "affected_packages"
  "blocking"
  "fix_available"
)

for feature in "${FEATURES[@]}"; do
  if grep -q "$feature" "$AUDIT_SCRIPT"; then
    PASS=$((PASS + 1))
    echo "  [PASS] Script references: $feature"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Script missing reference: $feature\n"
    echo "  [FAIL] Script missing reference: $feature"
  fi
done

# ─── Workflow checks ─────────────────────────────────────────────────

echo ""
echo "--- Workflow configuration ---"

WF_FEATURES=("schedule" "pull_request" "workflow_dispatch" "upload-artifact" "audit_dependencies.sh")

for feature in "${WF_FEATURES[@]}"; do
  if grep -q "$feature" "$WORKFLOW"; then
    PASS=$((PASS + 1))
    echo "  [PASS] Workflow includes: $feature"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Workflow missing: $feature\n"
    echo "  [FAIL] Workflow missing: $feature"
  fi
done

# Daily schedule check
if grep -qE 'cron:.*\*.*\*.*\*' "$WORKFLOW"; then
  PASS=$((PASS + 1))
  echo "  [PASS] Workflow has daily cron schedule"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Workflow missing daily cron schedule\n"
  echo "  [FAIL] Workflow missing daily cron schedule"
fi

# ─── Exit code contract ─────────────────────────────────────────────

echo ""
echo "--- Exit code contract ---"

if grep -q "exit 1" "$AUDIT_SCRIPT"; then
  PASS=$((PASS + 1))
  echo "  [PASS] Script exits 1 on blocking vulnerabilities"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Script missing exit 1 for blocking\n"
  echo "  [FAIL] Script missing exit 1 for blocking"
fi

if grep -q "exit 0" "$AUDIT_SCRIPT"; then
  PASS=$((PASS + 1))
  echo "  [PASS] Script exits 0 when clean"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Script missing exit 0 for clean\n"
  echo "  [FAIL] Script missing exit 0 for clean"
fi

# ─── Summary ─────────────────────────────────────────────────────────

print_results "Dependency Audit Script Tests"
