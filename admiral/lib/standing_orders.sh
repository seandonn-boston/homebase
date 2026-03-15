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
  output+="- token_budget_gate (PreToolUse): Blocks at 100% budget\n"
  output+="- token_budget_tracker (PostToolUse): Warns at 80%, escalates at 90%\n"
  output+="- loop_detector (PostToolUse): Breaks error loops at 3 repeats\n"
  output+="- context_baseline (SessionStart): Records initial context metrics\n"
  output+="- context_health_check (PostToolUse, every 10th call): Validates context integrity\n\n"

  output+="TOKEN BUDGET: 200,000 tokens (default)\n"
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
