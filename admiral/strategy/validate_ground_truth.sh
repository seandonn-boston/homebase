#!/bin/bash
# validate_ground_truth.sh — Validate a Ground Truth document against the schema.
#
# Usage: validate_ground_truth.sh <ground-truth.yaml>
#
# Checks that all required fields are present and non-empty.
# Outputs a structured report of present, empty, and missing fields.
#
# Exit codes: 0=valid, 1=invalid (empty/missing required fields), 2=file error
# Spec ref: Part 1 — Strategy Triangle
# SO ref: SO-15 (Pre-Work Validation)

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: validate_ground_truth.sh <ground-truth.yaml>" >&2
  exit 2
fi

GT_FILE="$1"

if [[ ! -f "${GT_FILE}" ]]; then
  echo "ERROR: File not found: ${GT_FILE}" >&2
  exit 2
fi

# Require python3 with PyYAML for YAML processing
if ! python3 -c "import yaml" 2>/dev/null; then
  echo "ERROR: python3 with PyYAML required. Install: pip3 install pyyaml" >&2
  exit 2
fi

# Read a YAML field value. Returns empty string if missing.
read_field() {
  local field="$1"
  python3 -c "
import yaml
with open('${GT_FILE}') as f:
    doc = yaml.safe_load(f)
keys = '${field}'.lstrip('.').split('.')
val = doc
for k in keys:
    if isinstance(val, dict) and k in val:
        val = val[k]
    else:
        val = None
        break
if val is None or val == '' or val == []:
    print('')
elif isinstance(val, list):
    # Check if list contains only empty strings
    non_empty = [x for x in val if x and str(x).strip()]
    print('' if not non_empty else str(val))
else:
    print(str(val))
" 2>/dev/null || echo ""
}

# Check if a field value is effectively empty
is_empty() {
  local val="$1"
  [[ -z "${val}" || "${val}" == "null" || "${val}" == '""' || "${val}" == "''" ]]
}

ERRORS=0
WARNINGS=0
PRESENT=0

report_field() {
  local path="$1"
  local required="$2"
  local val
  val="$(read_field "${path}")"

  if is_empty "${val}"; then
    if [[ "${required}" == "required" ]]; then
      echo "  EMPTY (required): ${path}"
      ERRORS=$((ERRORS + 1))
    else
      echo "  EMPTY (optional): ${path}"
      WARNINGS=$((WARNINGS + 1))
    fi
  else
    PRESENT=$((PRESENT + 1))
  fi
}

echo "=== Admiral Ground Truth Validation ==="
echo "File: ${GT_FILE}"
echo ""

# Version check
echo "--- Schema ---"
report_field ".version" "required"

# Project metadata
echo "--- Project ---"
report_field ".project.name" "required"
report_field ".project.repository" "optional"
report_field ".project.created" "optional"
report_field ".project.last_reviewed" "optional"

# Mission vertex (required)
echo "--- Mission ---"
report_field ".mission.identity" "required"
report_field ".mission.success_state" "required"
report_field ".mission.stakeholders" "optional"
report_field ".mission.current_phase" "required"
report_field ".mission.pipeline_entry" "optional"

# Boundaries vertex (required)
echo "--- Boundaries ---"
report_field ".boundaries.non_goals.functional" "required"
report_field ".boundaries.non_goals.quality" "optional"
report_field ".boundaries.non_goals.architectural" "optional"
report_field ".boundaries.hard_constraints.tech_stack" "required"
report_field ".boundaries.hard_constraints.deadlines" "optional"
report_field ".boundaries.hard_constraints.compatibility" "optional"
report_field ".boundaries.hard_constraints.regulatory" "optional"
report_field ".boundaries.hard_constraints.protocol_scope" "optional"
report_field ".boundaries.resource_budgets.token_budget" "required"
report_field ".boundaries.resource_budgets.time_budget" "optional"
report_field ".boundaries.resource_budgets.tool_call_limits" "optional"
report_field ".boundaries.resource_budgets.scope_boundary" "required"
report_field ".boundaries.resource_budgets.quality_floor" "required"
report_field ".boundaries.llm_last.deterministic" "optional"
report_field ".boundaries.llm_last.llm_judgment" "optional"

# Success Criteria vertex
echo "--- Success Criteria ---"
report_field ".success_criteria.functional" "required"
report_field ".success_criteria.quality" "optional"
report_field ".success_criteria.completeness" "optional"
report_field ".success_criteria.negative" "optional"
report_field ".success_criteria.failure_guidance" "optional"
report_field ".success_criteria.judgment_boundaries" "optional"

# Summary
echo ""
echo "=== Summary ==="
echo "Present: ${PRESENT}"
echo "Empty required: ${ERRORS}"
echo "Empty optional: ${WARNINGS}"

if [[ ${ERRORS} -gt 0 ]]; then
  echo ""
  echo "RESULT: INVALID — ${ERRORS} required field(s) are empty."
  echo "Fill in all required fields before fleet deployment."
  exit 1
else
  echo ""
  echo "RESULT: VALID — All required fields are present."
  if [[ ${WARNINGS} -gt 0 ]]; then
    echo "NOTE: ${WARNINGS} optional field(s) are empty. Consider filling them in."
  fi
  exit 0
fi
