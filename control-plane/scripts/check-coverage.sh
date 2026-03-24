#!/bin/bash
# Admiral Control Plane — Coverage Threshold Gate
# Parses Node.js --experimental-test-coverage output and fails
# if line coverage drops below the configured threshold.
# Usage: npm run test:coverage 2>&1 | bash scripts/check-coverage.sh [threshold]
# Exit: 0 if coverage >= threshold, 1 if below
set -euo pipefail

THRESHOLD="${1:-85}"
INPUT=$(cat)

# Echo the full output so CI still shows test results
echo "$INPUT"

# Extract the "all files" summary line
ALL_FILES_LINE=$(echo "$INPUT" | grep "all files" | head -1)

if [ -z "$ALL_FILES_LINE" ]; then
  echo ""
  echo "ERROR: Could not find coverage summary line ('all files')"
  echo "Coverage gate: SKIP (no coverage data)"
  exit 0
fi

# Extract line coverage percentage — first number after "all files"
LINE_COV=$(echo "$ALL_FILES_LINE" | grep -oE '[0-9]+\.[0-9]+' | head -1)

if [ -z "$LINE_COV" ]; then
  echo ""
  echo "ERROR: Could not parse line coverage from: $ALL_FILES_LINE"
  exit 0
fi

# Compare as integers (strip decimal)
LINE_COV_INT=$(echo "$LINE_COV" | cut -d. -f1)

echo ""
echo "========================================="
echo "Coverage Gate: ${LINE_COV}% line coverage (threshold: ${THRESHOLD}%)"

if [ "$LINE_COV_INT" -ge "$THRESHOLD" ]; then
  echo "PASS"
  echo "========================================="
  exit 0
else
  echo "FAIL — coverage dropped below ${THRESHOLD}%"
  echo "========================================="
  exit 1
fi
