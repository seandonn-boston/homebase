#!/bin/bash
# Admiral Framework — Shared jq Helpers (Q-01)
# Common jq patterns extracted from hooks into a single reusable library.
#
# Purpose: Eliminate repeated inline jq invocations across hooks and adapters.
#          Centralizes JSON handling to reduce parsing error surface area.
#
# SO reference: Supports SO-12 (Zero-Trust) via consistent, validated JSON ops.
# Dependencies: jq (>= 1.6)
#
# Usage: source "$PROJECT_DIR/admiral/lib/jq_helpers.sh"
#        Do NOT execute directly.
#
# All functions follow fail-open philosophy (ADR-004):
#   Invalid input returns sensible defaults rather than crashing.

set -euo pipefail

# Guard: require jq
if ! command -v jq &>/dev/null; then
  echo '{"level":"ERROR","component":"jq_helpers","message":"jq is not installed or not in PATH"}' >&2
  # Fail-open: define stubs so sourcing hooks don't crash
  jq_get_field()    { echo "${3:-null}"; }
  jq_set_field()    { echo "$1"; }
  jq_array_append() { echo "$1"; }
  jq_validate()     { return 1; }
  return 0 2>/dev/null || exit 0
fi

# ---------------------------------------------------------------------------
# jq_get_field — safely extract a field from JSON with a default value
#
# Usage: jq_get_field "$JSON" ".path.to.field" "default_value"
#        jq_get_field "$PAYLOAD" ".tool_name" "unknown"
#
# Arguments:
#   $1 — JSON string
#   $2 — jq field path (e.g. ".hook_state.loop_detector.total_errors")
#   $3 — default value returned when field is null/missing (default: "null")
#
# Output: the extracted value (raw, unquoted via jq -r) on stdout
# ---------------------------------------------------------------------------
jq_get_field() {
  local json="${1:-"{}"}"
  local path="${2:-.}"
  local default="${3:-null}"

  local result
  result=$(echo "$json" | jq -r "${path} // \"${default}\"" 2>/dev/null) || {
    echo "$default"
    return 0
  }

  # If jq returned empty and we have a non-null default, use the default
  if [ -z "$result" ] && [ "$default" != "null" ]; then
    result="$default"
  fi

  echo "$result"
}

# ---------------------------------------------------------------------------
# jq_set_field — set a field in a JSON object
#
# Usage: jq_set_field "$JSON" ".path.to.field" '"string_value"'
#        jq_set_field "$JSON" ".count" '42'
#        jq_set_field "$JSON" ".enabled" 'true'
#
# Arguments:
#   $1 — JSON string (the object to modify)
#   $2 — jq field path
#   $3 — value to set (must be valid JSON: quoted string, number, bool, etc.)
#
# Output: modified JSON on stdout. On error, returns original JSON (fail-open).
# ---------------------------------------------------------------------------
jq_set_field() {
  local json="${1:-"{}"}"
  local path="${2:-.}"
  local value="${3:-null}"

  local result
  result=$(echo "$json" | jq --argjson v "$value" "${path} = \$v" 2>/dev/null) || {
    echo "$json"
    return 0
  }

  echo "$result"
}

# ---------------------------------------------------------------------------
# jq_array_append — append an item to a JSON array field
#
# Usage: jq_array_append "$JSON" ".path.to.array" '"new_item"'
#        jq_array_append "$STATE" ".context.standing_context_present" '"SO-01"'
#
# Arguments:
#   $1 — JSON string containing the array
#   $2 — jq path to the array field
#   $3 — item to append (must be valid JSON)
#
# Output: modified JSON on stdout. On error, returns original JSON (fail-open).
#         If the target field is null/missing, creates a new array with the item.
# ---------------------------------------------------------------------------
jq_array_append() {
  local json="${1:-"{}"}"
  local path="${2:-.}"
  local item="${3:-null}"

  local result
  result=$(echo "$json" | jq --argjson v "$item" \
    "if ${path} then ${path} += [\$v] else ${path} = [\$v] end" 2>/dev/null) || {
    echo "$json"
    return 0
  }

  echo "$result"
}

# ---------------------------------------------------------------------------
# jq_validate — check if a string is valid JSON
#
# Usage: jq_validate "$STRING"
#        if jq_validate "$input"; then echo "valid"; fi
#
# Arguments:
#   $1 — string to validate
#
# Returns: 0 if valid JSON, 1 otherwise. No output on stdout.
# ---------------------------------------------------------------------------
jq_validate() {
  local input="${1:-}"

  if [ -z "$input" ]; then
    return 1
  fi

  echo "$input" | jq empty 2>/dev/null
}
