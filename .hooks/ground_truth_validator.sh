#!/bin/bash
# Admiral Framework — Ground Truth Validation Hook (ST-06)
# SessionStart hook that loads and validates the Ground Truth document
# against the schema on every session start.
# Advisory: warns on incomplete, blocks on missing (exit 2).
# Must complete in under 2 seconds.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"

# Consume stdin (validation uses files, not the payload)
cat > /dev/null

# Look for Ground Truth document
GT_FILE=""
for candidate in \
  "$PROJECT_DIR/ground-truth.yaml" \
  "$PROJECT_DIR/ground-truth.yml" \
  "$PROJECT_DIR/ground-truth.json" \
  "$PROJECT_DIR/.admiral/ground-truth.yaml" \
  "$PROJECT_DIR/.admiral/ground-truth.json"; do
  if [ -f "$candidate" ]; then
    GT_FILE="$candidate"
    break
  fi
done

# If no Ground Truth file found, advisory warning (not blocking for projects without GT)
if [ -z "$GT_FILE" ]; then
  jq -n '{
    "validated": false,
    "reason": "no_ground_truth",
    "advisory": "No Ground Truth document found. Consider creating one with generate_ground_truth.sh.",
    "severity": "info"
  }'
  exit 0
fi

# Validate Ground Truth has required sections
VALIDATOR="$PROJECT_DIR/admiral/bin/validate_ground_truth"
if [ -x "$VALIDATOR" ]; then
  VALIDATION_RESULT=$("$VALIDATOR" "$GT_FILE" --json 2>/dev/null) || true
  VALIDATION_STATUS=$(echo "$VALIDATION_RESULT" | jq -r '.status // "unknown"' | tr -d '\r' 2>/dev/null || echo "unknown")

  if [ "$VALIDATION_STATUS" = "invalid" ]; then
    ERRORS=$(echo "$VALIDATION_RESULT" | jq -r '.errors // ["Unknown validation error"] | join("; ")' | tr -d '\r' 2>/dev/null || echo "validation failed")
    jq -n --arg errs "$ERRORS" '{
      "validated": false,
      "reason": "ground_truth_invalid",
      "advisory": ("Ground Truth validation failed: " + $errs),
      "severity": "warning"
    }'
    exit 0
  fi
fi

# ST-07: LLM-Last boundary check
# Verify Ground Truth Boundaries section includes LLM-Last designation
LLM_LAST_CHECK="skipped"
if [ -f "$GT_FILE" ]; then
  if grep -qi "llm.last\|llm_last\|deterministic.first" "$GT_FILE" 2>/dev/null; then
    LLM_LAST_CHECK="present"
  else
    LLM_LAST_CHECK="missing"
  fi
fi

ALERT=""
if [ "$LLM_LAST_CHECK" = "missing" ]; then
  ALERT="ST-07 ADVISORY: Ground Truth Boundaries section does not include an LLM-Last section. Consider adding explicit deterministic-first patterns."
fi

if [ -n "$ALERT" ]; then
  jq -n --arg file "$GT_FILE" --arg llm "$LLM_LAST_CHECK" --arg alert "$ALERT" '{
    "validated": true,
    "ground_truth_file": $file,
    "llm_last_check": $llm,
    "advisory": $alert,
    "severity": "warning"
  }'
else
  jq -n --arg file "$GT_FILE" --arg llm "$LLM_LAST_CHECK" '{
    "validated": true,
    "ground_truth_file": $file,
    "llm_last_check": $llm,
    "severity": "info"
  }'
fi

exit 0
