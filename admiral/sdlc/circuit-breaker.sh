#!/bin/bash
# Admiral Framework — SDLC Loop Circuit Breaker
# Checks iteration cap, token budget, and runaway alerts before allowing
# the next SDLC loop iteration to proceed.
#
# Usage: circuit-breaker.sh <iteration> [trace_id]
#   iteration: current iteration number (1-based)
#   trace_id:  optional trace ID to filter event log
#
# Output: JSON {"proceed": bool, "reason": "...", "iteration": N, "tokens_spent": N}
# Exit:   0 = proceed, 1 = break (halt the loop)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

# Load loop configuration
CONFIG_FILE="$SCRIPT_DIR/loop-config.json"
if [ ! -f "$CONFIG_FILE" ]; then
  echo '{"proceed": false, "reason": "loop-config.json not found", "iteration": 0, "tokens_spent": 0}'
  exit 1
fi

MAX_ITERATIONS=$(jq -r '.max_iterations // 3' "$CONFIG_FILE")
TOKEN_BUDGET=$(jq -r '.token_budget_per_cycle // 100000' "$CONFIG_FILE")

# Parse arguments
ITERATION="${1:-1}"
TRACE_ID="${2:-}"

# --- Check 1: Iteration cap ---
if [ "$ITERATION" -gt "$MAX_ITERATIONS" ]; then
  jq -n \
    --argjson iter "$ITERATION" \
    --argjson max "$MAX_ITERATIONS" \
    '{proceed: false, reason: ("Iteration cap reached: " + ($iter|tostring) + "/" + ($max|tostring)), iteration: $iter, tokens_spent: 0}'
  exit 1
fi

# --- Check 2: Token budget ---
EVENT_LOG="$PROJECT_DIR/.admiral/event_log.jsonl"
TOKENS_SPENT=0

if [ -f "$EVENT_LOG" ]; then
  if [ -n "$TRACE_ID" ]; then
    # Sum tokens from events matching this trace
    TOKENS_SPENT=$(grep "\"trace_id\":\"$TRACE_ID\"" "$EVENT_LOG" 2>/dev/null \
      | jq -r '.tokens_used // 0' 2>/dev/null \
      | awk '{s+=$1} END {print s+0}')
  else
    # No trace ID — sum all token_spent events from last 24h
    CUTOFF=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-24H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "1970-01-01T00:00:00Z")
    TOKENS_SPENT=$(jq -r "select(.timestamp >= \"$CUTOFF\") | .tokens_used // 0" "$EVENT_LOG" 2>/dev/null \
      | awk '{s+=$1} END {print s+0}')
  fi
fi

if [ "$TOKEN_BUDGET" -gt 0 ] && [ "$TOKENS_SPENT" -ge "$TOKEN_BUDGET" ]; then
  jq -n \
    --argjson iter "$ITERATION" \
    --argjson spent "$TOKENS_SPENT" \
    --argjson budget "$TOKEN_BUDGET" \
    '{proceed: false, reason: ("Token budget exhausted: " + ($spent|tostring) + "/" + ($budget|tostring)), iteration: $iter, tokens_spent: $spent}'
  exit 1
fi

# --- Check 3: Runaway alerts ---
VIOLATION_COUNT=0

if [ -f "$EVENT_LOG" ]; then
  if [ -n "$TRACE_ID" ]; then
    VIOLATION_COUNT=$(grep "\"trace_id\":\"$TRACE_ID\"" "$EVENT_LOG" 2>/dev/null \
      | grep '"event":"policy_violation"' 2>/dev/null \
      | wc -l)
  else
    # Check for any policy violations in last hour
    CUTOFF=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-1H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "1970-01-01T00:00:00Z")
    VIOLATION_COUNT=$(jq -r "select(.timestamp >= \"$CUTOFF\" and .event == \"policy_violation\") | .event" "$EVENT_LOG" 2>/dev/null \
      | wc -l)
  fi
fi

# 3+ violations in a trace = runaway, halt the loop
if [ "$VIOLATION_COUNT" -ge 3 ]; then
  jq -n \
    --argjson iter "$ITERATION" \
    --argjson spent "$TOKENS_SPENT" \
    --argjson violations "$VIOLATION_COUNT" \
    '{proceed: false, reason: ("Runaway detected: " + ($violations|tostring) + " policy violations in trace"), iteration: $iter, tokens_spent: $spent}'
  exit 1
fi

# --- All checks passed ---
jq -n \
  --argjson iter "$ITERATION" \
  --argjson spent "$TOKENS_SPENT" \
  --argjson max "$MAX_ITERATIONS" \
  --argjson budget "$TOKEN_BUDGET" \
  '{proceed: true, reason: ("OK: iteration " + ($iter|tostring) + "/" + ($max|tostring) + ", tokens " + ($spent|tostring) + "/" + ($budget|tostring)), iteration: $iter, tokens_spent: $spent}'
exit 0
