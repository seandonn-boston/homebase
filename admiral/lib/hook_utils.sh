#!/usr/bin/env bash
# admiral/lib/hook_utils.sh — Standardized hook error handling
#
# Provides consistent logging and exit behavior for all hooks:
#   hook_log       — Structured JSON log to stderr
#   hook_pass      — Exit 0 with optional stdout context
#   hook_fail_soft — Exit 0 (fail-open) with warning log
#   hook_fail_hard — Exit 2 (fail-closed, blocks action)
#   hook_error     — Exit 1 (error, fail-open per ADR-004)
#   hook_disabled  — Exit 126 (hook disabled)
#
# Exit code taxonomy:
#   0   = success / fail-open pass-through
#   1   = error (fail-open — log and continue)
#   2   = block (fail-closed — prevents action)
#   3   = config error
#   4   = dependency error
#   126 = hook disabled
#   127 = hook not found

set -euo pipefail

# Name of the current hook (set by each hook script)
HOOK_NAME="${HOOK_NAME:-unknown}"

# Emit structured JSON log to stderr.
# Usage: hook_log "info" "Processing tool call" '{"tool":"read"}'
hook_log() {
  local level="$1"
  local message="$2"
  local context="${3:-"{}"}"
  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "unknown")
  echo "{\"timestamp\":\"$ts\",\"level\":\"$level\",\"component\":\"$HOOK_NAME\",\"message\":$(echo "$message" | jq -Rs .),\"context\":$context}" >&2
}

# Exit successfully with optional stdout feedback.
# Usage: hook_pass '{"hook_state":{"my_hook":{}}}'
hook_pass() {
  local output="${1:-}"
  if [ -n "$output" ]; then
    echo "$output"
  fi
  exit 0
}

# Fail-open: log warning, exit 0 so action proceeds.
# Usage: hook_fail_soft "Could not validate" '{"reason":"timeout"}'
hook_fail_soft() {
  local message="$1"
  local context="${2:-"{}"}"
  hook_log "warn" "$message" "$context"
  exit 0
}

# Fail-closed: log error, exit 2 to block the action.
# Usage: hook_fail_hard "Secret detected in output" '{"pattern":"API_KEY"}'
hook_fail_hard() {
  local message="$1"
  local context="${2:-"{}"}"
  hook_log "error" "$message" "$context"
  exit 2
}

# Error: log error, exit 1 (fail-open per ADR-004).
# Usage: hook_error "jq not found"
hook_error() {
  local message="$1"
  local context="${2:-"{}"}"
  hook_log "error" "$message" "$context"
  exit 1
}

# Hook is disabled: exit 126.
# Usage: hook_disabled "Hook disabled by config"
hook_disabled() {
  local message="${1:-Hook disabled}"
  hook_log "info" "$message"
  exit 126
}

# Check that a required dependency is available.
# Usage: hook_require_dep "jq" "jq >= 1.6 is required"
hook_require_dep() {
  local dep="$1"
  local message="${2:-$dep is required}"
  if ! command -v "$dep" >/dev/null 2>&1; then
    hook_log "error" "Missing dependency: $message" "{\"dependency\":\"$dep\"}"
    exit 4
  fi
}
