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

# 3. Validate Ground Truth document (ST-06: Strategy Triangle validation hook)
GT_WARNING=""
GT_VALIDATOR="$PROJECT_DIR/admiral/bin/validate_ground_truth"
GT_PATH="$PROJECT_DIR/admiral/ground-truth.json"

if [ -x "$GT_VALIDATOR" ] && [ -f "$GT_PATH" ]; then
  gt_rc=0
  gt_out=$("$GT_VALIDATOR" "$GT_PATH" 2>&1) || gt_rc=$?
  if [ "$gt_rc" -eq 2 ]; then
    GT_WARNING="Ground Truth validation FAILED — strategy enforcement blocked. Fix errors: $gt_out "
  elif [ "$gt_rc" -eq 1 ]; then
    GT_WARNING="Ground Truth validation passed with warnings: $gt_out "
  fi
  # Log validation result
  jq -n --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg trace "$TRACE_ID" \
        --arg sid "$SESSION_ID" \
        --argjson rc "$gt_rc" \
        '{event: "ground_truth_validation", timestamp: $ts, trace_id: $trace, session_id: $sid, exit_code: $rc}' \
        >> "$PROJECT_DIR/.admiral/event_log.jsonl" 2>/dev/null || true
elif [ -x "$GT_VALIDATOR" ] && [ ! -f "$GT_PATH" ]; then
  GT_WARNING="Ground Truth document not found at $GT_PATH — create one with: generate_ground_truth $PROJECT_DIR "
fi

# 4. Fire context_baseline hook (surface failures as warnings, don't suppress)
BASELINE_WARNING=""
if [ -x "$SCRIPT_DIR/context_baseline.sh" ]; then
  # shellcheck disable=SC2034  # Output captured to suppress stdout; only exit code matters
  BASELINE_OUTPUT=$(echo "$PAYLOAD" | "$SCRIPT_DIR/context_baseline.sh" 2>&1) || {
    BASELINE_WARNING="Context baseline hook failed — standing context metrics may be inaccurate. "
  }
fi

# 5. Render Standing Orders for context injection
SO_TEXT=$(render_standing_orders)
SO_COUNT=$(count_standing_orders)

# 6. Log session start event
EVENT_LOG="$PROJECT_DIR/.admiral/event_log.jsonl"
jq -n --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --arg trace "$TRACE_ID" \
      --arg sid "$SESSION_ID" \
      --arg model "$MODEL" \
      --argjson so_count "$SO_COUNT" \
      '{event: "session_start", timestamp: $ts, trace_id: $trace, session_id: $sid, model: $model, standing_orders_loaded: $so_count}' \
      >> "$EVENT_LOG" 2>/dev/null || true

# 7. Output for Claude Code — inject Standing Orders as system message
# Include any initialization warnings so they're visible
FULL_MSG="$SO_TEXT"
INIT_WARNINGS=""
if [ -n "$GT_WARNING" ]; then
  INIT_WARNINGS="${INIT_WARNINGS}${GT_WARNING}"
fi
if [ -n "$BASELINE_WARNING" ]; then
  INIT_WARNINGS="${INIT_WARNINGS}${BASELINE_WARNING}"
fi
if [ -n "$INIT_WARNINGS" ]; then
  FULL_MSG="[Session Init Warning] ${INIT_WARNINGS}\n\n${SO_TEXT}"
fi
jq -n --arg msg "$FULL_MSG" '{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": $msg
}'

exit 0
