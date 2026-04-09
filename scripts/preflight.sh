#!/bin/bash
# Admiral Framework — Pre-Flight Checklist (DX-13)
# Verifies project readiness against profile-specific requirements.
#
# Usage: ./scripts/preflight.sh [profile]
#   Profiles: starter, team, governed, production, enterprise
#   Default: starter
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; NC='\033[0m'

PROFILE="${1:-starter}"
pass=0
fail=0
skip=0

check() {
  local desc="$1"
  local min_profile="$2"
  shift 2
  local profiles=("starter" "team" "governed" "production" "enterprise")

  # Check if current profile meets minimum
  local cur_idx=0 min_idx=0
  for i in "${!profiles[@]}"; do
    [ "${profiles[$i]}" = "$PROFILE" ] && cur_idx=$i
    [ "${profiles[$i]}" = "$min_profile" ] && min_idx=$i
  done

  if [ "$cur_idx" -lt "$min_idx" ]; then
    return 0  # Skip — not required for this profile
  fi

  if "$@" > /dev/null 2>&1; then
    printf "  ${GREEN}PASS${NC} %s\n" "$desc"
    pass=$((pass + 1))
  else
    printf "  ${RED}FAIL${NC} %s\n" "$desc"
    fail=$((fail + 1))
  fi
}

printf "${BLUE}Pre-Flight Checklist${NC} — Profile: ${YELLOW}%s${NC}\n\n" "$PROFILE"

# ── Structure ─────────────────────────────────────────────────
echo "Structure"
check "CONTRIBUTING.md exists" "starter" test -f CONTRIBUTING.md
check "AGENTS.md exists" "starter" test -f AGENTS.md
check "CLAUDE.md exists" "starter" test -f CLAUDE.md
check ".nvmrc exists" "starter" test -f .nvmrc
check "setup.sh exists" "starter" test -f setup.sh
check "Makefile exists" "starter" test -f Makefile
check ".devcontainer/ exists" "team" test -d .devcontainer
check "plan/ROADMAP.md exists" "starter" test -f plan/ROADMAP.md
echo ""

# ── Dependencies ──────────────────────────────────────────────
echo "Dependencies"
check "Node.js installed" "starter" command -v node
check "npm installed" "starter" command -v npm
check "jq installed" "starter" command -v jq
check "git installed" "starter" command -v git
check "shellcheck installed" "governed" command -v shellcheck
check "sqlite3 installed" "production" command -v sqlite3
echo ""

# ── Build ─────────────────────────────────────────────────────
echo "Build"
check "control-plane/node_modules exists" "starter" test -d control-plane/node_modules
check "control-plane/dist exists" "starter" test -d control-plane/dist
check "fleet/dist exists" "team" test -d fleet/dist
check "platform/dist exists" "team" test -d platform/dist
echo ""

# ── Tests ─────────────────────────────────────────────────────
echo "Tests"
check "control-plane tests exist" "starter" test -f control-plane/dist/src/events.test.js
check "hook tests exist" "starter" test -f .hooks/tests/test_hooks.sh
check "e2e tests exist" "team" test -f control-plane/dist/src/e2e-orchestration.test.js
echo ""

# ── Hooks ─────────────────────────────────────────────────────
echo "Hooks"
check "scope_boundary_guard.sh exists" "starter" test -f .hooks/scope_boundary_guard.sh
check "prohibitions_enforcer.sh exists" "starter" test -f .hooks/prohibitions_enforcer.sh
check "identity_validation.sh exists" "governed" test -f .hooks/identity_validation.sh
check "pre_tool_use_adapter.sh exists" "starter" test -f .hooks/pre_tool_use_adapter.sh
check "hook_utils.sh exists" "starter" test -f admiral/lib/hook_utils.sh
echo ""

# ── Documentation ─────────────────────────────────────────────
echo "Documentation"
check "ADR directory exists" "team" test -d docs/adr
check "Style guide exists" "governed" test -f docs/ADMIRAL_STYLE.md
check "Hook dev guide exists" "governed" test -f docs/guides/hook-development.md
echo ""

# ── Security ──────────────────────────────────────────────────
echo "Security"
check "Security model doc exists" "governed" test -f docs/security/security-model.md
check "Attack corpus exists" "production" test -d admiral/attack-corpus
check "Injection detection exists" "governed" test -f admiral/lib/injection_detector.sh
echo ""

# ── Fleet ─────────────────────────────────────────────────────
echo "Fleet"
check "Fleet registry exists" "team" test -f admiral/config/fleet_registry.json
check "Agent definitions exist" "team" test -d fleet/agents/definitions
check "Routing rules exist" "governed" test -f fleet/routing-rules.md
echo ""

# ── CI/CD ─────────────────────────────────────────────────────
echo "CI/CD"
check "CI workflow exists" "team" test -f .github/workflows/control-plane-ci.yml
check "Hook test workflow exists" "team" test -f .github/workflows/hook-tests.yml
check "Local CI script exists" "starter" test -f scripts/ci-local.sh
echo ""

# ── Summary ───────────────────────────────────────────────────
total=$((pass + fail))
echo "================================================================"
printf "Profile: ${YELLOW}%s${NC}  |  " "$PROFILE"
printf "${GREEN}%d passed${NC}" "$pass"
[ "$fail" -gt 0 ] && printf "  ${RED}%d failed${NC}" "$fail"
printf "  (%d total)\n" "$total"
echo "================================================================"

if [ "$fail" -gt 0 ]; then
  printf "\n${RED}Pre-flight check failed.${NC} Fix the items above.\n"
  exit 1
else
  printf "\n${GREEN}All checks passed for '%s' profile.${NC}\n" "$PROFILE"
fi
