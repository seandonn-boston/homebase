#!/bin/bash
# Admiral Framework — Session Lifecycle State Machine (A-10)
# 5 states: init → active → paused → terminating → complete
# Invalid transitions are rejected. State stored in session_state.json.
#
# Usage: source this file, then call session_transition "new_state"

# Valid state transitions (from → to)
# init → active
# active → paused, terminating
# paused → active, terminating
# terminating → complete
# complete → (terminal, no transitions)

SESSION_STATES="init active paused terminating complete"

# Check if a transition is valid
_is_valid_transition() {
  local from="$1"
  local to="$2"

  case "$from:$to" in
    init:active) return 0 ;;
    active:paused) return 0 ;;
    active:terminating) return 0 ;;
    paused:active) return 0 ;;
    paused:terminating) return 0 ;;
    terminating:complete) return 0 ;;
    *) return 1 ;;
  esac
}

# Get current session state
get_session_lifecycle_state() {
  local state_file="${ADMIRAL_DIR:-${CLAUDE_PROJECT_DIR:-.}/.admiral}/session_state.json"
  if [ -f "$state_file" ]; then
    jq -r '.lifecycle_state // "init"' "$state_file" 2>/dev/null || echo "init"
  else
    echo "init"
  fi
}

# Transition to a new state. Returns 0 on success, 1 on invalid transition.
session_transition() {
  local new_state="$1"
  local current_state
  current_state=$(get_session_lifecycle_state)

  # Validate new state is a known state
  if ! echo "$SESSION_STATES" | grep -qw "$new_state"; then
    echo "[lifecycle] ERROR: Unknown state '$new_state'" >&2
    return 1
  fi

  # Same state is a no-op
  if [ "$current_state" = "$new_state" ]; then
    return 0
  fi

  # Check transition validity
  if ! _is_valid_transition "$current_state" "$new_state"; then
    echo "[lifecycle] REJECTED: $current_state → $new_state (invalid transition)" >&2
    return 1
  fi

  # Apply transition
  local state_file="${ADMIRAL_DIR:-${CLAUDE_PROJECT_DIR:-.}/.admiral}/session_state.json"
  if [ -f "$state_file" ]; then
    local ts
    ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local content
    content=$(jq --arg s "$new_state" --arg t "$ts" --arg from "$current_state" \
      '.lifecycle_state = $s | .lifecycle_transition = {from: $from, to: $s, at: $t}' \
      "$state_file" 2>/dev/null)
    if [ -n "$content" ]; then
      echo "$content" > "${state_file}.tmp"
      mv "${state_file}.tmp" "$state_file"
    fi
  fi

  return 0
}
