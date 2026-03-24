#!/bin/bash
# Admiral Framework — JSON Schema Validation Library
# Lightweight jq-based schema validation for hook payloads.
# Fail-open by design (ADR-004): validation failures produce warnings, never block.
#
# Usage:
#   source admiral/lib/schema_validate.sh
#   validate_hook_payload "pre_tool_use" "$PAYLOAD"
#   # Returns: 0=valid, 1=invalid (warning emitted), never blocks

SCHEMA_DIR="${SCHEMA_DIR:-${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}/admiral/schemas}"

# Validate a JSON string has required fields from a schema.
# Uses jq to check required fields exist and have correct types.
# Returns 0 if valid, 1 if invalid. Never exits the caller.
validate_hook_payload() {
  local hook_type="$1"
  local payload="$2"

  # Map hook type to schema file
  local schema_file=""
  case "$hook_type" in
    pre_tool_use)  schema_file="$SCHEMA_DIR/hook-payload-pre-tool-use.v1.schema.json" ;;
    post_tool_use) schema_file="$SCHEMA_DIR/hook-payload-post-tool-use.v1.schema.json" ;;
    session_start) schema_file="$SCHEMA_DIR/hook-payload-session-start.v1.schema.json" ;;
    *)
      # Unknown hook type — fail-open, no validation
      return 0
      ;;
  esac

  # If schema file doesn't exist, fail-open
  if [ ! -f "$schema_file" ]; then
    return 0
  fi

  # Validate payload is valid JSON
  if ! echo "$payload" | jq empty 2>/dev/null; then
    echo "[schema_validate] WARNING: Payload is not valid JSON for $hook_type" >&2
    return 1
  fi

  # Extract required fields from schema
  local required_fields
  required_fields=$(jq -r '.required // [] | .[]' "$schema_file" 2>/dev/null)

  # Check each required field exists
  local missing=()
  for field in $required_fields; do
    local has_field
    has_field=$(echo "$payload" | jq --arg f "$field" 'has($f)' 2>/dev/null)
    if [ "$has_field" != "true" ]; then
      missing+=("$field")
    fi
  done

  if [ ${#missing[@]} -gt 0 ]; then
    echo "[schema_validate] WARNING: $hook_type payload missing required fields: ${missing[*]}" >&2
    return 1
  fi

  # Check types of required fields against schema
  local errors=()
  for field in $required_fields; do
    local expected_type
    expected_type=$(jq -r --arg f "$field" '.properties[$f].type // "any"' "$schema_file" 2>/dev/null)

    if [ "$expected_type" = "any" ]; then
      continue
    fi

    local actual_type
    actual_type=$(echo "$payload" | jq -r --arg f "$field" '.[$f] | type' 2>/dev/null)

    # Handle array type definitions (e.g., ["string", "null"])
    if echo "$expected_type" | jq -e 'type == "array"' >/dev/null 2>&1; then
      # Schema allows multiple types — check if actual matches any
      local matches
      matches=$(echo "$expected_type" | jq --arg actual "$actual_type" '[.[] | select(. == $actual)] | length' 2>/dev/null)
      if [ "$matches" = "0" ]; then
        errors+=("$field: expected one of $expected_type, got $actual_type")
      fi
    elif [ "$actual_type" != "$expected_type" ]; then
      errors+=("$field: expected $expected_type, got $actual_type")
    fi
  done

  if [ ${#errors[@]} -gt 0 ]; then
    echo "[schema_validate] WARNING: $hook_type payload type errors: ${errors[*]}" >&2
    return 1
  fi

  return 0
}
