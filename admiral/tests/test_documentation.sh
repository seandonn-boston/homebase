#!/bin/bash
# Admiral Framework — Documentation Discipline Validation (P-02)
# CI validation script that checks three documentation invariants:
# 1. TypeScript source files have module-level doc comments
# 2. Hook scripts have header comment blocks (purpose, exit codes)
# 3. ADRs follow the template format (Status, Context, Decision, Consequences)
# Exit code: 0 = all pass, 1 = violations found
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

PASS=0
FAIL=0
ERRORS=""

echo "=== Documentation Discipline Validation (P-02) ==="
echo ""

# ─── 1. TypeScript module-level doc comments ─────────────────────────

echo "--- TypeScript doc comments ---"

for ts_file in "$PROJECT_DIR/control-plane/src/"*.ts; do
  [ -f "$ts_file" ] || continue
  basename=$(basename "$ts_file")

  # Skip test files and index.ts
  case "$basename" in
    *.test.ts|*.property.test.ts|index.ts|test-helpers.ts) continue ;;
  esac

  # Check first 10 lines for a doc comment (/** or //)
  if head -10 "$ts_file" | grep -qE '^\s*(\/\*\*|\/\/)'; then
    PASS=$((PASS + 1))
    echo "  [PASS] $basename — has doc comment"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $basename — missing module-level doc comment in first 10 lines\n"
    echo "  [FAIL] $basename — missing module-level doc comment"
  fi
done

# ─── 2. Hook header comment blocks ──────────────────────────────────

echo ""
echo "--- Hook header blocks ---"

for hook_file in "$PROJECT_DIR/.hooks/"*.sh; do
  [ -f "$hook_file" ] || continue
  [ -d "$hook_file" ] && continue
  basename=$(basename "$hook_file")

  HOOK_OK=true

  # Check for purpose description (Admiral Framework in first 5 lines)
  if ! head -5 "$hook_file" | grep -q "Admiral Framework"; then
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] .hooks/$basename — missing 'Admiral Framework' purpose line\n"
    echo "  [FAIL] .hooks/$basename — missing purpose line"
    HOOK_OK=false
  fi

  # Check for exit code documentation (exit, advisory, hard-block in first 10 lines)
  if ! head -10 "$hook_file" | grep -qiE '(exit [0-9]|advisory|hard-block|fail-open|always exit|NEVER hard|NEVER blocks)'; then
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] .hooks/$basename — no exit code documentation in header\n"
    echo "  [FAIL] .hooks/$basename — no exit code docs"
    HOOK_OK=false
  fi

  if [ "$HOOK_OK" = "true" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] .hooks/$basename"
  fi
done

# ─── 3. ADR template format ─────────────────────────────────────────

echo ""
echo "--- ADR format compliance ---"

ADR_SECTIONS=("Status" "Context" "Decision" "Consequences")

for adr_file in "$PROJECT_DIR/docs/adr/"*.md; do
  [ -f "$adr_file" ] || continue
  basename=$(basename "$adr_file")

  ADR_OK=true
  for section in "${ADR_SECTIONS[@]}"; do
    if ! grep -q "^## $section" "$adr_file"; then
      FAIL=$((FAIL + 1))
      ERRORS+="  [FAIL] docs/adr/$basename — missing '## $section' section\n"
      echo "  [FAIL] docs/adr/$basename — missing ## $section"
      ADR_OK=false
    fi
  done

  if [ "$ADR_OK" = "true" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] docs/adr/$basename"
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

echo "  All documentation checks passed."
exit 0
