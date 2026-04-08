#!/bin/bash
# Admiral Framework — Local CI Runner (DX-06)
# Runs the full CI pipeline locally with timing and summary.
#
# Usage: ./scripts/ci-local.sh [--continue]
#   --continue: don't stop on first failure
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; NC='\033[0m'

FAIL_FAST=true
[ "${1:-}" = "--continue" ] && FAIL_FAST=false

declare -a STEP_NAMES=()
declare -a STEP_RESULTS=()
declare -a STEP_TIMES=()
total_start=$(date +%s)

run_step() {
  local name="$1"
  shift
  STEP_NAMES+=("$name")

  printf "${BLUE}[CI]${NC} %s...\n" "$name"
  local start
  start=$(date +%s)

  local result=0
  "$@" > /dev/null 2>&1 || result=$?

  local elapsed=$(( $(date +%s) - start ))
  STEP_TIMES+=("${elapsed}s")

  if [ "$result" -eq 0 ]; then
    STEP_RESULTS+=("PASS")
    printf "  ${GREEN}PASS${NC} (%ds)\n" "$elapsed"
  else
    STEP_RESULTS+=("FAIL")
    printf "  ${RED}FAIL${NC} (%ds)\n" "$elapsed"
    if [ "$FAIL_FAST" = true ]; then
      print_summary
      exit 1
    fi
  fi
}

print_summary() {
  local total_elapsed=$(( $(date +%s) - total_start ))
  echo ""
  echo "================================================================"
  printf "%-35s %-8s %s\n" "STEP" "RESULT" "TIME"
  printf "%-35s %-8s %s\n" "----" "------" "----"

  local pass=0 fail=0
  for i in "${!STEP_NAMES[@]}"; do
    local color="$GREEN"
    [ "${STEP_RESULTS[$i]}" = "FAIL" ] && color="$RED"
    printf "%-35s ${color}%-8s${NC} %s\n" "${STEP_NAMES[$i]}" "${STEP_RESULTS[$i]}" "${STEP_TIMES[$i]}"
    if [ "${STEP_RESULTS[$i]}" = "PASS" ]; then
      pass=$((pass + 1))
    else
      fail=$((fail + 1))
    fi
  done

  echo "================================================================"
  printf "Total: ${GREEN}%d passed${NC}" "$pass"
  [ "$fail" -gt 0 ] && printf ", ${RED}%d failed${NC}" "$fail"
  printf " in %ds\n" "$total_elapsed"
}

# Step 1: TypeScript compilation
run_step "TypeScript build (control-plane)" bash -c "cd control-plane && npx tsc"
run_step "TypeScript build (fleet)" bash -c "cd fleet && npx tsc"
run_step "TypeScript build (platform)" bash -c "cd platform && npx tsc"
run_step "TypeScript build (mcp-server)" bash -c "cd mcp-server && npx tsc"

# Step 2: Linting
run_step "Biome lint (control-plane)" bash -c "cd control-plane && npx @biomejs/biome check src/"

# Step 3: ShellCheck (if available)
if command -v shellcheck >/dev/null 2>&1; then
  run_step "ShellCheck (hooks)" bash -c "shellcheck .hooks/*.sh"
  run_step "ShellCheck (admiral/lib)" bash -c "shellcheck admiral/lib/*.sh"
else
  STEP_NAMES+=("ShellCheck"); STEP_RESULTS+=("SKIP"); STEP_TIMES+=("0s")
  printf "  ${YELLOW}SKIP${NC} ShellCheck not installed\n"
fi

# Step 4: Unit tests
run_step "Unit tests (control-plane)" bash -c "cd control-plane && npm test"

# Step 5: Hook tests
if [ -f ".hooks/tests/test_hooks.sh" ]; then
  run_step "Hook tests" bash .hooks/tests/test_hooks.sh
fi

# Step 6: Doc validation
run_step "Docs exist" bash -c "test -f CONTRIBUTING.md && test -f AGENTS.md && test -f CLAUDE.md"

print_summary

# Exit with failure if any step failed
for r in "${STEP_RESULTS[@]}"; do
  [ "$r" = "FAIL" ] && exit 1
done
