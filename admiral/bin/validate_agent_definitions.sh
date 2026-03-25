#!/bin/bash
# validate_agent_definitions.sh — Agent Definition Schema Validator (F-12b)
# Validates agent definition JSON files against agent-definition.v1.schema.json.
# Checks:
#   1. JSON validity
#   2. Required fields present (agent_id, version, role, tools, paths, authority, standing_orders)
#   3. Tool list disjointness (allowed ∩ denied = ∅)
#   4. Valid model tier
#   5. Valid role
#   6. Path consistency (denied overrides write)
#   7. agent_id matches filename
#   8. Version format (semver)
#   9. Standing orders format
#
# Usage: validate_agent_definitions.sh [file_or_dir]
# If no argument, validates all .json files in fleet/agents/definitions/
# Exit 0 = all valid, 1 = errors found
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCHEMA_FILE="$PROJECT_ROOT/admiral/schemas/agent-definition.v1.schema.json"
DEFAULT_DIR="$PROJECT_ROOT/fleet/agents/definitions"

# Counters
TOTAL=0
PASSED=0
FAILED=0
ERRORS_LIST=""

# Validate a single agent definition file
validate_file() {
  local file="$1"
  local filename
  filename=$(basename "$file" .json)
  TOTAL=$((TOTAL + 1))

  local file_errors=""

  # 1. Valid JSON
  if ! jq empty "$file" 2>/dev/null; then
    file_errors+="  - Invalid JSON\n"
    FAILED=$((FAILED + 1))
    ERRORS_LIST+="$file:\n$file_errors\n"
    return
  fi

  local content
  content=$(cat "$file")

  # 2. Required fields
  for field in agent_id version role tools paths authority standing_orders; do
    if ! echo "$content" | jq -e "has(\"$field\")" >/dev/null 2>&1; then
      file_errors+="  - Missing required field: $field\n"
    fi
  done

  # 3. agent_id matches filename
  local agent_id
  agent_id=$(echo "$content" | jq -r '.agent_id // ""')
  if [ -n "$agent_id" ] && [ "$agent_id" != "$filename" ]; then
    file_errors+="  - agent_id '$agent_id' does not match filename '$filename'\n"
  fi

  # 4. agent_id format
  if [ -n "$agent_id" ] && ! echo "$agent_id" | grep -qE '^[a-z][a-z0-9-]*$'; then
    file_errors+="  - agent_id '$agent_id' does not match pattern ^[a-z][a-z0-9-]*$\n"
  fi

  # 5. Version format (semver)
  local version
  version=$(echo "$content" | jq -r '.version // ""')
  if [ -n "$version" ] && ! echo "$version" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
    file_errors+="  - version '$version' is not valid semver\n"
  fi

  # 6. Valid role
  local role
  role=$(echo "$content" | jq -r '.role // ""')
  local valid_roles="orchestrator architect implementer qa security triage curator custom"
  if [ -n "$role" ]; then
    local role_valid="false"
    for r in $valid_roles; do
      if [ "$role" = "$r" ]; then
        role_valid="true"
        break
      fi
    done
    if [ "$role_valid" = "false" ]; then
      file_errors+="  - Invalid role: '$role'\n"
    fi
  fi

  # 7. Valid model tier
  local model_tier
  model_tier=$(echo "$content" | jq -r '.model_tier // ""')
  local valid_tiers="tier1_flagship tier2_workhorse tier3_utility tier4_economy"
  if [ -n "$model_tier" ]; then
    local tier_valid="false"
    for t in $valid_tiers; do
      if [ "$model_tier" = "$t" ]; then
        tier_valid="true"
        break
      fi
    done
    if [ "$tier_valid" = "false" ]; then
      file_errors+="  - Invalid model_tier: '$model_tier'\n"
    fi
  fi

  # 8. Tool list disjointness (allowed ∩ denied = ∅)
  local overlap
  overlap=$(echo "$content" | jq -r '
    (.tools.allowed // []) as $a |
    (.tools.denied // []) as $d |
    [$a[] | select(. as $x | $d | index($x))] | join(", ")
  ' 2>/dev/null || echo "")
  if [ -n "$overlap" ]; then
    file_errors+="  - Tool overlap (in both allowed and denied): $overlap\n"
  fi

  # 9. Path consistency — check for paths in both write and denied
  local path_overlap
  path_overlap=$(echo "$content" | jq -r '
    (.paths.write // []) as $w |
    (.paths.denied // []) as $d |
    [$w[] | select(. as $x | $d | index($x))] | join(", ")
  ' 2>/dev/null || echo "")
  if [ -n "$path_overlap" ]; then
    file_errors+="  - Path in both write and denied (denied wins): $path_overlap\n"
  fi

  # 10. Required tool sub-fields
  if ! echo "$content" | jq -e '.tools | has("allowed")' >/dev/null 2>&1; then
    file_errors+="  - Missing tools.allowed array\n"
  fi

  # 11. Required path sub-fields
  for pf in read write denied; do
    if ! echo "$content" | jq -e ".paths | has(\"$pf\")" >/dev/null 2>&1; then
      file_errors+="  - Missing paths.$pf array\n"
    fi
  done

  # 12. Required authority sub-fields
  for af in autonomous propose escalate; do
    if ! echo "$content" | jq -e ".authority | has(\"$af\")" >/dev/null 2>&1; then
      file_errors+="  - Missing authority.$af array\n"
    fi
  done

  # 13. Standing orders format
  local so_type
  so_type=$(echo "$content" | jq -r '.standing_orders | type' 2>/dev/null || echo "null")
  if [ "$so_type" = "string" ]; then
    local so_val
    so_val=$(echo "$content" | jq -r '.standing_orders')
    if [ "$so_val" != "all" ]; then
      file_errors+="  - standing_orders string must be 'all', got '$so_val'\n"
    fi
  elif [ "$so_type" = "array" ]; then
    local bad_so
    bad_so=$(echo "$content" | jq -r '.standing_orders[] | select(test("^SO-\\d{2}$") | not)' 2>/dev/null || echo "")
    if [ -n "$bad_so" ]; then
      file_errors+="  - Invalid standing_orders entries: $bad_so\n"
    fi
  elif [ "$so_type" != "null" ]; then
    file_errors+="  - standing_orders must be 'all' or array of SO-XX patterns\n"
  fi

  # Report
  if [ -n "$file_errors" ]; then
    FAILED=$((FAILED + 1))
    ERRORS_LIST+="$file:\n$file_errors"
  else
    PASSED=$((PASSED + 1))
  fi
}

# Determine what to validate
TARGET="${1:-$DEFAULT_DIR}"

if [ -f "$TARGET" ]; then
  validate_file "$TARGET"
elif [ -d "$TARGET" ]; then
  shopt -s nullglob
  FILES=("$TARGET"/*.json)
  shopt -u nullglob
  if [ ${#FILES[@]} -eq 0 ]; then
    echo "No .json files found in $TARGET"
    exit 0
  fi
  for f in "${FILES[@]}"; do
    validate_file "$f"
  done
else
  echo "ERROR: $TARGET is not a file or directory" >&2
  exit 1
fi

# Output report
echo "=== Agent Definition Validation ==="
echo "Total: $TOTAL | Passed: $PASSED | Failed: $FAILED"

if [ -n "$ERRORS_LIST" ]; then
  echo ""
  echo "Errors:"
  printf "%b" "$ERRORS_LIST"
fi

# JSON report
REPORT_DIR="$TARGET"
if [ -f "$TARGET" ]; then
  REPORT_DIR=$(dirname "$TARGET")
fi
jq -n --argjson total "$TOTAL" --argjson passed "$PASSED" --argjson failed "$FAILED" \
  '{total: $total, passed: $passed, failed: $failed, valid: ($failed == 0)}' \
  > "${REPORT_DIR%/}/validation-report.json" 2>/dev/null || true

[ "$FAILED" -eq 0 ] && exit 0 || exit 1
