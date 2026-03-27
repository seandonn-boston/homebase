#!/bin/bash
# Admiral Framework — Shared jq Helpers (Q-01)
# Common jq patterns extracted into reusable functions.
# All functions are safe for use in hook pipelines (fail-open where noted).

# ─── Field Extraction ────────────────────────────────────────────────

# Extract a field from JSON with a default value.
# Usage: jq_get "$json" '.field.nested' 'default_value'
# Returns: field value (raw string), or default if missing/null.
jq_get() {
  local json="$1"
  local field="$2"
  local default="${3:-}"
  local result
  result=$(printf '%s' "$json" | jq -r "$field // empty" 2>/dev/null) || result=""
  if [ -z "$result" ]; then
    printf '%s' "$default"
  else
    printf '%s' "$result"
  fi
}

# Extract a field using dot-notation path (e.g., "hook_state.loop_detector.total_errors").
# Usage: jq_get_path "$json" 'hook_state.loop_detector.total_errors' '0'
# Returns: field value (raw string), or default if missing/null.
jq_get_path() {
  local json="$1"
  local path="$2"
  local default="${3:-}"
  local result
  result=$(printf '%s' "$json" | jq -r --arg p "$path" \
    'getpath($p | split(".") | map(select(. != ""))) // empty' 2>/dev/null) || result=""
  if [ -z "$result" ]; then
    printf '%s' "$default"
  else
    printf '%s' "$result"
  fi
}

# ─── Field Mutation ──────────────────────────────────────────────────

# Set a top-level or nested field in a JSON object.
# Value is treated as raw JSON (use jq_set_string for string values).
# Usage: jq_set "$json" '.hook_state.component' '{"count": 1}'
# Returns: updated JSON on stdout.
jq_set() {
  local json="$1"
  local field="$2"
  local value="$3"
  printf '%s' "$json" | jq -c --argjson v "$value" "$field = \$v" 2>/dev/null || printf '%s' "$json"
}

# Set a field to a string value (handles quoting automatically).
# Usage: jq_set_string "$json" '.name' 'hello world'
# Returns: updated JSON on stdout.
jq_set_string() {
  local json="$1"
  local field="$2"
  local value="$3"
  printf '%s' "$json" | jq -c --arg v "$value" "$field = \$v" 2>/dev/null || printf '%s' "$json"
}

# Increment a numeric field by an amount (default 1).
# Usage: jq_increment "$json" '.tool_call_count' 1
# Returns: updated JSON on stdout.
jq_increment() {
  local json="$1"
  local field="$2"
  local amount="${3:-1}"
  printf '%s' "$json" | jq -c --argjson amt "$amount" "$field = (($field // 0) + \$amt)" 2>/dev/null || printf '%s' "$json"
}

# ─── Object Operations ───────────────────────────────────────────────

# Merge/enrich a JSON object with an additional key-value pair.
# Value is treated as raw JSON.
# Usage: jq_merge "$json" 'session_state' "$state_json"
# Returns: enriched JSON on stdout.
jq_merge() {
  local json="$1"
  local key="$2"
  local value="$3"
  printf '%s' "$json" | jq -c --arg key "$key" --argjson v "$value" '. + {($key): $v}' 2>/dev/null || printf '%s' "$json"
}

# Build a JSON object from key-value pairs.
# Pairs alternate: key1 value1 key2 value2 ...
# All values are treated as strings. Use jq_build_json for mixed types.
# Usage: jq_build "name" "alice" "role" "admin"
# Returns: {"name":"alice","role":"admin"}
jq_build() {
  local args=()
  local filter="{"
  local i=0
  while [ $# -ge 2 ]; do
    local key="$1"
    local val="$2"
    shift 2
    if [ $i -gt 0 ]; then
      filter="${filter},"
    fi
    filter="${filter} (\$k${i}): \$v${i}"
    args+=(--arg "k${i}" "$key" --arg "v${i}" "$val")
    i=$((i + 1))
  done
  filter="${filter} }"
  if [ ${#args[@]} -eq 0 ]; then
    echo '{}'
  else
    jq -nc "${args[@]}" "$filter" 2>/dev/null || echo '{}'
  fi
}

# ─── Array Operations ────────────────────────────────────────────────

# Append a string value to a JSON array.
# Usage: jq_array_append "$array_json" 'new item'
# Returns: updated array on stdout.
jq_array_append() {
  local array="$1"
  local value="$2"
  printf '%s' "$array" | jq -c --arg v "$value" '. + [$v]' 2>/dev/null || printf '%s' "$array"
}

# Append a raw JSON value to a JSON array.
# Usage: jq_array_append_json "$array_json" '{"key": "val"}'
# Returns: updated array on stdout.
jq_array_append_json() {
  local array="$1"
  local value="$2"
  printf '%s' "$array" | jq -c --argjson v "$value" '. + [$v]' 2>/dev/null || printf '%s' "$array"
}

# Get the length of a JSON array or object. Returns 0 on error.
# Usage: jq_length "$json"
jq_length() {
  local json="$1"
  local result
  result=$(printf '%s' "$json" | jq 'length' 2>/dev/null) || result="0"
  printf '%s' "${result:-0}"
}

# ─── Validation ──────────────────────────────────────────────────────

# Check if a string is valid JSON. Returns 0 if valid, 1 if not.
# Usage: if jq_is_valid "$input"; then ...
jq_is_valid() {
  local input="$1"
  printf '%s' "$input" | jq empty 2>/dev/null
}

# ─── String Conversion ──────────────────────────────────────────────

# Convert a raw string to a JSON-encoded string value.
# Usage: jq_to_json_string "hello \"world\""
# Returns: "hello \"world\"" (properly escaped JSON string)
jq_to_json_string() {
  local input="$1"
  printf '%s' "$input" | jq -Rs '.' 2>/dev/null || echo '""'
}
