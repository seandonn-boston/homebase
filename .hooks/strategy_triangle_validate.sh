#!/bin/bash
# Admiral Framework — Strategy Triangle Validation Hook
# Runs at SessionStart to validate Ground Truth completeness.
#
# Behavior:
#   - Missing Ground Truth: emits warning (does not block — project may not use Admiral strategy yet)
#   - Incomplete Ground Truth: emits structured warning listing empty required fields
#   - Complete Ground Truth: silent pass
#
# Must complete in under 2 seconds.
#
# Exit codes: 0=pass (always — advisory only at this stage)
# Spec ref: Part 1 — Strategy Triangle
# SO ref: SO-15 (Pre-Work Validation)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"

# Look for ground-truth.yaml in standard locations
GT_PATH=""
for candidate in \
  "${PROJECT_DIR}/ground-truth.yaml" \
  "${PROJECT_DIR}/ground-truth.yml" \
  "${PROJECT_DIR}/admiral/ground-truth.yaml" \
  "${PROJECT_DIR}/.admiral/ground-truth.yaml"; do
  if [[ -f "${candidate}" ]]; then
    GT_PATH="${candidate}"
    break
  fi
done

STRATEGY_DIR="${PROJECT_DIR}/admiral/strategy"
VALIDATE_SCRIPT="${STRATEGY_DIR}/validate_ground_truth.sh"
VALIDATE_BOUNDARIES="${STRATEGY_DIR}/validate_boundaries.sh"
VALIDATE_LLM_LAST="${STRATEGY_DIR}/validate_llm_last.sh"
EVENT_LOG="${PROJECT_DIR}/.admiral/event_log.jsonl"

# Log validation result
log_strategy_event() {
  local status="$1"
  local detail="$2"
  jq -n --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg status "${status}" \
        --arg detail "${detail}" \
        --arg gt "${GT_PATH:-none}" \
        '{event: "strategy_triangle_validation", timestamp: $ts, status: $status, ground_truth: $gt, detail: $detail}' \
        >> "${EVENT_LOG}" 2>/dev/null || true
}

# No Ground Truth found
if [[ -z "${GT_PATH}" ]]; then
  log_strategy_event "no_ground_truth" "No ground-truth.yaml found in project"
  echo "STRATEGY: No Ground Truth document found. Run 'admiral/strategy/generate_ground_truth.sh' to create one."
  exit 0
fi

# Validate Ground Truth completeness
WARNINGS=""

if [[ -x "${VALIDATE_SCRIPT}" ]]; then
  VALIDATE_OUTPUT=$("${VALIDATE_SCRIPT}" "${GT_PATH}" 2>&1) || {
    # Validation failed — extract the summary
    EMPTY_COUNT=$(echo "${VALIDATE_OUTPUT}" | grep -c "EMPTY (required)" || true)
    WARNINGS="${WARNINGS}Ground Truth has ${EMPTY_COUNT} empty required field(s). "
  }
fi

# Check boundaries completeness
if [[ -x "${VALIDATE_BOUNDARIES}" ]]; then
  BOUNDARY_OUTPUT=$("${VALIDATE_BOUNDARIES}" "${GT_PATH}" 2>&1) || {
    MISSING_COUNT=$(echo "${BOUNDARY_OUTPUT}" | grep -c "MISSING (required)" || true)
    WARNINGS="${WARNINGS}Boundaries has ${MISSING_COUNT} missing required category(ies). "
  }
fi

# Check LLM-Last boundary
if [[ -x "${VALIDATE_LLM_LAST}" ]]; then
  LLM_OUTPUT=$("${VALIDATE_LLM_LAST}" "${GT_PATH}" 2>&1) || {
    WARNINGS="${WARNINGS}LLM-Last boundary not fully defined. "
  }
fi

if [[ -n "${WARNINGS}" ]]; then
  log_strategy_event "incomplete" "${WARNINGS}"
  echo "STRATEGY: Ground Truth found but incomplete — ${WARNINGS}"
else
  log_strategy_event "valid" "All strategy checks passed"
fi

exit 0
