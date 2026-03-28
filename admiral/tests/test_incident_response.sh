#!/bin/bash
# Admiral Framework — Incident Response Playbook Validation (SEC-07)
# Validates that INCIDENT_RESPONSE.md covers all required scenarios,
# phases, commands, and Standing Orders integration.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/../lib/assert.sh"

PLAYBOOK="$PROJECT_DIR/docs/INCIDENT_RESPONSE.md"

echo "=== Incident Response Playbook Validation (SEC-07) ==="
echo ""

# ─── File existence ──────────────────────────────────────────────────

assert_file_exists "Playbook exists" "$PLAYBOOK"

# ─── 4 Critical scenarios ───────────────────────────────────────────

echo "--- Scenario coverage ---"

SCENARIOS=(
  "Compromised Brain Entry"
  "Identity Spoofing"
  "Unauthorized Tool Access"
  "Audit Log Tampering"
)

for scenario in "${SCENARIOS[@]}"; do
  if grep -q "$scenario" "$PLAYBOOK"; then
    PASS=$((PASS + 1))
    echo "  [PASS] Scenario: $scenario"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Missing scenario: $scenario\n"
    echo "  [FAIL] Missing scenario: $scenario"
  fi
done

# ─── 5 Response phases per scenario ─────────────────────────────────

echo ""
echo "--- Phase coverage per scenario ---"

PHASES=("Detection" "Containment" "Investigation" "Remediation" "Post-Mortem")

for phase in "${PHASES[@]}"; do
  count=$(grep -c "### $phase" "$PLAYBOOK" 2>/dev/null) || count=0
  if [ "$count" -ge 4 ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] Phase '$phase' appears in $count scenarios (need >= 4)"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Phase '$phase' appears in only $count scenarios (need >= 4)\n"
    echo "  [FAIL] Phase '$phase' in $count scenarios (need >= 4)"
  fi
done

# ─── Runbook commands (code blocks) ─────────────────────────────────

echo ""
echo "--- Runbook commands ---"

CODE_BLOCKS=$(grep -c '```bash' "$PLAYBOOK" 2>/dev/null) || CODE_BLOCKS=0
if [ "$CODE_BLOCKS" -ge 8 ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] $CODE_BLOCKS bash code blocks (need >= 8)"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Only $CODE_BLOCKS bash code blocks (need >= 8)\n"
  echo "  [FAIL] Only $CODE_BLOCKS bash code blocks (need >= 8)"
fi

# Check for key commands referenced in the playbook
KEY_COMMANDS=("brain_audit" "brain_purge" "audit_integrity" "security_audit.jsonl" "test_hooks.sh")

for cmd in "${KEY_COMMANDS[@]}"; do
  if grep -q "$cmd" "$PLAYBOOK"; then
    PASS=$((PASS + 1))
    echo "  [PASS] References command/file: $cmd"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Missing reference to: $cmd\n"
    echo "  [FAIL] Missing reference to: $cmd"
  fi
done

# ─── Standing Orders integration ────────────────────────────────────

echo ""
echo "--- Standing Orders integration ---"

SO_REFS=("SO-09" "SO-10" "SO-13" "SO-16")

for so in "${SO_REFS[@]}"; do
  if grep -q "$so" "$PLAYBOOK"; then
    PASS=$((PASS + 1))
    echo "  [PASS] References $so"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Missing Standing Order reference: $so\n"
    echo "  [FAIL] Missing Standing Order reference: $so"
  fi
done

# ─── Severity levels ────────────────────────────────────────────────

echo ""
echo "--- Severity levels ---"

SEVERITIES=("P1 Critical" "P2 High" "P3 Medium" "P4 Low")

for sev in "${SEVERITIES[@]}"; do
  if grep -q "$sev" "$PLAYBOOK"; then
    PASS=$((PASS + 1))
    echo "  [PASS] Severity level: $sev"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Missing severity level: $sev\n"
    echo "  [FAIL] Missing severity level: $sev"
  fi
done

# ─── Incident log template ──────────────────────────────────────────

echo ""
echo "--- Incident log template ---"

if grep -q "Incident Log Template" "$PLAYBOOK"; then
  PASS=$((PASS + 1))
  echo "  [PASS] Includes incident log template"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Missing incident log template\n"
  echo "  [FAIL] Missing incident log template"
fi

if [ -d "$PROJECT_DIR/.admiral/incidents" ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] Incidents directory exists"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Missing .admiral/incidents/ directory\n"
  echo "  [FAIL] Missing .admiral/incidents/ directory"
fi

# ─── Summary ─────────────────────────────────────────────────────────

print_results "Incident Response Playbook Validation"
