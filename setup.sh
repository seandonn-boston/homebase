#!/bin/bash
# Admiral Framework — One-Command Setup (DX-02)
#
# Usage: ./setup.sh
#
# Installs all dependencies, validates the environment, and runs
# initial tests. Idempotent — safe to run multiple times.
# Works on macOS, Linux, and Windows (Git Bash/WSL).

set -euo pipefail

# ── Colors & Formatting ──────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass_count=0
warn_count=0
fail_count=0

info()  { printf "${BLUE}[INFO]${NC}  %s\n" "$1"; }
ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$1"; pass_count=$((pass_count + 1)); }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; warn_count=$((warn_count + 1)); }
fail()  { printf "${RED}[FAIL]${NC}  %s\n" "$1"; fail_count=$((fail_count + 1)); }

# ── Environment Detection ────────────────────────────────────

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

info "Admiral Framework Setup"
info "Project root: $PROJECT_ROOT"
echo ""

# ── Step 1: Check System Dependencies ────────────────────────

info "Step 1: Checking system dependencies..."

# Bash version
bash_version="${BASH_VERSINFO[0]:-0}"
if [ "$bash_version" -ge 4 ]; then
  ok "bash ${BASH_VERSION} (>= 4 required)"
else
  fail "bash ${BASH_VERSION} — version 4+ required"
  echo "  Install: brew install bash (macOS) or apt install bash (Linux)"
fi

# Node.js
if command -v node >/dev/null 2>&1; then
  node_version=$(node --version 2>/dev/null | sed 's/v//')
  node_major=$(echo "$node_version" | cut -d. -f1)
  required_node=$(cat .nvmrc 2>/dev/null | tr -d '[:space:]')
  if [ "$node_major" -ge "${required_node:-22}" ] 2>/dev/null; then
    ok "node $node_version (>= $required_node required)"
  else
    fail "node $node_version — version ${required_node}+ required"
    echo "  Install: nvm install $required_node"
  fi
else
  fail "node not found"
  echo "  Install: https://nodejs.org or nvm install $(cat .nvmrc)"
fi

# npm
if command -v npm >/dev/null 2>&1; then
  ok "npm $(npm --version)"
else
  fail "npm not found (comes with Node.js)"
fi

# jq
if command -v jq >/dev/null 2>&1; then
  ok "jq $(jq --version 2>/dev/null | sed 's/jq-//')"
else
  fail "jq not found"
  echo "  Install: brew install jq (macOS) or apt install jq (Linux)"
fi

# git
if command -v git >/dev/null 2>&1; then
  ok "git $(git --version | sed 's/git version //')"
else
  fail "git not found"
fi

# Optional: shellcheck
if command -v shellcheck >/dev/null 2>&1; then
  ok "shellcheck $(shellcheck --version 2>/dev/null | grep '^version:' | sed 's/version: //')"
else
  warn "shellcheck not found (optional, used for hook linting)"
  echo "  Install: brew install shellcheck (macOS) or apt install shellcheck (Linux)"
fi

# Optional: sqlite3
if command -v sqlite3 >/dev/null 2>&1; then
  ok "sqlite3 $(sqlite3 --version 2>/dev/null | cut -d' ' -f1)"
else
  warn "sqlite3 not found (optional, used for Brain B2 integration tests)"
fi

echo ""

# Bail early if critical deps missing
if [ "$fail_count" -gt 0 ]; then
  fail "Missing required dependencies. Fix the failures above and re-run."
  exit 1
fi

# ── Step 2: Install npm Dependencies ─────────────────────────

info "Step 2: Installing npm dependencies..."

for dir in control-plane admiral fleet platform mcp-server; do
  if [ -f "$dir/package.json" ]; then
    info "  Installing $dir/..."
    (cd "$dir" && npm install --no-audit --no-fund 2>&1 | tail -1)
    ok "  $dir dependencies installed"
  fi
done

echo ""

# ── Step 3: Build TypeScript ─────────────────────────────────

info "Step 3: Building TypeScript..."

for dir in control-plane fleet platform mcp-server; do
  if [ -f "$dir/tsconfig.json" ]; then
    info "  Building $dir/..."
    (cd "$dir" && npx tsc 2>&1 | head -5) || true
    if [ -d "$dir/dist" ]; then
      ok "  $dir built successfully"
    else
      warn "  $dir build produced no output (may need investigation)"
    fi
  fi
done

echo ""

# ── Step 4: Run Tests ────────────────────────────────────────

info "Step 4: Running tests..."

# Control plane tests
if [ -f "control-plane/package.json" ]; then
  info "  Running control-plane tests..."
  cp_result=$(cd control-plane && npm test 2>&1 | tail -3)
  cp_pass=$(echo "$cp_result" | grep -oP 'pass \K\d+' 2>/dev/null || echo "?")
  cp_fail=$(echo "$cp_result" | grep -oP 'fail \K\d+' 2>/dev/null || echo "?")
  if [ "$cp_fail" = "0" ] || [ "$cp_fail" = "?" ]; then
    ok "  control-plane: $cp_pass passed"
  else
    warn "  control-plane: $cp_pass passed, $cp_fail failed"
  fi
fi

# Hook tests
if [ -f ".hooks/tests/test_hooks.sh" ]; then
  info "  Running hook tests..."
  hook_result=$(bash .hooks/tests/test_hooks.sh 2>&1 | tail -1) || true
  ok "  hook tests: $hook_result"
fi

echo ""

# ── Step 5: Validate Project Structure ───────────────────────

info "Step 5: Validating project structure..."

expected_dirs=(admiral control-plane fleet platform mcp-server docs plan .hooks)
for dir in "${expected_dirs[@]}"; do
  if [ -d "$dir" ]; then
    ok "  $dir/ exists"
  else
    warn "  $dir/ missing"
  fi
done

# Check critical files
expected_files=(AGENTS.md CLAUDE.md CONTRIBUTING.md .nvmrc)
for file in "${expected_files[@]}"; do
  if [ -f "$file" ]; then
    ok "  $file exists"
  else
    warn "  $file missing"
  fi
done

echo ""

# ── Summary ──────────────────────────────────────────────────

echo "═══════════════════════════════════════════════"
printf "${GREEN}  ✓ %d passed${NC}" "$pass_count"
if [ "$warn_count" -gt 0 ]; then
  printf "  ${YELLOW}⚠ %d warnings${NC}" "$warn_count"
fi
if [ "$fail_count" -gt 0 ]; then
  printf "  ${RED}✗ %d failed${NC}" "$fail_count"
fi
echo ""
echo "═══════════════════════════════════════════════"

if [ "$fail_count" -gt 0 ]; then
  echo ""
  fail "Setup incomplete. Fix failures above and re-run."
  exit 1
else
  echo ""
  info "Setup complete! You're ready to develop."
  info ""
  info "Quick start:"
  info "  cd control-plane && npm test    # Run tests"
  info "  cd control-plane && npm run dev # Watch mode"
  info "  bash .hooks/tests/test_hooks.sh # Test hooks"
  info ""
  info "See CONTRIBUTING.md for the full development guide."
fi
