#!/bin/bash
# Admiral Framework — Changelog Generator (DX-11)
# Auto-generates changelog entries from conventional commits.
#
# Usage: ./scripts/changelog.sh [since-tag]
#   If no tag given, generates from the last tag or last 50 commits.
set -euo pipefail

SINCE="${1:-}"

if [ -z "$SINCE" ]; then
  SINCE=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
fi

if [ -n "$SINCE" ]; then
  RANGE="${SINCE}..HEAD"
  echo "# Changelog (since $SINCE)"
else
  RANGE="HEAD~50..HEAD"
  echo "# Changelog (last 50 commits)"
fi
echo ""
echo "Generated: $(date -u +%Y-%m-%d)"
echo ""

print_section() {
  local title="$1"
  local prefix="$2"
  local commits
  commits=$(git log "$RANGE" --oneline --grep="^${prefix}" --format="%h %s" 2>/dev/null || echo "")
  if [ -n "$commits" ]; then
    echo "## $title"
    echo ""
    echo "$commits" | while IFS= read -r line; do
      local hash
      hash=$(echo "$line" | cut -d' ' -f1)
      local msg
      msg=$(echo "$line" | cut -d' ' -f2-)
      # Strip conventional commit prefix
      msg=$(echo "$msg" | sed "s/^${prefix}[^:]*: //")
      echo "- ${msg} (\`${hash}\`)"
    done
    echo ""
  fi
}

print_section "Features" "feat"
print_section "Bug Fixes" "fix"
print_section "Documentation" "docs"
print_section "Refactoring" "refactor"
print_section "Tests" "test"
print_section "Chores" "chore"

# Breaking changes
breaking=$(git log "$RANGE" --oneline --grep="BREAKING" --format="%h %s" 2>/dev/null || echo "")
if [ -n "$breaking" ]; then
  echo "## Breaking Changes"
  echo ""
  echo "$breaking" | while IFS= read -r line; do
    echo "- $line"
  done
  echo ""
fi
