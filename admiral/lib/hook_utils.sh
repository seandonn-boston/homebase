#!/bin/bash
# Admiral Framework — Hook Utilities (Q-02)
# Standardized hook error handling, output formatting, and lifecycle helpers.
# All hooks should source this library for consistent behavior per ADR-004.
#
# Exit code contract:
#   0 = success / fail-open (advisory only — never blocks)
#   1 = error encountered but fail-open (hook degrades gracefully)
#   2 = hard-block / fail-closed (tool execution is denied)
#
# Output contract:
#   stdout = structured JSON (hook result, alerts, state updates)
#   stderr = structured log entries (via log.sh)

# Source dependencies
_HOOK_UTILS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$_HOOK_UTILS_DIR/log.sh" ]; then
  # shellcheck source=/dev/null
  source "$_HOOK_UTILS_DIR/log.sh"
fi
if [ -f "$_HOOK_UTILS_DIR/jq_helpers.sh" ]; then
  # shellcheck source=/dev/null
  source "$_HOOK_UTILS_DIR/jq_helpers.sh"
fi

# Current hook name — set by hook_init, used by all other functions
_HOOK_NAME=""
_HOOK_START_TIME=""

# ─── Lifecycle ───────────────────────────────────────────────────────

# Initialize hook execution context. Call at the top of every hook.
# Usage: hook_init "loop_detector"
# Sets the hook name for logging and records start time.
hook_init() {
  _HOOK_NAME="${1:-unknown_hook}"
  _HOOK_START_TIME=$(date +%s%N 2>/dev/null || date +%s)
}

# ─── Logging ─────────────────────────────────────────────────────────

# Log a message from the hook. Uses structured logging if available,
# falls back to stderr. All hook logs include the hook name as component.
# Usage: hook_log "info" "Processing tool call" '{"tool":"Bash"}'
hook_log() {
  local level="${1:-info}"
  local message="${2:-}"
  local context="${3:-"{}"}"

  if type log_structured &>/dev/null; then
    log_structured "$level" "$_HOOK_NAME" "$message" "$context"
  else
    echo "[${level}] ${_HOOK_NAME}: ${message}" >&2
  fi
}

# ─── Output Helpers ──────────────────────────────────────────────────

# Emit a successful pass result (advisory, no alerts).
# Usage: hook_pass
# Usage: hook_pass '{"hook_state": {"my_hook": {"count": 1}}}'
# Outputs JSON to stdout and exits 0.
hook_pass() {
  local extra_json="${1:-}"

  if [ -n "$extra_json" ]; then
    printf '%s\n' "$extra_json"
  fi

  hook_log "debug" "Hook passed"
  exit 0
}

# Emit a fail-soft result (advisory warning, does not block tool use).
# The hook encountered something noteworthy but chooses not to block.
# Usage: hook_fail_soft "Warning message for the agent" '{"hook_state": {...}}'
# Outputs JSON with alert to stdout and exits 0 (fail-open per ADR-004).
hook_fail_soft() {
  local alert_message="${1:-}"
  local hook_state_json="${2:-}"
  local output="{}"

  if [ -n "$hook_state_json" ] && [ -n "$alert_message" ]; then
    local alert_json
    alert_json=$(jq_to_json_string "$alert_message" 2>/dev/null || echo "\"$alert_message\"")
    output=$(printf '%s' "$hook_state_json" | jq -c --argjson alert "$alert_json" '. + {alert: $alert}' 2>/dev/null) || \
      output="{\"alert\": $(jq_to_json_string "$alert_message")}"
  elif [ -n "$alert_message" ]; then
    output="{\"alert\": $(jq_to_json_string "$alert_message")}"
  elif [ -n "$hook_state_json" ]; then
    output="$hook_state_json"
  fi

  printf '%s\n' "$output"
  hook_log "warn" "$alert_message"
  exit 0
}

