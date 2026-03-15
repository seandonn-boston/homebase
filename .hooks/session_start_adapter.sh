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

# Read Claude Code payload from stdin
PAYLOAD=$(cat)

# Extract fields from Claude Code SessionStart payload
SESSION_ID=$(echo "$PAYLOAD" | jq -r '.session_id // "unknown"')
MODEL=$(echo "$PAYLOAD" | jq -r '.model // "unknown"')

# 1. Reset session state (fresh session)
init_session_state "$SESSION_ID"

# 2. Generate trace ID for this session
TRACE_ID=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || echo "trace-${SESSION_ID}-$(date +%s)")
set_state_field '.trace_id' "\"$TRACE_ID\""

# 3. Fire context_baseline hook
if [ -x "$SCRIPT_DIR/context_baseline.sh" ]; then
  echo "$PAYLOAD" | "$SCRIPT_DIR/context_baseline.sh" >/dev/null 2>&1 || true
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
jq -n --arg msg "$SO_TEXT" '{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": $msg
}'

exit 0
