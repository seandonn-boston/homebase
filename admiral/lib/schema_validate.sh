#!/bin/bash
# Admiral Framework — Lightweight JSON Schema Validator
# Validates JSON data against a JSON Schema using jq.
#
# Usage: echo '{"tool_name":"Bash"}' | schema_validate.sh /path/to/schema.json
#
# Checks:
#   - required fields exist
#   - type constraints for top-level properties
#
# Exit codes:
#   0 — VALID (or validator itself errored — fail-open)
#   1 — INVALID (data violates schema)
#
# Output: field-by-field report to stdout

set -euo pipefail

SCHEMA_FILE="${1:-}"

if [ -z "$SCHEMA_FILE" ]; then
  echo "Usage: schema_validate.sh <schema-file> < json-data" >&2
  echo "VALID"
  exit 0
fi

if [ ! -f "$SCHEMA_FILE" ]; then
  echo "Warning: schema file not found: $SCHEMA_FILE" >&2
  echo "VALID"
  exit 0
fi

# Read JSON data from stdin
JSON_DATA="$(cat)"

if [ -z "$JSON_DATA" ]; then
  echo "Warning: empty input" >&2
  echo "VALID"
  exit 0
fi

# Fail-open wrapper: if anything inside errors, exit 0
_validate() {
  local schema_file="$1"
  local json_data="$2"

  # Parse schema — extract required fields and property types
  local schema
  schema="$(cat "$schema_file" 2>/dev/null)" || { echo "VALID"; return 0; }

  # Verify both are valid JSON
  if ! echo "$schema" | jq empty 2>/dev/null; then
    echo "Warning: invalid schema JSON" >&2
    echo "VALID"
    return 0
  fi
  if ! echo "$json_data" | jq empty 2>/dev/null; then
    echo "INVALID"
    echo "  error: input is not valid JSON"
    return 1
  fi

  local has_errors=0

  # Check top-level type constraint
  local expected_type
  expected_type="$(echo "$schema" | jq -r '.type // empty')"
  if [ -n "$expected_type" ]; then
    local actual_type
    actual_type="$(echo "$json_data" | jq -r 'type')"
    if [ "$actual_type" != "$expected_type" ]; then
      echo "INVALID"
      echo "  error: expected top-level type \"$expected_type\", got \"$actual_type\""
      return 1
    fi
  fi

  # Check required fields
  local required_fields
  required_fields="$(echo "$schema" | jq -r '.required // [] | .[]' 2>/dev/null)"
  if [ -n "$required_fields" ]; then
    while IFS= read -r field; do
      local field_exists
      field_exists="$(echo "$json_data" | jq --arg f "$field" 'has($f)')"
      if [ "$field_exists" = "false" ]; then
        if [ "$has_errors" -eq 0 ]; then
          echo "INVALID"
          has_errors=1
        fi
        echo "  missing required field: $field"
      fi
    done <<< "$required_fields"
  fi

  # Check type constraints for top-level properties
  local properties_json
  properties_json="$(echo "$schema" | jq -r '.properties // {} | keys[]' 2>/dev/null)"
  if [ -n "$properties_json" ]; then
    while IFS= read -r prop; do
      # Skip if property not present in data (only required fields are enforced above)
      local prop_exists
      prop_exists="$(echo "$json_data" | jq --arg p "$prop" 'has($p)')"
      if [ "$prop_exists" = "false" ]; then
        echo "  field \"$prop\": not present (optional, ok)"
        continue
      fi

      # Get expected type from schema
      local expected_prop_type
      expected_prop_type="$(echo "$schema" | jq -r --arg p "$prop" '.properties[$p].type // empty')"
      if [ -z "$expected_prop_type" ]; then
        echo "  field \"$prop\": present (no type constraint)"
        continue
      fi

      # Get actual type from data
      local actual_prop_type
      actual_prop_type="$(echo "$json_data" | jq -r --arg p "$prop" '.[$p] | type')"

      # Map JSON types: jq uses "number" for both integer and number
      if [ "$expected_prop_type" = "integer" ] && [ "$actual_prop_type" = "number" ]; then
        # Check it is actually an integer
        local is_int
        is_int="$(echo "$json_data" | jq --arg p "$prop" '.[$p] | . == (. | floor)')"
        if [ "$is_int" = "true" ]; then
          echo "  field \"$prop\": ok ($expected_prop_type)"
          continue
        fi
      fi

      if [ "$actual_prop_type" = "$expected_prop_type" ]; then
        echo "  field \"$prop\": ok ($expected_prop_type)"
      else
        if [ "$has_errors" -eq 0 ]; then
          echo "INVALID"
          has_errors=1
        fi
        echo "  field \"$prop\": expected type \"$expected_prop_type\", got \"$actual_prop_type\""
      fi
    done <<< "$properties_json"
  fi

  if [ "$has_errors" -eq 0 ]; then
    echo "VALID"
    return 0
  fi
  return 1
}

# Fail-open: if the validator itself errors, report VALID
if ! _validate "$SCHEMA_FILE" "$JSON_DATA"; then
  exit 1
fi
exit 0
