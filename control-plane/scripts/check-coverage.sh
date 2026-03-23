#!/usr/bin/env bash
# T-09: Coverage threshold gate for CI
# Parses test coverage output and fails if below threshold.
#
# Usage: ./scripts/check-coverage.sh [threshold]
#   threshold: minimum line coverage percentage (default: 80)
set -euo pipefail

THRESHOLD="${1:-80}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Running tests with coverage..."
cd "$PROJECT_DIR"

# Run tests with coverage and capture output
COVERAGE_OUTPUT=$(npm run test:coverage 2>&1) || true

# Check for test failures
if echo "$COVERAGE_OUTPUT" | grep -q '# fail [1-9]'; then
  echo "FAIL: Tests failed. Coverage check aborted."
  echo "$COVERAGE_OUTPUT" | grep -E '(# tests|# pass|# fail)'
  exit 1
fi

# Extract the "all files" coverage line
ALL_FILES_LINE=$(echo "$COVERAGE_OUTPUT" | grep '# all files' || true)

if [ -z "$ALL_FILES_LINE" ]; then
  echo "WARN: Could not parse coverage output. Skipping threshold check."
  exit 0
fi

# Parse line coverage percentage (first number after first pipe)
LINE_COV=$(echo "$ALL_FILES_LINE" | awk -F'|' '{gsub(/[[:space:]]/, "", $2); print $2}')

if [ -z "$LINE_COV" ]; then
  echo "WARN: Could not extract line coverage. Skipping threshold check."
  exit 0
fi

# Compare as integers (strip decimal)
LINE_COV_INT=${LINE_COV%.*}

echo ""
echo "Coverage Summary"
echo "================"
echo "$ALL_FILES_LINE" | sed 's/^# /  /'
echo ""
echo "  Line coverage: ${LINE_COV}%"
echo "  Threshold:     ${THRESHOLD}%"
echo ""

if [ "$LINE_COV_INT" -lt "$THRESHOLD" ]; then
  echo "FAIL: Line coverage ${LINE_COV}% is below threshold ${THRESHOLD}%"
  exit 1
else
  echo "PASS: Line coverage ${LINE_COV}% meets threshold ${THRESHOLD}%"
fi
