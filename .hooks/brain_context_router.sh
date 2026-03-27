#!/bin/bash
# Admiral Framework — Brain Context Router Hook
# Detects Propose/Escalate-tier decisions made without a preceding brain_query.
# Implements the Context Source Routing chain from Part 2 and SO-11.
#
# DESIGN: Advisory only (exit 0 always). Isolated. Fail-open.
# INPUT: JSON on stdin with tool_name, tool_input, session_state
# OUTPUT: JSON with optional alert and updated hook_state.brain_context_router
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Source brain retriever for active context injection (B-02)
if [ -f "$PROJECT_DIR/admiral/lib/brain_retriever.sh" ]; then
  source "$PROJECT_DIR/admiral/lib/brain_retriever.sh"
fi

# Source hook utilities
if [ -f "$PROJECT_DIR/admiral/lib/hook_utils.sh" ]; then
  source "$PROJECT_DIR/admiral/lib/hook_utils.sh"
fi
hook_init "brain_context_router"

# Read payload from stdin
PAYLOAD=$(cat)

TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // "unknown"')
TOOL_CALL_COUNT=$(echo "$PAYLOAD" | jq -r '.session_state.tool_call_count // 0')

# Load current brain_context_router state from session
BCR_STATE=$(echo "$PAYLOAD" | jq '.session_state.hook_state.brain_context_router // {
  "brain_queries_count": 0,
  "last_brain_query_tool_call": 0,
  "propose_without_brain": 0,
  "escalate_without_brain": 0
}')

BRAIN_QUERIES=$(echo "$BCR_STATE" | jq -r '.brain_queries_count // 0')
LAST_QUERY_AT=$(echo "$BCR_STATE" | jq -r '.last_brain_query_tool_call // 0')
PROPOSE_BYPASS=$(echo "$BCR_STATE" | jq -r '.propose_without_brain // 0')
ESCALATE_BYPASS=$(echo "$BCR_STATE" | jq -r '.escalate_without_brain // 0')

ALERT=""

# --- Track brain_query calls ---
# Detect Bash tool calls that invoke brain_query or brain_retrieve
if [ "$TOOL_NAME" = "Bash" ]; then
  COMMAND=$(echo "$PAYLOAD" | jq -r '.tool_input.command // ""' | head -c 2000)
  if echo "$COMMAND" | grep -qiE 'brain_query|brain_retrieve'; then
    BRAIN_QUERIES=$((BRAIN_QUERIES + 1))
    LAST_QUERY_AT=$TOOL_CALL_COUNT
  fi
fi

# --- Detect Propose/Escalate-tier decisions ---
# Check Write and Edit tool calls for decision-tier markers
DETECTED_TIER=""
if [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "Edit" ]; then
  # Extract content to scan (truncate for performance)
  CONTENT=""
  if [ "$TOOL_NAME" = "Write" ]; then
    CONTENT=$(echo "$PAYLOAD" | jq -r '.tool_input.content // ""' | head -c 2000)
  elif [ "$TOOL_NAME" = "Edit" ]; then
    CONTENT=$(echo "$PAYLOAD" | jq -r '.tool_input.new_string // ""' | head -c 2000)
  fi

  if [ -n "$CONTENT" ]; then
    if echo "$CONTENT" | grep -qiE 'ESCALATE:|ESCALATE\*\*|Decision Tier:\s*Escalate'; then
      DETECTED_TIER="escalate"
    elif echo "$CONTENT" | grep -qiE 'PROPOSE:|PROPOSE\*\*|Decision Tier:\s*Propose'; then
      DETECTED_TIER="propose"
    fi
  fi
fi

# --- Evaluate routing compliance ---
STALENESS_THRESHOLD=20

BRAIN_CONTEXT=""
if [ -n "$DETECTED_TIER" ]; then
  if [ "$BRAIN_QUERIES" -eq 0 ]; then
    # No brain_query at all in this session — BRAIN BYPASS
    if [ "$DETECTED_TIER" = "escalate" ]; then
      ESCALATE_BYPASS=$((ESCALATE_BYPASS + 1))
      ALERT="BRAIN BYPASS: Escalate-tier decision detected with no brain_query in this session. SO-11 requires checking the Brain before high-tier decisions."
    else
      PROPOSE_BYPASS=$((PROPOSE_BYPASS + 1))
      ALERT="BRAIN BYPASS: Propose-tier decision detected with no brain_query in this session. SO-11 requires checking the Brain before high-tier decisions."
    fi
  elif [ $((TOOL_CALL_COUNT - LAST_QUERY_AT)) -gt $STALENESS_THRESHOLD ]; then
    # brain_query happened but is stale
    ALERT="BRAIN STALE: ${DETECTED_TIER^}-tier decision detected but last brain_query was $((TOOL_CALL_COUNT - LAST_QUERY_AT)) tool calls ago. Consider refreshing with a new query."
  fi

  # B-02: Active brain retrieval — inject matching context for Propose/Escalate
  if type brain_retrieve_context &>/dev/null && type brain_extract_keywords &>/dev/null; then
    KEYWORDS=$(brain_extract_keywords "$CONTENT" 2>/dev/null || echo "")
    if [ -n "$KEYWORDS" ]; then
      # Query brain with first keyword (most specific)
      FIRST_KEYWORD=$(echo "$KEYWORDS" | awk '{print $1}')
      BRAIN_ENTRIES=$(brain_retrieve_context "$FIRST_KEYWORD" "" 3 2>/dev/null || echo "[]")
      ENTRY_COUNT=$(echo "$BRAIN_ENTRIES" | tr -d '\r' | jq 'length' 2>/dev/null || echo "0")
      if [ "$ENTRY_COUNT" -gt 0 ]; then
        BRAIN_CONTEXT=$(brain_format_context "$BRAIN_ENTRIES" 2>/dev/null || echo "")
      fi
    fi
  fi
fi

# --- Build output ---
UPDATED_STATE=$(jq -n \
  --argjson bq "$BRAIN_QUERIES" \
  --argjson lq "$LAST_QUERY_AT" \
  --argjson pb "$PROPOSE_BYPASS" \
  --argjson eb "$ESCALATE_BYPASS" \
  '{
    brain_queries_count: $bq,
    last_brain_query_tool_call: $lq,
    propose_without_brain: $pb,
    escalate_without_brain: $eb
  }')

FULL_ALERT=""
if [ -n "$ALERT" ]; then
  FULL_ALERT="$ALERT"
fi
if [ -n "$BRAIN_CONTEXT" ]; then
  FULL_ALERT="${FULL_ALERT:+$FULL_ALERT }$BRAIN_CONTEXT"
fi

if [ -n "$FULL_ALERT" ]; then
  jq -n --arg alert "$FULL_ALERT" --argjson state "$UPDATED_STATE" '{
    alert: $alert,
    hook_state: { brain_context_router: $state }
  }'
else
  jq -n --argjson state "$UPDATED_STATE" '{
    hook_state: { brain_context_router: $state }
  }'
fi

exit 0
