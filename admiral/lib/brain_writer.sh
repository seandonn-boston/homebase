#!/bin/bash
# Admiral Framework — Brain Writer Library (B-01)
# Shared library for hooks to emit brain entries automatically.
# Called by prohibitions_enforcer, loop_detector, scope_boundary_guard, and other hooks
# to auto-record significant enforcement events to .brain/
#
# DESIGN: Non-blocking. Failures are silently ignored (hooks must not be slowed by Brain writes).
# Recursion prevention: writes to .brain/ directly, not via brain_record CLI (avoids contradiction scan loops).

BRAIN_DIR="${BRAIN_DIR:-${CLAUDE_PROJECT_DIR:-.}/.brain}"
BRAIN_PROJECT="${BRAIN_PROJECT:-helm}"

# Write a brain entry from a hook event.
# Usage: brain_write_entry <category> <title> <content> <source_hook>
# Categories: decision, outcome, lesson, context, failure, pattern
brain_write_entry() {
  local category="$1"
  local title="$2"
  local content="$3"
  local source_hook="${4:-unknown-hook}"

  # Validate category
  case "$category" in
    decision|outcome|lesson|context|failure|pattern) ;;
    *) return 0 ;; # Silent skip on invalid category
  esac

  local dir="${BRAIN_DIR}/${BRAIN_PROJECT}"
  mkdir -p "$dir" 2>/dev/null || return 0

  local timestamp
  timestamp=$(date -u +%Y%m%d-%H%M%S)
  local iso_timestamp
  iso_timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  # Generate slug from title
  local slug
  slug=$(echo "$title" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 ]//g' | tr ' ' '-' | sed 's/--*/-/g' | cut -c1-50 | sed 's/-$//')

  # Generate ID (fallback chain for environments without uuidgen)
  local id
  id=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || echo "${timestamp}-$(od -A n -t x4 -N 4 /dev/urandom 2>/dev/null | tr -d ' ' || echo 'noid')")

  local filename="${timestamp}-${category}-${slug}.json"
  local filepath="${dir}/${filename}"

  # Write entry — fail silently on any error
  jq -n \
    --arg id "$id" \
    --arg project "$BRAIN_PROJECT" \
    --arg category "$category" \
    --arg title "$title" \
    --arg content "$content" \
    --arg agent "$source_hook" \
    --arg created "$iso_timestamp" \
    '{
      id: $id,
      project: $project,
      category: $category,
      title: $title,
      content: $content,
      metadata: { tags: ["auto-recorded", "hook-generated"] },
      source_agent: $agent,
      created_at: $created
    }' > "$filepath" 2>/dev/null || return 0

  return 0
}

# Record a prohibition enforcement event
# Usage: brain_record_prohibition <what_was_blocked> <detail>
brain_record_prohibition() {
  local what="$1"
  local detail="$2"
  brain_write_entry "pattern" \
    "Prohibition enforced: ${what}" \
    "Hook blocked: ${what}. Detail: ${detail}. This pattern was detected and blocked by prohibitions_enforcer (SO-10)." \
    "prohibitions_enforcer"
}

# Record a scope boundary enforcement event
# Usage: brain_record_scope_block <path> <detail>
brain_record_scope_block() {
  local path="$1"
  local detail="$2"
  brain_write_entry "pattern" \
    "Scope boundary enforced: ${path}" \
    "Write to protected path '${path}' was blocked. ${detail}. Enforced by scope_boundary_guard (SO-03)." \
    "scope_boundary_guard"
}

# Record an error loop detection
# Usage: brain_record_loop <error_signature> <count>
brain_record_loop() {
  local sig="$1"
  local count="$2"
  brain_write_entry "failure" \
    "Error loop detected: sig ${sig}" \
    "Same error repeated ${count} times (signature: ${sig}). Loop detector (SO-06) intervened. Consider: different approach, escalation, or manual fix." \
    "loop_detector"
}

# Record an identity validation event
# Usage: brain_record_identity_event <agent_id> <result> <detail>
brain_record_identity_event() {
  local agent_id="$1"
  local result="$2"
  local detail="$3"
  brain_write_entry "context" \
    "Identity validation: ${agent_id} ${result}" \
    "Agent '${agent_id}' identity check result: ${result}. ${detail}" \
    "identity_validation"
}

# Record an escalation event
# Usage: brain_record_escalation <subject> <severity> <detail>
brain_record_escalation() {
  local subject="$1"
  local severity="$2"
  local detail="$3"
  brain_write_entry "decision" \
    "Escalation: ${subject}" \
    "Severity: ${severity}. ${detail}" \
    "escalation_pipeline"
}

# Record a generic hook observation
# Usage: brain_record_observation <hook_name> <title> <content>
brain_record_observation() {
  local hook_name="$1"
  local title="$2"
  local content="$3"
  brain_write_entry "lesson" "$title" "$content" "$hook_name"
}
