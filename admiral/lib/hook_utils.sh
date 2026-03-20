#!/bin/bash
# Admiral Framework — Hook Utility Library (Q-02)
# Standardized error handling, logging, and output helpers for all hooks.
# Ensures consistent JSON output format across the entire hook pipeline.
#
# Purpose: Every hook needs to emit structured output and handle errors.
#          This library provides a single set of functions so hooks don't
#          each re-implement logging and exit patterns.
#
# SO reference: Implements ADR-004 (fail-open philosophy).
#   - hook_fail_soft() = advisory warning, never blocks (exit 0)
#   - hook_fail_hard() = blocking denial, reserved for SO violations (exit 2)
#   - hook_pass()      = clean pass (exit 0)
#   - hook_pass_with_context() = pass with advisory feedback (exit 0)
#
# Dependencies: jq (>= 1.6)
# Usage: source "$PROJECT_DIR/admiral/lib/hook_utils.sh"
#        Do NOT execute directly.

set -euo pipefail

# Guard: require jq
if ! command -v jq &>/dev/null; then
  echo '{"level":"ERROR","component":"hook_utils","message":"jq is not installed or not in PATH"}' >&2
  # Fail-open stubs so hooks don't crash without jq
  hook_log()               { echo "{\"level\":\"$1\",\"component\":\"$2\",\"message\":\"$3\"}" >&2; }
  hook_fail_soft()         { echo '{}'; exit 0; }
  hook_fail_hard()         { echo '{}'; exit 2; }
  hook_pass()              { echo '{}'; exit 0; }
  hook_pass_with_context() { echo '{}'; exit 0; }
  return 0 2>/dev/null || exit 0
fi

# ---------------------------------------------------------------------------
# hook_log — emit a structured JSON log line to stderr
#
# Usage: hook_log "INFO" "component_name" "Human-readable message"
#        hook_log "WARN" "zero_trust" "External data flagged"
#
# Arguments:
#   $1 — log level (INFO, WARN, ERROR, DEBUG)
#   $2 — component name (the hook or library emitting the log)
#   $3 — human-readable message
#
# Output: JSON log line to stderr. Nothing on stdout (stdout is reserved
#         for hook output consumed by the adapter pipeline).
# ---------------------------------------------------------------------------
hook_log() {
  local level="${1:-INFO}"
  local component="${2:-unknown}"
  local message="${3:-}"

  jq -n --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg lvl "$level" \
        --arg comp "$component" \
        --arg msg "$message" \
    '{timestamp: $ts, level: $lvl, component: $comp, message: $msg}' >&2
}

# ---------------------------------------------------------------------------
# hook_fail_soft — advisory warning, always exits 0 (fail-open per ADR-004)
#
# Use when a hook detects something worth flagging but should NOT block
# the agent's action. The alert is surfaced as additionalContext so the
# agent sees it without being stopped.
#
# Usage: hook_fail_soft "component_name" "warning message"
#
# Arguments:
#   $1 — component name
#   $2 — warning/alert message
#
# Output: hookSpecificOutput JSON with permissionDecision=allow, then exit 0.
# ---------------------------------------------------------------------------
hook_fail_soft() {
  local component="${1:-unknown}"
  local message="${2:-Advisory warning}"

  hook_log "WARN" "$component" "$message"

  jq -n --arg ctx "$message" '{
    "hookSpecificOutput": {
      "permissionDecision": "allow",
      "additionalContext": $ctx
    }
  }'
  exit 0
}

# ---------------------------------------------------------------------------
# hook_fail_hard — blocking failure, exits 2 (deny)
#
# Use ONLY when a Standing Order violation must be blocked. Exit code 2
# tells Claude Code to deny the tool use. This is the "break glass" path;
# most hooks should prefer hook_fail_soft instead (ADR-004).
#
# Usage: hook_fail_hard "component_name" "block reason"
#
# Arguments:
#   $1 — component name
#   $2 — reason for blocking (shown to agent as additionalContext)
#
# Output: hookSpecificOutput JSON with permissionDecision=deny, then exit 2.
# ---------------------------------------------------------------------------
hook_fail_hard() {
  local component="${1:-unknown}"
  local message="${2:-Blocked by hook}"

  hook_log "ERROR" "$component" "HARD BLOCK: $message"

  jq -n --arg ctx "$message" '{
    "hookSpecificOutput": {
      "permissionDecision": "deny",
      "additionalContext": $ctx
    }
  }'
  exit 2
}

# ---------------------------------------------------------------------------
# hook_pass — clean pass, exit 0
#
# Use when the hook has nothing to report. Emits minimal valid JSON so
# the adapter pipeline always receives parseable output.
#
# Usage: hook_pass
#
# Output: empty JSON object on stdout, then exit 0.
# ---------------------------------------------------------------------------
hook_pass() {
  echo '{}'
  exit 0
}

# ---------------------------------------------------------------------------
# hook_pass_with_context — pass with advisory context, exit 0
#
# Use when the hook approves the action but wants to inject advisory
# information for the agent (e.g., reminders, enrichment, soft warnings).
#
# Usage: hook_pass_with_context "advisory message"
#
# Arguments:
#   $1 — advisory message to surface to the agent
#
# Output: hookSpecificOutput JSON with additionalContext, then exit 0.
# ---------------------------------------------------------------------------
hook_pass_with_context() {
  local message="${1:-}"

  jq -n --arg ctx "$message" '{
    "hookSpecificOutput": {
      "permissionDecision": "allow",
      "additionalContext": $ctx
    }
  }'
  exit 0
}
