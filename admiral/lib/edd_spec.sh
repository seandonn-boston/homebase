#!/bin/bash
# Admiral Framework — EDD Evaluation Spec Library (EDD-01)
# Functions for reading, validating, and querying evaluation specs.
# Evaluation specs define a task's Definition of Done as machine-readable checks.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

# Source jq helpers if available
if [ -f "$SCRIPT_DIR/jq_helpers.sh" ]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/jq_helpers.sh"
fi

EDD_SPECS_DIR="${PROJECT_DIR}/.admiral/edd-specs"

# Ensure the specs directory exists
edd_ensure_dir() {
  mkdir -p "$EDD_SPECS_DIR"
}

# Get the spec file path for a task ID
# Usage: edd_spec_path "Q-01"
# Returns: path to the spec file
edd_spec_path() {
  local task_id="$1"
  # Reject path traversal and unsafe characters
  if ! printf '%s' "$task_id" | grep -qE '^[a-zA-Z0-9_-]+$'; then
    echo "ERROR: Invalid task ID: $task_id" >&2
    return 1
  fi
  local normalized
  normalized=$(printf '%s' "$task_id" | tr '[:upper:]' '[:lower:]' | tr '-' '_')
  printf '%s/%s.eval.json' "$EDD_SPECS_DIR" "$normalized"
}

# Check if a spec exists for a task ID
# Usage: if edd_spec_exists "Q-01"; then ...
edd_spec_exists() {
  local task_id="$1"
  local spec_path
  spec_path=$(edd_spec_path "$task_id")
  [ -f "$spec_path" ]
}

# Load a spec for a task ID
# Usage: spec_json=$(edd_load_spec "Q-01")
# Returns: spec JSON on stdout, or empty on error
edd_load_spec() {
  local task_id="$1"
  local spec_path
  spec_path=$(edd_spec_path "$task_id")

  if [ ! -f "$spec_path" ]; then
    echo ""
    return 1
  fi

  local content
  content=$(cat "$spec_path" 2>/dev/null) || { echo ""; return 1; }

  # Validate JSON
  if ! printf '%s' "$content" | jq empty 2>/dev/null; then
    echo ""
    return 1
  fi

  printf '%s' "$content"
}

# Validate a spec against the schema (basic field validation)
# Usage: edd_validate_spec "$spec_json"
# Returns: 0 if valid, 1 if invalid (errors on stdout)
edd_validate_spec() {
  local spec="$1"
  local errors="[]"

  # Check required fields
  local task_id
  task_id=$(printf '%s' "$spec" | jq -r '.task_id // empty' 2>/dev/null) || true
  if [ -z "$task_id" ]; then
    errors=$(printf '%s' "$errors" | jq -c '. + ["Missing required field: task_id"]')
  fi

  local version
  version=$(printf '%s' "$spec" | jq -r '.version // empty' 2>/dev/null) || true
  if [ -z "$version" ]; then
    errors=$(printf '%s' "$errors" | jq -c '. + ["Missing required field: version"]')
  elif [ "$version" != "1" ]; then
    errors=$(printf '%s' "$errors" | jq -c --arg v "$version" '. + ["Unsupported version: " + $v + " (expected 1)"]')
  fi

  # Check deterministic array
  local det_count
  det_count=$(printf '%s' "$spec" | jq '.deterministic | length' 2>/dev/null) || det_count="0"
  if [ "$det_count" = "0" ] || [ "$det_count" = "null" ]; then
    errors=$(printf '%s' "$errors" | jq -c '. + ["deterministic array must have at least one check"]')
  fi

  # Validate each deterministic check has required fields
  local det_errors
  det_errors=$(printf '%s' "$spec" | jq -r '
    .deterministic // [] | to_entries[] |
    (if .value.name == null or .value.name == "" then "deterministic[" + (.key|tostring) + "]: missing name" else empty end),
    (if .value.command == null or .value.command == "" then "deterministic[" + (.key|tostring) + "]: missing command" else empty end),
    (if .value.expected_exit == null then "deterministic[" + (.key|tostring) + "]: missing expected_exit" else empty end)
  ' 2>/dev/null) || true

  if [ -n "$det_errors" ]; then
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      errors=$(printf '%s' "$errors" | jq -c --arg e "$line" '. + [$e]')
    done <<< "$det_errors"
  fi

  # Validate probabilistic checks if present
  local prob_errors
  prob_errors=$(printf '%s' "$spec" | jq -r '
    .probabilistic // [] | to_entries[] |
    (if .value.name == null or .value.name == "" then "probabilistic[" + (.key|tostring) + "]: missing name" else empty end),
    (if .value.description == null or .value.description == "" then "probabilistic[" + (.key|tostring) + "]: missing description" else empty end),
    (if .value.verification_method == null then "probabilistic[" + (.key|tostring) + "]: missing verification_method" else empty end)
  ' 2>/dev/null) || true

  if [ -n "$prob_errors" ]; then
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      errors=$(printf '%s' "$errors" | jq -c --arg e "$line" '. + [$e]')
    done <<< "$prob_errors"
  fi

  local error_count
  error_count=$(printf '%s' "$errors" | jq 'length' 2>/dev/null) || error_count="0"

  if [ "$error_count" -gt 0 ]; then
    jq -cn --argjson errors "$errors" '{valid: false, errors: $errors}'
    return 1
  fi

  echo '{"valid":true,"errors":[]}'
  return 0
}

# Save a spec for a task ID
# Usage: echo "$spec_json" | edd_save_spec "Q-01"
edd_save_spec() {
  local task_id="$1"
  edd_ensure_dir

  local content
  content=$(cat)

  # Validate before saving
  if ! edd_validate_spec "$content" >/dev/null 2>&1; then
    echo "ERROR: Invalid evaluation spec" >&2
    return 1
  fi

  local spec_path
  spec_path=$(edd_spec_path "$task_id")
  printf '%s\n' "$content" | jq '.' > "$spec_path" 2>/dev/null
}

# List all evaluation specs
# Usage: edd_list_specs
# Returns: JSON array of {task_id, path, valid} objects
edd_list_specs() {
  edd_ensure_dir
  local result="[]"

  for spec_file in "$EDD_SPECS_DIR"/*.eval.json; do
    [ -f "$spec_file" ] || continue
    local task_id
    task_id=$(jq -r '.task_id // "unknown"' "$spec_file" 2>/dev/null) || task_id="unknown"
    local valid="true"
    if ! edd_validate_spec "$(cat "$spec_file")" >/dev/null 2>&1; then
      valid="false"
    fi
    result=$(printf '%s' "$result" | jq -c --arg id "$task_id" --arg path "$spec_file" --argjson valid "$valid" \
      '. + [{task_id: $id, path: $path, valid: $valid}]')
  done

  printf '%s' "$result"
}

# Get count of deterministic checks in a spec
# Usage: edd_deterministic_count "$spec_json"
edd_deterministic_count() {
  local spec="$1"
  printf '%s' "$spec" | jq '.deterministic | length' 2>/dev/null || echo "0"
}

# Get count of probabilistic checks in a spec
# Usage: edd_probabilistic_count "$spec_json"
edd_probabilistic_count() {
  local spec="$1"
  printf '%s' "$spec" | jq '.probabilistic // [] | length' 2>/dev/null || echo "0"
}
