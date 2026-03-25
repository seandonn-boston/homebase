#!/bin/bash
# Admiral Framework — Escalation Pipeline Library (S-11)
# 5-step process: intake → Brain precedent query → resolution paths →
# Admiral decision → outcome persistence.

ESCALATION_DIR="${CLAUDE_PROJECT_DIR:-.}/.admiral/escalations"

# Create a new escalation
# Usage: escalation_create <agent_id> <category> <summary> <context>
escalation_create() {
  local agent_id="$1"
  local category="$2"
  local summary="$3"
  local context="$4"

  mkdir -p "$ESCALATION_DIR"

  local esc_id
  esc_id="esc-$(date +%s)-$(od -A n -t x4 -N 4 /dev/urandom 2>/dev/null | tr -d ' ' || echo "$$")"
  local timestamp
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  # Validate required fields
  if [ -z "$agent_id" ] || [ -z "$category" ] || [ -z "$summary" ]; then
    echo '{"error": "Missing required fields"}' >&2
    return 1
  fi

  # Validate category
  case "$category" in
    scope|authority|security|compliance|conflict|technical|resource) ;;
    *)
      echo '{"error": "Invalid category. Must be: scope|authority|security|compliance|conflict|technical|resource"}' >&2
      return 1
      ;;
  esac

  local filepath="$ESCALATION_DIR/${esc_id}.json"

  # Step 1: Intake classification
  jq -n \
    --arg id "$esc_id" \
    --arg agent "$agent_id" \
    --arg cat "$category" \
    --arg summary "$summary" \
    --arg ctx "$context" \
    --arg ts "$timestamp" \
    '{
      escalation_id: $id,
      agent_id: $agent,
      category: $cat,
      summary: $summary,
      context: $ctx,
      status: "intake",
      steps: {
        intake: { completed: true, timestamp: $ts },
        brain_query: { completed: false },
        resolution_paths: { completed: false, paths: [] },
        admiral_decision: { completed: false },
        outcome: { completed: false }
      },
      created_at: $ts
    }' > "$filepath"

  echo "$filepath"
}

# Step 2: Query Brain for precedent
# Usage: escalation_query_precedent <escalation_file>
escalation_query_precedent() {
  local filepath="$1"
  local project_dir="${CLAUDE_PROJECT_DIR:-.}"
  local brain_query="$project_dir/admiral/bin/brain_query"

  if [ ! -f "$filepath" ]; then
    return 1
  fi

  local summary
  summary=$(jq -r '.summary' "$filepath" | tr -d '\r')
  local category
  category=$(jq -r '.category' "$filepath" | tr -d '\r')

  # Query brain for related entries
  local precedents=""
  if [ -x "$brain_query" ]; then
    precedents=$("$brain_query" "$category" 2>/dev/null | head -20 || echo "No precedents found")
  else
    precedents="Brain query not available"
  fi

  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  jq --arg prec "$precedents" --arg ts "$ts" \
    '.steps.brain_query = { completed: true, timestamp: $ts, precedents: $prec }' \
    "$filepath" > "${filepath}.tmp" && mv "${filepath}.tmp" "$filepath"
}

# Step 3: Generate resolution paths
# Usage: escalation_generate_paths <escalation_file> <paths_json>
escalation_generate_paths() {
  local filepath="$1"
  local paths_json="$2"

  if [ ! -f "$filepath" ]; then
    return 1
  fi

  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  jq --argjson paths "$paths_json" --arg ts "$ts" \
    '.steps.resolution_paths = { completed: true, timestamp: $ts, paths: $paths }' \
    "$filepath" > "${filepath}.tmp" && mv "${filepath}.tmp" "$filepath"
}

# Step 4: Record Admiral decision
# Usage: escalation_decide <escalation_file> <decision> <rationale>
escalation_decide() {
  local filepath="$1"
  local decision="$2"
  local rationale="$3"

  if [ ! -f "$filepath" ]; then
    return 1
  fi

  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  jq --arg dec "$decision" --arg rat "$rationale" --arg ts "$ts" \
    '.steps.admiral_decision = { completed: true, timestamp: $ts, decision: $dec, rationale: $rat } | .status = "decided"' \
    "$filepath" > "${filepath}.tmp" && mv "${filepath}.tmp" "$filepath"
}

# Step 5: Record outcome
# Usage: escalation_record_outcome <escalation_file> <outcome> <impact>
escalation_record_outcome() {
  local filepath="$1"
  local outcome="$2"
  local impact="$3"

  if [ ! -f "$filepath" ]; then
    return 1
  fi

  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  jq --arg out "$outcome" --arg imp "$impact" --arg ts "$ts" \
    '.steps.outcome = { completed: true, timestamp: $ts, outcome: $out, impact: $imp } | .status = "resolved"' \
    "$filepath" > "${filepath}.tmp" && mv "${filepath}.tmp" "$filepath"

  # Record to Brain for future precedent
  local brain_record="${CLAUDE_PROJECT_DIR:-.}/admiral/bin/brain_record"
  if [ -x "$brain_record" ]; then
    local summary
    summary=$(jq -r '.summary' "$filepath" | tr -d '\r')
    local category
    category=$(jq -r '.category' "$filepath" | tr -d '\r')
    "$brain_record" "helm" "decision" \
      "Escalation resolved: $summary" \
      "Category: $category. Decision: $outcome. Impact: $impact" \
      "escalation_pipeline" 2>/dev/null || true
  fi
}

# List escalations
# Usage: escalation_list [status_filter]
escalation_list() {
  local status_filter="${1:-}"

  if [ ! -d "$ESCALATION_DIR" ]; then
    echo "[]"
    return 0
  fi

  local result="["
  local first=true
  for file in "$ESCALATION_DIR"/*.json; do
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
