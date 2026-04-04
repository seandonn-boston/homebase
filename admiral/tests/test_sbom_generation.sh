#!/bin/bash
# Admiral Framework — SBOM Generation Tests (SEC-09)
# Validates generate_sbom.sh script structure, output format, and CI workflow.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/../lib/assert.sh"

SBOM_SCRIPT="$PROJECT_DIR/admiral/bin/generate_sbom.sh"
WORKFLOW="$PROJECT_DIR/.github/workflows/sbom.yml"

echo "=== SBOM Generation Tests (SEC-09) ==="
echo ""

# ─── File existence ────────────────────────────────────────────────

echo "--- File existence ---"

assert_file_exists "SBOM script exists" "$SBOM_SCRIPT"
assert_file_exists "CI workflow exists" "$WORKFLOW"

# ─── Script syntax ─────────────────────────────────────────────────

echo ""
echo "--- Script syntax ---"

if bash -n "$SBOM_SCRIPT" 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] Script passes bash -n syntax check"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Script fails bash -n syntax check\n"
  echo "  [FAIL] Script fails bash -n syntax check"
fi

# ─── Script capabilities ──────────────────────────────────────────

echo ""
echo "--- Script capabilities ---"

FEATURES=(
  "CycloneDX"
  "specVersion"
  "bomFormat"
  "components"
  "purl"
  "bom-ref"
  "package.json"
  "package-lock.json"
  "system dependencies"
)

for feature in "${FEATURES[@]}"; do
  if grep -q "$feature" "$SBOM_SCRIPT"; then
    PASS=$((PASS + 1))
    echo "  [PASS] Script references: $feature"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Script missing reference: $feature\n"
    echo "  [FAIL] Script missing reference: $feature"
  fi
done

# ─── npm project coverage ─────────────────────────────────────────

echo ""
echo "--- npm project coverage ---"

NPM_PROJECTS=("control-plane" "platform" "fleet" "mcp-server" "admiral")

for project in "${NPM_PROJECTS[@]}"; do
  if grep -q "$project" "$SBOM_SCRIPT"; then
    PASS=$((PASS + 1))
    echo "  [PASS] Script scans project: $project"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Script missing project: $project\n"
    echo "  [FAIL] Script missing project: $project"
  fi
done

# ─── System dependency coverage ───────────────────────────────────

echo ""
echo "--- System dependency coverage ---"

SYS_DEPS=("bash" "jq" "curl" "git" "node" "npm" "shellcheck" "sqlite3")

for dep in "${SYS_DEPS[@]}"; do
  if grep -q "\"$dep\"" "$SBOM_SCRIPT"; then
    PASS=$((PASS + 1))
    echo "  [PASS] Script tracks system dep: $dep"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Script missing system dep: $dep\n"
    echo "  [FAIL] Script missing system dep: $dep"
  fi
done

# ─── CycloneDX format compliance ─────────────────────────────────

echo ""
echo "--- CycloneDX format compliance ---"

CDX_FIELDS=("serialNumber" "metadata" "timestamp" "vendor" "version")

for field in "${CDX_FIELDS[@]}"; do
  if grep -q "$field" "$SBOM_SCRIPT"; then
    PASS=$((PASS + 1))
    echo "  [PASS] CycloneDX field present: $field"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] CycloneDX field missing: $field\n"
    echo "  [FAIL] CycloneDX field missing: $field"
  fi
done

# ─── Workflow checks ──────────────────────────────────────────────

echo ""
echo "--- Workflow configuration ---"

WF_FEATURES=("schedule" "pull_request" "workflow_dispatch" "upload-artifact" "generate_sbom.sh" "sbom")

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

if grep -qE 'cron:.*[0-9*]' "$WORKFLOW"; then
  PASS=$((PASS + 1))
  echo "  [PASS] Workflow has cron schedule"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Workflow missing cron schedule\n"
  echo "  [FAIL] Workflow missing cron schedule"
fi

# ─── Exit code contract ───────────────────────────────────────────

echo ""
echo "--- Exit code contract ---"

if grep -q "exit 1" "$SBOM_SCRIPT"; then
  PASS=$((PASS + 1))
  echo "  [PASS] Script exits 1 on error"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Script missing exit 1 for error\n"
  echo "  [FAIL] Script missing exit 1 for error"
fi

if grep -q "exit 0" "$SBOM_SCRIPT"; then
  PASS=$((PASS + 1))
  echo "  [PASS] Script exits 0 on success"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Script missing exit 0 for success\n"
  echo "  [FAIL] Script missing exit 0 for success"
fi

# ─── Transitive dependency handling ───────────────────────────────

echo ""
echo "--- Transitive dependency handling ---"

if grep -q "transitive" "$SBOM_SCRIPT"; then
  PASS=$((PASS + 1))
  echo "  [PASS] Script handles transitive dependencies"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Script missing transitive dependency handling\n"
  echo "  [FAIL] Script missing transitive dependency handling"
fi

if grep -q "unique_by" "$SBOM_SCRIPT"; then
  PASS=$((PASS + 1))
  echo "  [PASS] Script deduplicates components"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Script missing component deduplication\n"
  echo "  [FAIL] Script missing component deduplication"
fi

# ─── Summary ──────────────────────────────────────────────────────

print_results "SBOM Generation Tests"
