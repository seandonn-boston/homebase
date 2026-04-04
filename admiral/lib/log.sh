#!/bin/bash
# Admiral Framework — Structured Logging (OB-01)
# Provides log_structured() for JSON-formatted operational logging.
# All hooks and scripts should use this instead of raw echo for operational output.
#
# Log entry format:
#   {"timestamp":"<ISO8601>","level":"<level>","component":"<name>",
#    "correlation_id":"<id>","message":"<msg>","context":{...}}
#
# Levels: debug, info, warn, error, fatal
# Log output goes to stderr (stdout reserved for hook JSON output).

# Log directory — defaults to .admiral/logs/
ADMIRAL_LOG_DIR="${ADMIRAL_LOG_DIR:-${CLAUDE_PROJECT_DIR:-.}/.admiral/logs}"
ADMIRAL_LOG_FILE="${ADMIRAL_LOG_DIR}/admiral.jsonl"
ADMIRAL_LOG_LEVEL="${ADMIRAL_LOG_LEVEL:-info}"

# Level ordinals for filtering
_log_level_ordinal() {
  case "$1" in
    debug) echo 0 ;;
    info)  echo 1 ;;
    warn)  echo 2 ;;
    error) echo 3 ;;
    fatal) echo 4 ;;
    *)     echo 1 ;;
  esac
}

# Check if a level should be logged given current ADMIRAL_LOG_LEVEL
_should_log() {
  local level="$1"
  local current_ordinal
  local target_ordinal
  current_ordinal=$(_log_level_ordinal "$ADMIRAL_LOG_LEVEL")
  target_ordinal=$(_log_level_ordinal "$level")
  [ "$target_ordinal" -ge "$current_ordinal" ]
}

# Core structured logging function
# Usage: log_structured <level> <component> <message> [context_json]
# Example: log_structured info "zero_trust_validator" "Injection detected" '{"tool":"Read","severity":"high"}'
log_structured() {
  local level="${1:-info}"
  local component="${2:-unknown}"
  local message="${3:-}"
  local context="${4:-"{}"}"
  local correlation_id="${ADMIRAL_CORRELATION_ID:-}"

  # Skip if below configured log level
  if ! _should_log "$level"; then
    return 0
  fi

  # Get correlation ID from session state if not set in env
  if [ -z "$correlation_id" ]; then
    local state_file="${CLAUDE_PROJECT_DIR:-.}/.admiral/session_state.json"
    if [ -f "$state_file" ]; then
      correlation_id=$(jq -r '.trace_id // ""' "$state_file" 2>/dev/null || echo "")
    fi
  fi

  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)

  # Validate context is valid JSON, fall back to wrapping as string
  if ! printf '%s' "$context" | jq empty 2>/dev/null; then
    context=$(jq -cn --arg c "$context" '{raw: $c}')
  fi

  local entry
  entry=$(jq -cn \
    --arg ts "$ts" \
    --arg level "$level" \
    --arg component "$component" \
    --arg correlation_id "$correlation_id" \
    --arg message "$message" \
    --argjson context "$context" \
    '{timestamp: $ts, level: $level, component: $component, correlation_id: $correlation_id, message: $message, context: $context}')

  # Write to log file (create directory if needed)
  if mkdir -p "$ADMIRAL_LOG_DIR" 2>/dev/null; then
    echo "$entry" >> "$ADMIRAL_LOG_FILE" 2>/dev/null || true
  fi

  # Also emit to stderr for real-time visibility
  echo "$entry" >&2
}

# Convenience wrappers
log_debug() { log_structured debug "$@"; }
log_info()  { log_structured info "$@"; }
log_warn()  { log_structured warn "$@"; }
log_error() { log_structured error "$@"; }
log_fatal() { log_structured fatal "$@"; }
