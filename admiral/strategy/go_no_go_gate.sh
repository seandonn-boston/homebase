#!/bin/bash
# go_no_go_gate.sh — Hard gate preventing fleet deployment without strategy.
#
# Usage: go_no_go_gate.sh <project_root> [ground_truth_path] [--override "<justification>"]
#
# Runs readiness_assess.sh and blocks deployment based on the result:
#   Ready          → Permits any profile. Exit 0.
#   Partially Ready → Permits Starter profile only. Exit 0 with warning.
#   Not Ready      → Blocks deployment. Exit 1.
#
# The --override flag allows an Admiral (human) to bypass a Not Ready block.
# Overrides are logged to override_log.jsonl for audit.
#
# Exit codes: 0=go, 1=no-go, 2=usage error
# Spec ref: Part 1 — Strategy Triangle (Go/No-Go gate)
# SO ref: SO-15 (Pre-Work Validation)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OVERRIDE_LOG="${SCRIPT_DIR}/override_log.jsonl"

# Parse arguments
PROJECT_ROOT=""
GT_PATH=""
OVERRIDE_JUSTIFICATION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --override)
      if [[ $# -lt 2 ]]; then
        echo "ERROR: --override requires a justification string" >&2
        exit 2
      fi
      OVERRIDE_JUSTIFICATION="$2"
      shift 2
      ;;
    *)
      if [[ -z "${PROJECT_ROOT}" ]]; then
        PROJECT_ROOT="$1"
      elif [[ -z "${GT_PATH}" ]]; then
        GT_PATH="$1"
      else
        echo "ERROR: Unexpected argument: $1" >&2
        exit 2
      fi
      shift
      ;;
  esac
done

if [[ -z "${PROJECT_ROOT}" ]]; then
  echo "Usage: go_no_go_gate.sh <project_root> [ground_truth_path] [--override \"<justification>\"]" >&2
  exit 2
fi

GT_ARGS=("${PROJECT_ROOT}")
if [[ -n "${GT_PATH}" ]]; then
  GT_ARGS+=("${GT_PATH}")
fi

# Run readiness assessment and capture exit code
set +e
ASSESS_OUTPUT=$("${SCRIPT_DIR}/readiness_assess.sh" "${GT_ARGS[@]}" 2>&1)
READINESS_EXIT=$?
set -e

echo "${ASSESS_OUTPUT}"
echo ""
echo "=== Go/No-Go Decision ==="

case ${READINESS_EXIT} in
  0)
    echo "DECISION: GO"
    echo "All checks passed. Fleet deployment permitted at any profile."
    exit 0
    ;;
  1)
    echo "DECISION: GO (Restricted)"
    echo "Partially Ready. Fleet deployment permitted at Starter profile ONLY."
    echo "Enforcement limited to universal constraints (budget, loops, basic prohibitions)."
    echo "No convention enforcement until conventions are documented."
    exit 0
    ;;
  2)
    if [[ -n "${OVERRIDE_JUSTIFICATION}" ]]; then
      # Log the override
      if command -v jq &>/dev/null; then
        jq -n \
          --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
          --arg project "${PROJECT_ROOT}" \
          --arg justification "${OVERRIDE_JUSTIFICATION}" \
          --arg user "$(whoami 2>/dev/null || echo unknown)" \
          '{timestamp: $ts, event: "go_no_go_override", project: $project, justification: $justification, user: $user}' \
          >> "${OVERRIDE_LOG}"
      else
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"go_no_go_override\",\"project\":\"${PROJECT_ROOT}\",\"justification\":\"${OVERRIDE_JUSTIFICATION}\",\"user\":\"$(whoami 2>/dev/null || echo unknown)\"}" \
          >> "${OVERRIDE_LOG}"
      fi
      echo "DECISION: GO (Override)"
      echo "Admiral override applied. Justification logged to ${OVERRIDE_LOG}."
      echo "WARNING: Project is Not Ready. Proceed with extreme caution."
      exit 0
    else
      echo "DECISION: NO-GO"
      echo "Project is Not Ready. Fleet deployment blocked."
      echo ""
      echo "To override (requires Admiral authority):"
      echo "  go_no_go_gate.sh ${PROJECT_ROOT} --override \"<justification>\""
      exit 1
    fi
    ;;
  *)
    echo "DECISION: ERROR"
    echo "Readiness assessment failed with unexpected exit code: ${READINESS_EXIT}"
    exit 1
    ;;
esac
