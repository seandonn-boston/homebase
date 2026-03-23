#!/usr/bin/env bash
# admiral/lib/jq_helpers.sh — Shared jq helper functions
#
# Provides standardized jq operations used across all hooks:
#   jq_get_field    — Extract field with default value
#   jq_set_field    — Set field in JSON object
#   jq_array_append — Append element to JSON array
#   jq_validate     — Validate JSON string
#   jq_enrich       — Merge session state into payload
#   jq_build_output — Construct hook output JSON
#   jq_read_config  — Read config value with fallback

set -euo pipefail

# Extract a field from JSON with a default value.
# Usage: echo "$json" | jq_get_field '.path.to.field' 'default_value'
jq_get_field() {
  local field="$1"
  local default="${2:-}"
  jq -r "${field} // \"${default}\"" 2>/dev/null || echo "$default"
}

# Set a field in a JSON object (string value).
# Usage: echo "$json" | jq_set_field '.path.field' 'string_value'
jq_set_field() {
  local field="$1"
  local value="$2"
  jq --arg v "$value" "${field} = \$v" 2>/dev/null
}

# Set a field in a JSON object (numeric/boolean/object value).
# Usage: echo "$json" | jq_set_field_raw '.path.field' '42'
jq_set_field_raw() {
  local field="$1"
  local value="$2"
  jq --argjson v "$value" "${field} = \$v" 2>/dev/null
}

# Append an element to a JSON array at the given path.
# Usage: echo "$json" | jq_array_append '.path.array' '"new_element"'
jq_array_append() {
  local path="$1"
  local element="$2"
  jq --argjson e "$element" "(${path}) += [\$e]" 2>/dev/null
}

# Validate that input is valid JSON.
# Returns 0 if valid, 1 if invalid.
# Usage: echo "$data" | jq_validate
jq_validate() {
  jq empty 2>/dev/null
}

# Enrich a payload with session state.
# Usage: echo "$payload" | jq_enrich "$session_state"
jq_enrich() {
  local state="$1"
  jq --argjson state "$state" '. + {session_state: $state}' 2>/dev/null
}

# Build hook output JSON with hook_state and optional alert.
# Usage: jq_build_output 'hook_name' "$hook_state_json" "$alert_message"
jq_build_output() {
  local hook_name="$1"
  local hook_state="$2"
  local alert="${3:-}"
  if [ -n "$alert" ]; then
    jq -cn \
      --arg name "$hook_name" \
      --argjson state "$hook_state" \
      --arg alert "$alert" \
      '{hook_state: {($name): $state}, alert: $alert}'
  else
    jq -cn \
      --arg name "$hook_name" \
      --argjson state "$hook_state" \
      '{hook_state: {($name): $state}}'
  fi
}

# Read a config value from a JSON file with fallback.
# Usage: jq_read_config "$config_file" '.path.to.value' 'default'
jq_read_config() {
  local config_file="$1"
  local field="$2"
  local default="${3:-}"
  if [ -f "$config_file" ]; then
    local val
    val=$(jq -r "${field} // \"${default}\"" "$config_file" 2>/dev/null) || val="$default"
    if [ -z "$val" ] || [ "$val" = "null" ]; then
      echo "$default"
    else
      echo "$val"
    fi
  else
    echo "$default"
  fi
}
