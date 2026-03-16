#!/bin/bash
# Admiral Framework — PreToolUse Hook Adapter
# Translates Claude Code PreToolUse payload to Admiral hook contracts.
# Dispatches to: budget checkpoint, scope_boundary_guard, prohibitions_enforcer, pre_work_validator
# NEVER hard-blocks (exit 2) — prevents unrecoverable deadlocks.
# All sub-hooks are isolated — one failure cannot cascade.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Source shared libraries
source "$PROJECT_DIR/admiral/lib/state.sh"

# Read Claude Code payload from stdin
PAYLOAD=$(cat)

# Extract tool name
TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // "unknown"')

# Collect advisory context from all sub-hooks
ALL_CONTEXT=""

# --- Sub-hook 1: Budget Checkpoint ---
STATE=$(load_state)
TOKENS_USED=$(echo "$STATE" | jq -r '.tokens_used // 0')
TOKEN_BUDGET=$(echo "$STATE" | jq -r '.token_budget // 0')
ESTIMATED=$(estimate_tokens "$TOOL_NAME")

if [ "$TOKEN_BUDGET" -gt 0 ]; then
  UTIL_PCT=$((TOKENS_USED * 100 / TOKEN_BUDGET))
  PROJECTED=$((TOKENS_USED + ESTIMATED))
  OVER_BY=$((PROJECTED - TOKEN_BUDGET))

  if [ "$PROJECTED" -ge "$TOKEN_BUDGET" ]; then
    ALL_CONTEXT+="BUDGET CHECKPOINT: Token budget exceeded. Current: ${TOKENS_USED} tokens used of ${TOKEN_BUDGET} budget (${UTIL_PCT}%). This ${TOOL_NAME} call is estimated at ~${ESTIMATED} tokens, bringing projected total to ${PROJECTED} (${OVER_BY} over budget). You may continue, but please inform the user that the session has exceeded its token budget and ask if they wish to proceed. "
  elif [ "$UTIL_PCT" -ge 90 ]; then
    REMAINING=$((TOKEN_BUDGET - TOKENS_USED))
    ALL_CONTEXT+="BUDGET ADVISORY: Session at ${UTIL_PCT}% of token budget (${TOKENS_USED}/${TOKEN_BUDGET}). ~${REMAINING} tokens remaining. Consider wrapping up or informing the user. "
  fi
fi

# Build enriched payload with session_state for sub-hooks that need it
ENRICHED_PAYLOAD=$(echo "$PAYLOAD" | jq --argjson state "$STATE" '. + {session_state: $state}')

# --- Sub-hook 2: Scope Boundary Guard (SO-03, isolated) ---
if [ -x "$SCRIPT_DIR/scope_boundary_guard.sh" ]; then
  SCOPE_OUTPUT=""
  SCOPE_OUTPUT=$(echo "$PAYLOAD" | "$SCRIPT_DIR/scope_boundary_guard.sh" 2>/dev/null) || true
  if [ -n "$SCOPE_OUTPUT" ]; then
    SCOPE_CTX=$(echo "$SCOPE_OUTPUT" | jq -r '.hookSpecificOutput.additionalContext // empty' 2>/dev/null) || true
    if [ -n "$SCOPE_CTX" ]; then
      ALL_CONTEXT+="$SCOPE_CTX "
    fi
  fi
fi

# --- Sub-hook 3: Prohibitions Enforcer (SO-10, isolated) ---
if [ -x "$SCRIPT_DIR/prohibitions_enforcer.sh" ]; then
  PROHIB_OUTPUT=""
  PROHIB_OUTPUT=$(echo "$PAYLOAD" | "$SCRIPT_DIR/prohibitions_enforcer.sh" 2>/dev/null) || true
  if [ -n "$PROHIB_OUTPUT" ]; then
    PROHIB_CTX=$(echo "$PROHIB_OUTPUT" | jq -r '.hookSpecificOutput.additionalContext // empty' 2>/dev/null) || true
    if [ -n "$PROHIB_CTX" ]; then
      ALL_CONTEXT+="$PROHIB_CTX "
    fi
  fi
fi

# --- Sub-hook 4: Pre-Work Validator (SO-15, isolated) ---
# Receives enriched payload with session_state; returns hook_state + advisory
if [ -x "$SCRIPT_DIR/pre_work_validator.sh" ]; then
  PREWORK_OUTPUT=""
  PREWORK_OUTPUT=$(echo "$ENRICHED_PAYLOAD" | "$SCRIPT_DIR/pre_work_validator.sh" 2>/dev/null) || true
  if [ -n "$PREWORK_OUTPUT" ]; then
    PREWORK_CTX=$(echo "$PREWORK_OUTPUT" | jq -r '.additionalContext // empty' 2>/dev/null) || true
    if [ -n "$PREWORK_CTX" ]; then
      ALL_CONTEXT+="$PREWORK_CTX "
    fi
    # Persist pre_work_validator state if validation passed
    PW_VALIDATED=$(echo "$PREWORK_OUTPUT" | jq -r '.hook_state.pre_work_validator.validated // empty' 2>/dev/null) || true
    if [ "$PW_VALIDATED" = "true" ]; then
      STATE=$(echo "$STATE" | jq '.hook_state.pre_work_validator = {"validated": true}')
      echo "$STATE" | save_state 2>/dev/null || true
    fi
  fi
fi

# Log pre_tool_use event to event log
EVENT_LOG="$PROJECT_DIR/.admiral/event_log.jsonl"
TRACE_ID=$(echo "$STATE" | jq -r '.trace_id // "unknown"')
TOOL_CALL_COUNT=$(echo "$STATE" | jq -r '.tool_call_count // 0')
jq -n --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --arg trace "$TRACE_ID" \
      --arg tool "$TOOL_NAME" \
      --argjson count "$TOOL_CALL_COUNT" \
      --argjson tokens "$TOKENS_USED" \
      '{event: "pre_tool_use", timestamp: $ts, trace_id: $trace, tool: $tool, tool_call_count: $count, tokens_used: $tokens}' \
      >> "$EVENT_LOG" 2>/dev/null || true

# Emit combined advisory context if any sub-hooks fired
if [ -n "$ALL_CONTEXT" ]; then
  jq -n --arg ctx "$ALL_CONTEXT" '{
    "hookSpecificOutput": {
      "hookEventName": "PreToolUse",
      "permissionDecision": "allow",
      "additionalContext": $ctx
    }
  }'
fi

# Always allow
exit 0
