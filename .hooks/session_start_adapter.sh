#!/bin/bash
# Admiral Framework — SessionStart Hook Adapter
# Translates Claude Code SessionStart payload to Admiral hook contracts.
# Resets session state, fires context_baseline, injects Standing Orders.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Source shared libraries
source "$PROJECT_DIR/admiral/lib/state.sh"
source "$PROJECT_DIR/admiral/lib/standing_orders.sh"
if [ -f "$PROJECT_DIR/admiral/lib/hook_utils.sh" ]; then
  source "$PROJECT_DIR/admiral/lib/hook_utils.sh"
fi
hook_init "session_start_adapter"

# Read Claude Code payload from stdin
PAYLOAD=$(cat)

# Extract fields from Claude Code SessionStart payload
SESSION_ID=$(echo "$PAYLOAD" | jq -r '.session_id // "unknown"')
MODEL=$(echo "$PAYLOAD" | jq -r '.model // "unknown"')

# 1. Reset session state (fresh session)
init_session_state "$SESSION_ID"

# 1b. Validate configuration at startup (fail-closed: report errors but continue)
CONFIG_WARNING=""
if [ -x "$PROJECT_DIR/admiral/bin/validate_config" ]; then
  CONFIG_RESULT=$("$PROJECT_DIR/admiral/bin/validate_config" --json 2>/dev/null) || true
  CONFIG_STATUS=$(echo "$CONFIG_RESULT" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
  if [ "$CONFIG_STATUS" = "invalid" ]; then
    CONFIG_ERRORS=$(echo "$CONFIG_RESULT" | jq -r '.errors[]' 2>/dev/null || echo "unknown errors")
    CONFIG_WARNING="Configuration validation failed: $CONFIG_ERRORS. "
  fi
fi

# 1c. Validate agent identity (S-01) — advisory, never blocks session start
IDENTITY_WARNING=""
if [ -x "$SCRIPT_DIR/identity_validation.sh" ]; then
  IDENTITY_RESULT=$(echo "$PAYLOAD" | "$SCRIPT_DIR/identity_validation.sh" 2>/dev/null) || true
  IDENTITY_SEVERITY=$(echo "$IDENTITY_RESULT" | jq -r '.severity // "info"' 2>/dev/null | tr -d '\r' || echo "info")
  if [ "$IDENTITY_SEVERITY" = "warning" ]; then
    IDENTITY_MSG=$(echo "$IDENTITY_RESULT" | jq -r '.advisory // ""' 2>/dev/null | tr -d '\r')
    IDENTITY_WARNING="[Identity] $IDENTITY_MSG "
  fi
fi

# 1d. Validate model tier (S-02) — blocks critical mismatches (exit 2)
TIER_WARNING=""
if [ -x "$SCRIPT_DIR/tier_validation.sh" ]; then
  TIER_EXIT=0
  TIER_RESULT=$(echo "$PAYLOAD" | "$SCRIPT_DIR/tier_validation.sh" 2>/dev/null) || TIER_EXIT=$?
  if [ "$TIER_EXIT" -eq 2 ]; then
    # Critical tier mismatch — block session
    TIER_MSG=$(echo "$TIER_RESULT" | jq -r '.advisory // "Critical tier mismatch"' 2>/dev/null | tr -d '\r')
    jq -n --arg msg "[BLOCKED] $TIER_MSG" '{
      "continue": false,
      "suppressOutput": false,
      "systemMessage": $msg
    }'
    exit 2
  fi
  TIER_SEVERITY=$(echo "$TIER_RESULT" | jq -r '.severity // "info"' 2>/dev/null | tr -d '\r' || echo "info")
  if [ "$TIER_SEVERITY" = "warning" ]; then
    TIER_MSG=$(echo "$TIER_RESULT" | jq -r '.advisory // ""' 2>/dev/null | tr -d '\r')
    TIER_WARNING="[Tier] $TIER_MSG "
  fi
fi

# 2. Generate trace ID for this session
TRACE_ID=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || echo "trace-${SESSION_ID}-$(date +%s)")
set_state_field '.trace_id' "\"$TRACE_ID\""

# 3. Fire context_baseline hook (surface failures as warnings, don't suppress)
BASELINE_WARNING=""
if [ -x "$SCRIPT_DIR/context_baseline.sh" ]; then
  # shellcheck disable=SC2034  # Output captured to suppress stdout; only exit code matters
  BASELINE_OUTPUT=$(echo "$PAYLOAD" | "$SCRIPT_DIR/context_baseline.sh" 2>&1) || {
    BASELINE_WARNING="Context baseline hook failed — standing context metrics may be inaccurate. "
  }
fi

# 4. Render Standing Orders for context injection
SO_TEXT=$(render_standing_orders)
SO_COUNT=$(count_standing_orders)

# 5. Log session start event
EVENT_LOG="$PROJECT_DIR/.admiral/event_log.jsonl"
jq -n --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --arg trace "$TRACE_ID" \
      --arg sid "$SESSION_ID" \
      --arg model "$MODEL" \
      --argjson so_count "$SO_COUNT" \
      '{event: "session_start", timestamp: $ts, trace_id: $trace, session_id: $sid, model: $model, standing_orders_loaded: $so_count}' \
      >> "$EVENT_LOG" 2>/dev/null || true

# 6. Output for Claude Code — inject Standing Orders as system message
# Include any initialization warnings so they're visible
FULL_MSG="$SO_TEXT"
ALL_WARNINGS="${BASELINE_WARNING}${CONFIG_WARNING}${IDENTITY_WARNING}${TIER_WARNING}"
if [ -n "$ALL_WARNINGS" ]; then
  FULL_MSG="[Session Init Warning] ${ALL_WARNINGS}\n\n${SO_TEXT}"
fi
jq -n --arg msg "$FULL_MSG" '{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": $msg
}'

exit 0