# Emit a hard-block result (denies tool execution).
# Only use for fail-closed hooks (scope_boundary_guard, prohibitions_enforcer).
# Usage: hook_fail_hard "Block reason" '{"hookSpecificOutput": {...}}'
# Outputs JSON to stdout and exits 2 (hard-block).
hook_fail_hard() {
  local block_reason="${1:-Blocked by hook}"
  local output_json="${2:-}"

  if [ -z "$output_json" ]; then
    output_json=$(jq -cn --arg ctx "$block_reason" '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "additionalContext": $ctx
      }
    }' 2>/dev/null) || output_json="{\"error\": \"$block_reason\"}"
  fi

  printf '%s\n' "$output_json"
  hook_log "error" "Hard-block: $block_reason"
  exit 2
}

# ─── Error Recovery ──────────────────────────────────────────────────

# Handle an unexpected error within a hook. Logs the error and exits
# fail-open (exit 0) to avoid blocking tool use.
# Usage: hook_recover "jq parsing failed" '{"raw_input": "..."}'
# This is the default error handler — hooks should use trap to wire it up.
hook_recover() {
  local error_msg="${1:-Unknown error}"
  local context="${2:-"{}"}"

  hook_log "error" "Hook error (fail-open recovery): $error_msg" "$context"

  # Output minimal valid JSON so the adapter doesn't error
  echo '{"continue": true}'
  exit 0
}

# Set up fail-open trap for the hook. Call after hook_init.
# Usage: hook_trap_fail_open
# On any unhandled error, the hook will log and exit 0 instead of crashing.
hook_trap_fail_open() {
  trap 'hook_recover "Unhandled error at line $LINENO"' ERR
}

# ─── Payload Helpers ─────────────────────────────────────────────────

# Read hook payload from stdin and validate it.
# Usage: PAYLOAD=$(hook_read_payload)
# Returns the payload JSON on stdout. If stdin is empty or invalid JSON,
# returns '{}' and logs a warning (fail-open).
hook_read_payload() {
  local payload
  payload=$(cat)

  if [ -z "$payload" ]; then
    hook_log "warn" "Empty payload received"
    echo '{}'
    return 0
  fi

  if ! printf '%s' "$payload" | jq empty 2>/dev/null; then
    hook_log "warn" "Invalid JSON payload received"
    echo '{}'
    return 0
  fi

  printf '%s' "$payload"
}

# Build hook output JSON with hook_state and optional alert.
# Usage: hook_output "my_hook" '{"count": 1}' "Warning message"
# Returns: {"hook_state": {"my_hook": {"count": 1}}, "alert": "Warning message"}
hook_output() {
  local hook_name="${1:-$_HOOK_NAME}"
  local state_json="${2:-"{}"}"
  local alert="${3:-}"

  local output
  if [ -n "$alert" ]; then
    local alert_json
    alert_json=$(jq_to_json_string "$alert" 2>/dev/null || echo "\"$alert\"")
    output=$(jq -cn \
      --arg name "$hook_name" \
      --argjson state "$state_json" \
      --argjson alert "$alert_json" \
      '{hook_state: {($name): $state}, alert: $alert}' 2>/dev/null) || \
      output="{\"hook_state\": {\"$hook_name\": $state_json}, \"alert\": $alert_json}"
  else
    output=$(jq -cn \
      --arg name "$hook_name" \
      --argjson state "$state_json" \
      '{hook_state: {($name): $state}}' 2>/dev/null) || \
      output="{\"hook_state\": {\"$hook_name\": $state_json}}"
  fi

  printf '%s' "$output"
}

# Build a PreToolUse advisory output (allow with context).
# Usage: hook_advisory "Additional context for the agent"
hook_advisory() {
  local context="${1:-}"

  jq -cn --arg ctx "$context" '{
    "hookSpecificOutput": {
      "hookEventName": "PreToolUse",
      "permissionDecision": "allow",
      "additionalContext": $ctx
    }
  }' 2>/dev/null || echo "{\"hookSpecificOutput\": {\"additionalContext\": \"$context\"}}"
}
