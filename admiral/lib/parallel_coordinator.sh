#!/bin/bash
# Admiral Framework — Parallel Execution Coordinator (S-12)
# Coordinates parallel agent tasks with dependency tracking.
# Schedules independent tasks concurrently, handles partial failure.

PARALLEL_DIR="${CLAUDE_PROJECT_DIR:-.}/.admiral/parallel"

# Create a parallel execution plan
# Usage: parallel_create_plan <plan_name> <tasks_json>
# tasks_json: [{"task_id": "t1", "agent_id": "a1", "depends_on": [], "task": "..."}]
parallel_create_plan() {
  local plan_name="$1"
  local tasks_json="$2"

  mkdir -p "$PARALLEL_DIR"

  local plan_id
  plan_id="plan-$(date +%s)-$$"
  local filepath="$PARALLEL_DIR/${plan_id}.json"

  jq -n --arg id "$plan_id" \
        --arg name "$plan_name" \
        --argjson tasks "$tasks_json" \
        --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '{
          plan_id: $id,
          name: $name,
          status: "pending",
          tasks: ($tasks | map(. + {status: "pending", result: null})),
          created_at: $ts,
          abort_policy: "continue_on_failure"
        }' > "$filepath"

  echo "$filepath"
}

# Get next executable tasks (no unresolved dependencies)
# Usage: parallel_get_ready <plan_file>
parallel_get_ready() {
  local filepath="$1"
  [ -f "$filepath" ] || { echo "[]"; return 0; }

  jq '[.tasks[] | select(
    .status == "pending" and
    ((.depends_on // []) | all(. as $dep | input.tasks[] | select(.task_id == $dep) | .status == "completed"))
  )]' "$filepath" 2>/dev/null | tr -d '\r' || echo "[]"

  # Simpler approach: get all pending tasks with no unresolved deps
  jq '
    (.tasks | map(select(.status == "completed")) | map(.task_id)) as $done |
    [.tasks[] | select(.status == "pending" and ((.depends_on // []) - $done | length == 0))]
  ' "$filepath" 2>/dev/null | tr -d '\r'
}

# Mark a task as started
parallel_start_task() {
  local filepath="$1"
  local task_id="$2"
  [ -f "$filepath" ] || return 1

  jq --arg tid "$task_id" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '(.tasks[] | select(.task_id == $tid)) |= (.status = "running" | .started_at = $ts)' \
    "$filepath" > "${filepath}.tmp" && mv "${filepath}.tmp" "$filepath"
}

# Mark a task as completed
parallel_complete_task() {
  local filepath="$1"
  local task_id="$2"
  local result="${3:-success}"
  [ -f "$filepath" ] || return 1

  jq --arg tid "$task_id" --arg res "$result" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '(.tasks[] | select(.task_id == $tid)) |= (.status = "completed" | .result = $res | .completed_at = $ts)' \
    "$filepath" > "${filepath}.tmp" && mv "${filepath}.tmp" "$filepath"

  # Check if all tasks done
  local remaining
  remaining=$(jq '[.tasks[] | select(.status != "completed" and .status != "failed")] | length' "$filepath" | tr -d '\r')
  if [ "$remaining" -eq 0 ]; then
    jq '.status = "completed"' "$filepath" > "${filepath}.tmp" && mv "${filepath}.tmp" "$filepath"
  fi
}

# Mark a task as failed
parallel_fail_task() {
  local filepath="$1"
  local task_id="$2"
  local error="${3:-unknown error}"
  [ -f "$filepath" ] || return 1

  jq --arg tid "$task_id" --arg err "$error" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '(.tasks[] | select(.task_id == $tid)) |= (.status = "failed" | .error = $err | .completed_at = $ts)' \
    "$filepath" > "${filepath}.tmp" && mv "${filepath}.tmp" "$filepath"

  # Check abort policy
  local policy
  policy=$(jq -r '.abort_policy' "$filepath" | tr -d '\r')
  if [ "$policy" = "abort_on_failure" ]; then
    jq '.status = "aborted"' "$filepath" > "${filepath}.tmp" && mv "${filepath}.tmp" "$filepath"
  fi
}

# Get plan status summary
parallel_status() {
  local filepath="$1"
  [ -f "$filepath" ] || { echo '{"error": "plan not found"}'; return 1; }

  jq '{
    plan_id: .plan_id,
    status: .status,
    total: (.tasks | length),
    pending: ([.tasks[] | select(.status == "pending")] | length),
    running: ([.tasks[] | select(.status == "running")] | length),
    completed: ([.tasks[] | select(.status == "completed")] | length),
    failed: ([.tasks[] | select(.status == "failed")] | length)
  }' "$filepath" | tr -d '\r'
}
