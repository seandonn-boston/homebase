#!/bin/bash
# Admiral Framework — Leash Cedar Integration Spec Tests (SEC-15)
# Validates the spec document and example Cedar policies.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/../lib/assert.sh"

SPEC_FILE="$PROJECT_DIR/admiral/docs/leash-integration-spec.md"
EXAMPLES_DIR="$PROJECT_DIR/admiral/security/cedar-generator/examples"

echo "=== Leash Cedar Integration Spec Tests (SEC-15) ==="
echo ""

# ─── File existence ────────────────────────────────────────────────

echo "--- File existence ---"

assert_file_exists "Spec document exists" "$SPEC_FILE"
assert_file_exists "Implementer example exists" "$EXAMPLES_DIR/implementer-1.cedar"
assert_file_exists "Security agent example exists" "$EXAMPLES_DIR/security-agent.cedar"
assert_file_exists "Standing orders example exists" "$EXAMPLES_DIR/standing-orders.cedar"

# ─── Spec content coverage ────────────────────────────────────────

echo ""
echo "--- Spec covers all 4 authority tiers ---"

TIERS=("Enforced" "Autonomous" "Propose" "Escalate")

for tier in "${TIERS[@]}"; do
  if grep -qi "$tier" "$SPEC_FILE"; then
    PASS=$((PASS + 1))
    echo "  [PASS] Spec covers tier: $tier"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Spec missing tier: $tier\n"
    echo "  [FAIL] Spec missing tier: $tier"
  fi
done

echo ""
echo "--- Spec covers deployment scenarios ---"

SCENARIOS=("Leash-Present" "Leash-Absent" "Migration")

for scenario in "${SCENARIOS[@]}"; do
  if grep -qi "$scenario" "$SPEC_FILE"; then
    PASS=$((PASS + 1))
    echo "  [PASS] Spec covers scenario: $scenario"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Spec missing scenario: $scenario\n"
    echo "  [FAIL] Spec missing scenario: $scenario"
  fi
done

echo ""
echo "--- Spec references key concepts ---"

CONCEPTS=("Cedar" "permit" "forbid" "entity" "policy" "Standing Order" "ATK-0003" "approval")

for concept in "${CONCEPTS[@]}"; do
  if grep -q "$concept" "$SPEC_FILE"; then
    PASS=$((PASS + 1))
    echo "  [PASS] Spec references: $concept"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Spec missing reference: $concept\n"
    echo "  [FAIL] Spec missing reference: $concept"
  fi
done

# ─── Example Cedar policy validation ──────────────────────────────

echo ""
echo "--- Cedar policy examples ---"

for example in "$EXAMPLES_DIR"/*.cedar; do
  filename=$(basename "$example")

  # Check for permit/forbid statements
  if grep -q "permit\|forbid" "$example"; then
    PASS=$((PASS + 1))
    echo "  [PASS] $filename contains policy statements"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $filename missing policy statements\n"
    echo "  [FAIL] $filename missing policy statements"
  fi

  # Check for principal/action/resource pattern
  if grep -q "principal" "$example"; then
    PASS=$((PASS + 1))
    echo "  [PASS] $filename uses principal"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $filename missing principal\n"
    echo "  [FAIL] $filename missing principal"
  fi

  if grep -q "action" "$example"; then
    PASS=$((PASS + 1))
    echo "  [PASS] $filename uses action"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $filename missing action\n"
    echo "  [FAIL] $filename missing action"
  fi
done

# ─── Agent example completeness ────────────────────────────────────

echo ""
echo "--- Agent example tier coverage ---"

for example in "$EXAMPLES_DIR/implementer-1.cedar" "$EXAMPLES_DIR/security-agent.cedar"; do
  filename=$(basename "$example")

  if grep -q "permit" "$example"; then
    PASS=$((PASS + 1))
    echo "  [PASS] $filename has autonomous (permit) policies"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $filename missing autonomous policies\n"
    echo "  [FAIL] $filename missing autonomous policies"
  fi

  if grep -q "unless" "$example"; then
    PASS=$((PASS + 1))
    echo "  [PASS] $filename has propose (forbid unless) policies"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $filename missing propose policies\n"
    echo "  [FAIL] $filename missing propose policies"
  fi

  if grep -q "forbid" "$example"; then
    PASS=$((PASS + 1))
    echo "  [PASS] $filename has escalate (forbid) policies"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $filename missing escalate policies\n"
    echo "  [FAIL] $filename missing escalate policies"
  fi
done

# ─── Standing orders example ──────────────────────────────────────

echo ""
echo "--- Standing orders Cedar coverage ---"

SO_REFS=("SO-10" "SO-05" "SO-12" "SO-09")

for so in "${SO_REFS[@]}"; do
  if grep -q "$so" "$EXAMPLES_DIR/standing-orders.cedar"; then
    PASS=$((PASS + 1))
    echo "  [PASS] Standing orders example covers: $so"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Standing orders example missing: $so\n"
    echo "  [FAIL] Standing orders example missing: $so"
  fi
done

# ─── Summary ──────────────────────────────────────────────────────

print_results "Leash Cedar Integration Spec Tests"
