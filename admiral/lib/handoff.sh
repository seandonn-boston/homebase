#!/bin/bash
# Admiral Framework — Handoff Protocol Library (S-10)
# Agent-to-agent task handoff with validation, logging, and history.

HANDOFF_DIR="${CLAUDE_PROJECT_DIR:-.}/.admiral/handoffs"

# Create a new handoff
# Usage: handoff_create <from_agent> <to_agent> <task> <deliverable> [context_files_json]
handoff_create() {
  local from_agent="$1"
  local to_agent="$2"
  local task="$3"
  local deliverable="$4"
  local context_files="${5:-[]}"

  mkdir -p "$HANDOFF_DIR"

  local handoff_id
  handoff_id="handoff-$(date +%s)-$(od -A n -t x4 -N 4 /dev/urandom 2>/dev/null | tr -d ' ' || echo "$$")"
  local timestamp
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  # Validate required fields
  if [ -z "$from_agent" ] || [ -z "$to_agent" ] || [ -z "$task" ] || [ -z "$deliverable" ]; then
    echo '{"error": "Missing required fields: from_agent, to_agent, task, deliverable"}' >&2
    return 1
  fi

  # Validate agents are different
  if [ "$from_agent" = "$to_agent" ]; then
    echo '{"error": "from_agent and to_agent must be different"}' >&2
    return 1
  fi

  local filepath="$HANDOFF_DIR/${handoff_id}.json"

  jq -n \
    --arg id "$handoff_id" \
    --arg from "$from_agent" \
    --arg to "$to_agent" \
    --arg task "$task" \
    --arg deliverable "$deliverable" \
    --argjson ctx "$context_files" \
    --arg ts "$timestamp" \
    '{
      handoff_id: $id,
      from_agent: $from,
      to_agent: $to,
      task: $task,
      deliverable: $deliverable,
      status: "pending",
      context_files: $ctx,
      acceptance_criteria: [],
      constraints: {},
      created_at: $ts
    }' > "$filepath"

  echo "$filepath"
}

# Validate a handoff for completeness
# Usage: handoff_validate <handoff_file>
handoff_validate() {
  local filepath="$1"

  if [ ! -f "$filepath" ]; then
    jq -n '{"valid": false, "errors": ["Handoff file not found"]}'
    return 1
  fi

  local errors="[]"

  # Check required fields
  for field in handoff_id from_agent to_agent task deliverable status; do
    local value
    value=$(jq -r ".$field // \"\"" "$filepath" | tr -d '\r')
    if [ -z "$value" ] || [ "$value" = "null" ]; then
      errors=$(echo "$errors" | jq --arg f "$field" '. + ["Missing required field: " + $f]')
    fi
  done

  # Check status is valid
  local status
  status=$(jq -r '.status' "$filepath" | tr -d '\r')
  case "$status" in
    pending|accepted|rejected|completed|failed) ;;
    *)
      errors=$(echo "$errors" | jq --arg s "$status" '. + ["Invalid status: " + $s]')
      ;;
  esac

  local error_count
  error_count=$(echo "$errors" | jq 'length' | tr -d '\r')

  if [ "$error_count" -eq 0 ]; then
    jq -n '{"valid": true, "errors": []}'
  else
    jq -n --argjson errs "$errors" '{"valid": false, "errors": $errs}'
    return 1
  fi
}

# Accept a handoff
# Usage: handoff_accept <handoff_file>
handoff_accept() {
  local filepath="$1"

  if [ ! -f "$filepath" ]; then
    return 1
  fi

  jq '.status = "accepted"' "$filepath" > "${filepath}.tmp" && mv "${filepath}.tmp" "$filepath"
}

# Reject a handoff
# Usage: handoff_reject <handoff_file> <reason>
handoff_reject() {
  local filepath="$1"
  local reason="$2"

  if [ ! -f "$filepath" ]; then
    return 1
  fi

  jq --arg reason "$reason" '.status = "rejected" | .rejection_reason = $reason' \
    "$filepath" > "${filepath}.tmp" && mv "${filepath}.tmp" "$filepath"
}

# Complete a handoff
# Usage: handoff_complete <handoff_file>
handoff_complete() {
  local filepath="$1"

  if [ ! -f "$filepath" ]; then
    return 1
  fi

  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  jq --arg ts "$ts" '.status = "completed" | .completed_at = $ts' \
    "$filepath" > "${filepath}.tmp" && mv "${filepath}.tmp" "$filepath"
}

# List all handoffs
# Usage: handoff_list [status_filter]
handoff_list() {
  local status_filter="${1:-}"

  if [ ! -d "$HANDOFF_DIR" ]; then
    echo "[]"
    return 0
  fi

  local result="["
  local first=true
  for file in "$HANDOFF_DIR"/*.json; do
    [ -f "$file" ] || continue

    if [ -n "$status_filter" ]; then
      local status
      status=$(jq -r '.status' "$file" | tr -d '\r')
      [ "$status" = "$status_filter" ] || continue
    fi

    if [ "$first" = "true" ]; then
      first=false
    else
      result+=","
    fi
    result+=$(jq -c '.' "$file" | tr -d '\r')
  done
  result+="]"
  echo "$result"
}
