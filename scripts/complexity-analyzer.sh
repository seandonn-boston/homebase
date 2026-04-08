#!/bin/bash
# Contribution Complexity Analyzer (X-12)
# Classifies codebase areas by contribution difficulty.
# Generates ranked "good first issue" candidates.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

printf "%-40s %-12s %-8s %s\n" "AREA" "COMPLEXITY" "FILES" "REASON"
printf "%-40s %-12s %-8s %s\n" "----" "----------" "-----" "------"

analyze() {
  local dir="$1"
  local label="$2"

  [ -d "$dir" ] || return 0

  local file_count
  file_count=$(find "$dir" -type f \( -name '*.ts' -o -name '*.sh' -o -name '*.json' \) 2>/dev/null | wc -l | tr -d ' ')

  local has_tests="no"
  find "$dir" -name '*.test.*' -o -name 'test_*' 2>/dev/null | head -1 | grep -q . && has_tests="yes"

  local loc=0
  for f in $(find "$dir" -type f \( -name '*.ts' -o -name '*.sh' \) 2>/dev/null); do
    loc=$((loc + $(wc -l < "$f" | tr -d ' ')))
  done

  local complexity="easy"
  local reason="small, isolated"

  if [ "$loc" -gt 2000 ]; then
    complexity="hard"
    reason="large codebase ($loc LOC)"
  elif [ "$loc" -gt 500 ]; then
    complexity="medium"
    reason="moderate size ($loc LOC)"
  fi

  if [ "$has_tests" = "no" ]; then
    reason="$reason, no tests"
  fi

  printf "%-40s %-12s %-8s %s\n" "$label" "$complexity" "$file_count" "$reason"
}

analyze ".hooks" "Hooks (enforcement)"
analyze "admiral/lib" "Admiral libraries"
analyze "admiral/bin" "Admiral CLI tools"
analyze "admiral/brain" "Brain B2 (SQLite)"
analyze "control-plane/src" "Control plane"
analyze "fleet/routing" "Fleet routing"
analyze "fleet/agents" "Fleet agent definitions"
analyze "monitor" "Monitoring/scanner"
analyze "scripts" "Development scripts"
analyze "docs/guides" "Documentation guides"
analyze "docs/compliance" "Compliance crosswalks"
analyze "docs/positioning" "Market positioning"
analyze "mcp-server/src" "MCP server"
analyze "platform/src" "Platform adapters"

echo ""
echo "Recommended first contributions:"
echo "  1. docs/ — easy, isolated, high impact"
echo "  2. monitor/ — medium, well-scoped, good test coverage"
echo "  3. scripts/ — easy, standalone utilities"
echo "  4. admiral/bin/ — easy-medium, CLI tools with clear interfaces"
echo "  5. .hooks/ — medium, requires understanding of hook lifecycle"
