#!/bin/bash
# Admiral Framework — Shared jq Helper Functions (Q-01)
# Standardized jq patterns used across all hooks.
# Source this file in any hook: source "$PROJECT_DIR/admiral/lib/jq_helpers.sh"

# Extract a field from JSON with a default value.
# Usage: jq_get_field "$json" '.path.to.field' 'default'
jq_get_field() {
  local json="$1"
  local path="$2"
  local default="${3:-}"
  local result
  result=$(echo "$json" | jq -r "${path} // empty" 2>/dev/null) || true
  if [ -z "$result" ] || [ "$result" = "null" ]; then
    echo "$default"
  else
    echo "$result"
  fi
}

# Set a field in JSON, returning the updated JSON.
# Usage: updated=$(jq_set_field "$json" '.path.to.field' '"string_value"')
# Usage: updated=$(jq_set_field "$json" '.count' '42')
jq_set_field() {
  local json="$1"
  local path="$2"
  local value="$3"
  echo "$json" | jq "${path} = ${value}" 2>/dev/null || echo "$json"
}

# Append a value to a JSON array field.
# Usage: updated=$(jq_array_append "$json" '.items' '"new_item"')
jq_array_append() {
  local json="$1"
  local path="$2"
  local value="$3"
  echo "$json" | jq "${path} += [${value}]" 2>/dev/null || echo "$json"
}

# Validate that JSON string is parseable. Returns 0 if valid, 1 if not.
# Usage: if jq_validate "$json"; then ...
jq_validate() {
  local json="$1"
  echo "$json" | jq empty 2>/dev/null
}

# Extract tool_name from a hook payload with default "unknown".
# Usage: tool=$(jq_tool_name "$PAYLOAD")
jq_tool_name() {
  jq_get_field "$1" '.tool_name' 'unknown'
}

# Extract tool_input.file_path from a hook payload.
# Usage: path=$(jq_file_path "$PAYLOAD")
jq_file_path() {
  jq_get_field "$1" '.tool_input.file_path' ''
}

# Extract tool_input.command from a hook payload.
# Usage: cmd=$(jq_command "$PAYLOAD")
jq_command() {
  jq_get_field "$1" '.tool_input.command' ''
}

# Extract project_dir from session_state or fall back to env/script dir.
# Usage: dir=$(jq_project_dir "$PAYLOAD")
jq_project_dir() {
  local dir
  dir=$(jq_get_field "$1" '.session_state.project_dir' '')
  if [ -z "$dir" ]; then
    dir="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[1]}")/.." 2>/dev/null && pwd)}"
  fi
  echo "$dir"
}
