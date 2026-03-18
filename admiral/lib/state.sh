#!/bin/bash
# Admiral Framework — Session State Management
# Shared functions for reading/writing .admiral/session_state.json

ADMIRAL_DIR="${ADMIRAL_DIR:-$CLAUDE_PROJECT_DIR/.admiral}"
STATE_FILE="${ADMIRAL_DIR}/session_state.json"
TEMPLATE_FILE="${ADMIRAL_DIR}/session_state.json.template"

# Ensure .admiral directory exists
ensure_admiral_dir() {
  mkdir -p "$ADMIRAL_DIR"
}

# Initialize fresh session state from template
init_session_state() {
  local session_id="$1"
  ensure_admiral_dir

  if [ -f "$TEMPLATE_FILE" ]; then
    jq --arg sid "$session_id" \
       --arg ts "$(date +%s)" \
       '.session_id = $sid | .started_at = ($ts | tonumber)' \
       "$TEMPLATE_FILE" > "$STATE_FILE"
  else
    cat > "$STATE_FILE" <<'TMPL'
{
  "session_id": "",
  "started_at": 0,
  "tokens_used": 0,
  "token_budget": 0,
  "tool_call_count": 0,
  "hook_state": {
    "loop_detector": { "error_counts": {}, "total_errors": 0 },
    "self_healing": { "retry_counts": {}, "total_retries": 0 },
    "brain_context_router": { "brain_queries_count": 0, "last_brain_query_tool_call": 0, "propose_without_brain": 0, "escalate_without_brain": 0 },
    "zero_trust": { "external_data_count": 0 },
    "compliance": { "flags_count": 0 },
    "pre_work_validator": { "validated": false }
  },
  "context": {
    "standing_context_tokens": 0,
    "standing_context_present": []
  }
}
TMPL
    jq --arg sid "$session_id" \
       --arg ts "$(date +%s)" \
       '.session_id = $sid | .started_at = ($ts | tonumber)' \
       "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
  fi
}

# Load session state into a variable (outputs JSON to stdout)
# Fail-open: if state is missing or corrupt, reinitialize and continue.
load_state() {
  if [ ! -f "$STATE_FILE" ]; then
    init_session_state "unknown"
  fi
  local content
  content=$(cat "$STATE_FILE" 2>/dev/null) || content='{}'
  # Validate JSON — if corrupt, reinitialize
  if ! echo "$content" | jq empty 2>/dev/null; then
    init_session_state "recovery-$(date +%s)"
    content=$(cat "$STATE_FILE" 2>/dev/null) || content='{}'
  fi
  echo "$content"
}

# Save session state from stdin
# Atomic write with validation — only overwrites if new content is valid JSON.
save_state() {
  ensure_admiral_dir
  local content
  content=$(cat)
  # Validate before writing — never save corrupt state
  if echo "$content" | jq empty 2>/dev/null; then
    echo "$content" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
  fi
  # If validation fails, silently keep the existing state file (fail-open)
}

# Read a specific field from session state
get_state_field() {
  local field="$1"
  load_state | jq -r "$field"
}

# Update a specific field in session state
set_state_field() {
  local field="$1"
  local value="$2"
  local state
  state=$(load_state)
  echo "$state" | jq "$field = $value" | save_state
}

# Increment a numeric field
increment_state_field() {
  local field="$1"
  local amount="${2:-1}"
  local state
  state=$(load_state)
  echo "$state" | jq "$field = ($field + $amount)" | save_state
}

# Get token estimation for a tool — reads from central config with hardcoded fallback
estimate_tokens() {
  local tool_name="$1"
  local config_file="${CLAUDE_PROJECT_DIR:-$PROJECT_DIR}/admiral/config.json"

  # Try central config first
  if [ -f "$config_file" ]; then
    local estimate
    estimate=$(jq -r ".tokenEstimates[\"$tool_name\"] // .tokenEstimates.default // 500" "$config_file" 2>/dev/null)
    if [ -n "$estimate" ] && [ "$estimate" != "null" ]; then
      echo "$estimate"
      return
    fi
  fi

  # Fallback to hardcoded defaults
  case "$tool_name" in
    Bash)         echo 500  ;;
    Read)         echo 1000 ;;
    Write)        echo 800  ;;
    Edit)         echo 600  ;;
    Glob)         echo 300  ;;
    Grep)         echo 500  ;;
    WebFetch)     echo 2000 ;;
    WebSearch)    echo 1500 ;;
    Agent)        echo 5000 ;;
    NotebookEdit) echo 800  ;;
    *)            echo 500  ;;
  esac
}

# Compute error signature for self-healing (SHA256 truncated to 16 hex chars)
compute_self_healing_sig() {
  local hook_name="$1"
  local first_line="$2"
  local exit_code="$3"
  local input="${hook_name}:$(echo "$first_line" | tr '[:upper:]' '[:lower:]'):${exit_code}"
  echo -n "$input" | sha256sum | cut -c1-16
}

# Compute error signature for loop detection
compute_loop_sig() {
  local agent_id="$1"
  local error_msg="$2"
  local input="${agent_id}:$(echo "$error_msg" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | tr '[:upper:]' '[:lower:]')"
  echo -n "$input" | sha256sum | cut -c1-16
}
