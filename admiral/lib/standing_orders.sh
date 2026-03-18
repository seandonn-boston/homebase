#!/bin/bash
# Admiral Framework — Standing Orders Loader
# Reads SO data files and renders them into a text block for context injection

SO_DIR="${SO_DIR:-$CLAUDE_PROJECT_DIR/admiral/standing-orders}"

# Render all Standing Orders as a text block for context injection
render_standing_orders() {
  local output=""
  output+="================================================================\n"
  output+="ADMIRAL STARTER PROFILE — STANDING ORDERS\n"
  output+="================================================================\n\n"
  output+="These are non-negotiable governance rules. They apply to every\n"
  output+="action you take, every output you produce, every decision you make.\n"
  output+="Hooks enforce critical orders deterministically.\n\n"

  local count=0
  for so_file in "$SO_DIR"/so*.json; do
    [ -f "$so_file" ] || continue
    count=$((count + 1))

    local title rules_count
    title=$(jq -r '.title' "$so_file")
    rules_count=$(jq -r '.rules | length' "$so_file")

    output+="--- SO-$(printf '%02d' $count): ${title} ---\n"

    local i=0
    while [ $i -lt "$rules_count" ]; do
      local rule
      rule=$(jq -r ".rules[$i]" "$so_file")
      output+="  - ${rule}\n"
      i=$((i + 1))
    done
    output+="\n"
  done

  output+="================================================================\n"
  output+="ACTIVE ENFORCEMENT HOOKS\n"
  output+="================================================================\n"
  output+="- session_start_adapter (SessionStart): Initializes session state and loads standing orders\n"
  output+="- context_baseline (SessionStart): Records initial context metrics\n"
  output+="- pre_tool_use_adapter (PreToolUse): Runs scope guard, prohibitions, and pre-work validation\n"
  output+="- scope_boundary_guard (PreToolUse): Enforces file/directory access boundaries\n"
  output+="- prohibitions_enforcer (PreToolUse): Blocks prohibited operations\n"
  output+="- pre_work_validator (PreToolUse): Validates pre-work requirements before tool use\n"
  output+="- post_tool_use_adapter (PostToolUse): Runs token tracking, loop detection, and compliance hooks\n"
  output+="- token_budget_tracker (PostToolUse): Tracks token usage, warns at 90% and 100%\n"
  output+="- loop_detector (PostToolUse): Warns on error loops at 3 repeats (advisory, never blocks)\n"
  output+="- zero_trust_validator (PostToolUse): Validates external data interactions\n"
  output+="- compliance_ethics_advisor (PostToolUse): Flags compliance and ethics concerns\n"
  output+="- brain_context_router (PostToolUse): Routes decision context to Brain B1\n"
  output+="- context_health_check (PostToolUse, every 10th call): Validates context integrity (advisory)\n\n"

  output+="TOKEN BUDGET: Unlimited by default (set token_budget > 0 for advisory tracking)\n"
  output+="DESIGN PRINCIPLE: All hooks are advisory — no hook can block tool use or create deadlocks\n"
  output+="================================================================\n"

  echo -e "$output"
}

# Get just the count of Standing Orders loaded
count_standing_orders() {
  local count=0
  for so_file in "$SO_DIR"/so*.json; do
    [ -f "$so_file" ] || continue
    count=$((count + 1))
  done
  echo "$count"
}
