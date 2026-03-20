#!/bin/bash
# Admiral Framework — Shared Hook Utilities (Q-02)
# Standardized error handling, logging, and output patterns for all hooks.
# Source this file in any hook: source "$PROJECT_DIR/admiral/lib/hook_utils.sh"
#
# Exit code conventions (per ADR-004):
#   0 = pass (allow tool use, with optional advisory message)
#   2 = hard-block (deny tool use — used by scope_boundary_guard, prohibitions_enforcer)
#
# Hooks are either fail-open (advisory, always exit 0) or fail-closed (blocking, exit 2).
# This library provides helpers for both patterns.

_EMPTY_JSON='{}'

# --- Logging ---

# Log a hook message to the hook error log (not stdout — stdout is reserved for JSON output).
# Usage: hook_log "zero_trust_validator" "Injection detected in Bash response"
hook_log() {
  local hook_name="$1"
  local message="$2"
  local log_dir="${CLAUDE_PROJECT_DIR:-.}/.admiral"
  mkdir -p "$log_dir" 2>/dev/null || true
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [$hook_name] $message" >> "$log_dir/hook_errors.log" 2>/dev/null || true
}

# --- Fail-open (advisory) hooks ---

# Exit with advisory message (exit 0, systemMessage shown to agent).
# Usage: hook_fail_soft "Advisory text here"
# Usage: hook_fail_soft "Advisory text here" '{"hook": "state"}'
hook_fail_soft() {
  local message="${1:-}"
  local hook_state="${2:-$_EMPTY_JSON}"
  jq -n --arg msg "$message" --argjson hs "$hook_state" '{
    "continue": true,
    "suppressOutput": false,
    "systemMessage": $msg,
    "hook_state": $hs
  }'
  exit 0
}

# Exit with no message (hook passed, nothing to report).
# Usage: hook_pass
# Usage: hook_pass '{"zero_trust": {"external_data_count": 1}}'
hook_pass() {
  local hook_state="${1:-$_EMPTY_JSON}"
  if [ "$hook_state" = "$_EMPTY_JSON" ]; then
    echo '{"continue": true}'
  else
    jq -n --argjson hs "$hook_state" '{"continue": true, "hook_state": $hs}'
  fi
  exit 0
}

# --- Fail-closed (blocking) hooks ---

# Hard-block the tool use (exit 2, deny decision).
# Usage: hook_fail_hard "SCOPE BOUNDARY: Cannot modify aiStrat/"
hook_fail_hard() {
  local message="$1"
  jq -n --arg msg "$message" '{
    "decision": "deny",
    "reason": $msg
  }'
  exit 2
}

# --- Output helpers ---

# Build a JSON alert output with hook_state (for PostToolUse hooks).
# Usage: hook_alert "Alert text" '{"zero_trust": {"count": 1}}'
hook_alert() {
  local alert="$1"
  local hook_state="${2:-$_EMPTY_JSON}"
  jq -n --arg a "$alert" --argjson hs "$hook_state" '{
    "hook_state": $hs,
    "alert": $a
  }'
}

# Build a JSON output with only hook_state (no alert).
# Usage: hook_state_only '{"zero_trust": {"count": 0}}'
hook_state_only() {
  local hook_state="$1"
  jq -n --argjson hs "$hook_state" '{"hook_state": $hs}'
}
