#!/bin/bash
# Admiral Framework — Brain Writer Library (B-01)
# Provides functions for hooks to automatically create brain entries.
# Called by enforcement hooks to record decisions, violations, patterns.

BRAIN_WRITER_PROJECT="${BRAIN_WRITER_PROJECT:-helm}"

# Write a brain entry from a hook. Non-blocking — failures are logged, not raised.
# Usage: brain_write <category> <title> <content> [source_hook]
brain_write() {
  local category="$1"
  local title="$2"
  local content="$3"
  local source_hook="${4:-hook}"

  local project_dir="${CLAUDE_PROJECT_DIR:-.}"
  local brain_record="$project_dir/admiral/bin/brain_record"

  if [ ! -x "$brain_record" ]; then
    return 0
  fi

  # Non-blocking: suppress all output to avoid polluting hook JSON responses
  "$brain_record" "$BRAIN_WRITER_PROJECT" "$category" "$title" "$content" "$source_hook" >/dev/null 2>&1 || true
}

# Record a policy violation (from prohibitions_enforcer, scope_boundary_guard)
brain_record_violation() {
  local hook_name="$1"
  local violation_type="$2"
  local details="$3"
  local tool_name="${4:-unknown}"

  brain_write "failure" \
    "Policy violation: $violation_type" \
    "Hook: $hook_name. Tool: $tool_name. $details" \
    "$hook_name"
}

# Record a pattern detection (from loop_detector, context_health_check)
brain_record_pattern() {
  local hook_name="$1"
  local pattern_name="$2"
  local details="$3"

  brain_write "pattern" \
    "Pattern detected: $pattern_name" \
    "Hook: $hook_name. $details" \
    "$hook_name"
}

# Record a decision made by a hook
brain_record_decision() {
  local hook_name="$1"
  local decision="$2"
  local rationale="$3"

  brain_write "decision" \
    "$decision" \
    "Hook: $hook_name. Rationale: $rationale" \
    "$hook_name"
}

# Record a lesson learned from hook outcomes
brain_record_lesson() {
  local hook_name="$1"
  local lesson="$2"
  local context="$3"

  brain_write "lesson" \
    "$lesson" \
    "Hook: $hook_name. Context: $context" \
    "$hook_name"
}
