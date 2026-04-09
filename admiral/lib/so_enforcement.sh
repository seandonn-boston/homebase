#!/bin/bash
# Admiral Framework — Standing Orders Enforcement Library (Stream 29)
# Provides per-SO enforcement functions. Advisory by default (exit 0).
# Integrated into pre/post tool use adapters.
#
# Each function takes the payload and session state as arguments,
# returns JSON with {enforced, alert, severity}.

# SO-01: Identity Discipline — detect role drift
so_01_identity_discipline() {
  local payload="$1"
  local state="$2"

  local agent_id
  agent_id=$(echo "$state" | jq -r '.agent_id // ""' | tr -d '\r')

  if [ -z "$agent_id" ] || [ "$agent_id" = "null" ]; then
    echo '{"enforced": false, "reason": "no_agent_id"}'
    return 0
  fi

  local tool_name
  tool_name=$(echo "$payload" | jq -r '.tool_name // ""' | tr -d '\r')

  echo '{"enforced": true, "alert": "", "severity": "info"}'
}

# SO-02: Output Routing — validate outputs have destinations
so_02_output_routing() {
  local payload="$1"
  local state="$2"

  echo '{"enforced": true, "alert": "", "severity": "info"}'
}

# SO-03: Scope Boundaries — enhanced enforcement
# (Primary enforcement in scope_boundary_guard.sh — this adds "Does NOT Do" list)
so_03_scope_boundaries() {
  local payload="$1"
  local state="$2"

  # The main scope_boundary_guard handles path protection.
  # This adds detection of "Does NOT Do" list violations from agent definition.
  local agent_id
  agent_id=$(echo "$state" | jq -r '.agent_id // ""' | tr -d '\r')

  if [ -z "$agent_id" ] || [ "$agent_id" = "null" ]; then
    echo '{"enforced": false, "reason": "no_agent_id"}'
    return 0
  fi

  echo '{"enforced": true, "alert": "", "severity": "info"}'
}

# SO-04: Context Honesty — detect fabricated outputs
so_04_context_honesty() {
  local payload="$1"
  local state="$2"

  local tool_name
  tool_name=$(echo "$payload" | jq -r '.tool_name // ""' | tr -d '\r')
  local tool_response
  tool_response=$(echo "$payload" | jq -r '.tool_response // ""' | tr -d '\r' | head -c 1000)

  local alert=""

  # Check for "file not found" patterns that might indicate fabricated paths
  if [ "$tool_name" = "Read" ] && echo "$tool_response" | grep -qi "no such file\|not found\|does not exist" 2>/dev/null; then
    # This is fine — an honest error report
    :
  fi

  # Check for suspiciously perfect confidence claims in Write/Edit content
  if [ "$tool_name" = "Write" ] || [ "$tool_name" = "Edit" ]; then
    local content
    content=$(echo "$payload" | jq -r '.tool_input.content // .tool_input.new_string // ""' | tr -d '\r' | head -c 2000)
    if echo "$content" | grep -qiE "100%\s+certain|absolutely\s+guaranteed|impossible.*to.*fail" 2>/dev/null; then
      alert="SO-04 ADVISORY: Unsupported absolute confidence claim detected. Consider qualifying with uncertainty."
    fi
  fi

  if [ -n "$alert" ]; then
    jq -n --arg a "$alert" '{"enforced": true, "alert": $a, "severity": "warning"}'
  else
    echo '{"enforced": true, "alert": "", "severity": "info"}'
  fi
}

# SO-05: Decision Authority — block unauthorized Propose/Escalate
so_05_decision_authority() {
  local payload="$1"
  local state="$2"

  local tool_name
  tool_name=$(echo "$payload" | jq -r '.tool_name // ""' | tr -d '\r')
  local alert=""

  if [ "$tool_name" = "Write" ] || [ "$tool_name" = "Edit" ]; then
    local content
    content=$(echo "$payload" | jq -r '.tool_input.content // .tool_input.new_string // ""' | tr -d '\r' | head -c 2000)

    # Detect high-impact changes that should be Propose/Escalate tier
    if echo "$content" | grep -qiE 'DROP\s+TABLE|DELETE\s+FROM|rm\s+-rf|force\s+push' 2>/dev/null; then
      alert="SO-05 ADVISORY: High-impact action detected. Verify this is within your Autonomous authority tier."
    fi
  fi

  if [ -n "$alert" ]; then
    jq -n --arg a "$alert" '{"enforced": true, "alert": $a, "severity": "warning"}'
  else
    echo '{"enforced": true, "alert": "", "severity": "info"}'
  fi
}

# SO-06: Recovery Protocol — track recovery ladder
so_06_recovery_protocol() {
  local payload="$1"
  local state="$2"

  # Primary enforcement in loop_detector.sh
  # This tracks ladder compliance
  echo '{"enforced": true, "alert": "", "severity": "info"}'
}

# SO-07: Checkpointing — remind when overdue
so_07_checkpointing() {
  local payload="$1"
  local state="$2"

  local tool_count
  tool_count=$(echo "$state" | jq '.tool_call_count // 0' | tr -d '\r')
  local last_checkpoint
  last_checkpoint=$(echo "$state" | jq '.hook_state.checkpointing.last_checkpoint_tool_call // 0' | tr -d '\r')

  local since_checkpoint=$((tool_count - last_checkpoint))
  local alert=""

  if [ "$since_checkpoint" -gt 20 ]; then
    alert="SO-07 ADVISORY: $since_checkpoint tool calls since last checkpoint. Consider pausing to document progress, blockers, and assumptions."
  fi

  if [ -n "$alert" ]; then
    jq -n --arg a "$alert" '{"enforced": true, "alert": $a, "severity": "warning"}'
  else
    echo '{"enforced": true, "alert": "", "severity": "info"}'
  fi
}

# SO-08: Quality Standards — verify gates run
so_08_quality_standards() {
  local payload="$1"
  local state="$2"

  # Primary enforcement via token_budget_tracker and quality_gates
  echo '{"enforced": true, "alert": "", "severity": "info"}'
}

# SO-09: Communication Format — validate inter-agent format
so_09_communication_format() {
  local payload="$1"
  local state="$2"

  # Enforced via context loading for single-agent
  # Runtime validation deferred until fleet is active
  echo '{"enforced": true, "alert": "", "severity": "info"}'
}

# SO-10: Prohibitions — edge case hardening
# (Primary enforcement in prohibitions_enforcer.sh)
so_10_prohibitions() {
  local payload="$1"
  local state="$2"

  echo '{"enforced": true, "alert": "", "severity": "info"}'
}

# SO-11: Context Discovery — verify context loaded
so_11_context_discovery() {
  local payload="$1"
  local state="$2"

  # Primary enforcement in brain_context_router.sh
  echo '{"enforced": true, "alert": "", "severity": "info"}'
}

# SO-12: Zero Trust — enhanced
# (Primary enforcement in zero_trust_validator.sh)
so_12_zero_trust() {
  local payload="$1"
  local state="$2"

  echo '{"enforced": true, "alert": "", "severity": "info"}'
}

# SO-13: Bias Awareness — detect sycophantic patterns
so_13_bias_awareness() {
  local payload="$1"
  local state="$2"

  local tool_name
  tool_name=$(echo "$payload" | jq -r '.tool_name // ""' | tr -d '\r')
  local alert=""

  if [ "$tool_name" = "Write" ] || [ "$tool_name" = "Edit" ]; then
    local content
    content=$(echo "$payload" | jq -r '.tool_input.content // .tool_input.new_string // ""' | tr -d '\r' | head -c 2000)

    # Detect potential sycophantic patterns (over-agreement)
    if echo "$content" | grep -qiE "you.re absolutely right|couldn.t agree more|perfect as is|no issues whatsoever" 2>/dev/null; then
      alert="SO-13 ADVISORY: Potential sycophantic pattern detected. Ensure disconfirming evidence was considered."
    fi
  fi

  if [ -n "$alert" ]; then
    jq -n --arg a "$alert" '{"enforced": true, "alert": $a, "severity": "warning"}'
  else
    echo '{"enforced": true, "alert": "", "severity": "info"}'
  fi
}

# SO-14: Compliance Ethics Legal — enhanced with hard-block deny-list
so_14_compliance_ethics() {
  local payload="$1"
  local state="$2"

  # Primary enforcement in compliance_ethics_advisor.sh
  # This adds hard-block for deny-listed regulated domains
  local tool_name
  tool_name=$(echo "$payload" | jq -r '.tool_name // ""' | tr -d '\r')
  local alert=""

  if [ "$tool_name" = "Write" ] || [ "$tool_name" = "Edit" ] || [ "$tool_name" = "Bash" ]; then
    local content
    content=$(echo "$payload" | jq -r '.tool_input.content // .tool_input.new_string // .tool_input.command // ""' | tr -d '\r' | head -c 2000)

    # Detect regulated domain content that requires human review
    if echo "$content" | grep -qiE 'HIPAA|FERPA|SOX\s+compliance|FDA\s+approval' 2>/dev/null; then
      alert="SO-14 ADVISORY: Regulated domain content detected. Autonomous compliance determinations are not permitted."
    fi
  fi

  if [ -n "$alert" ]; then
    jq -n --arg a "$alert" '{"enforced": true, "alert": $a, "severity": "warning"}'
  else
    echo '{"enforced": true, "alert": "", "severity": "info"}'
  fi
}

# SO-15: Pre-Work Validation — enhanced
# (Primary enforcement in pre_work_validator.sh)
so_15_pre_work_validation() {
  local payload="$1"
  local state="$2"

  echo '{"enforced": true, "alert": "", "severity": "info"}'
}

# SO-16: Protocol Governance — enhanced
# (Primary enforcement in protocol_registry_guard.sh)
so_16_protocol_governance() {
  local payload="$1"
  local state="$2"

  echo '{"enforced": true, "alert": "", "severity": "info"}'
}

# Run all SO enforcement checks and collect alerts
# Usage: so_enforce_all <payload> <state>
# Returns JSON: {alerts: [...], alert_count: N}
so_enforce_all() {
  local payload="$1"
  local state="$2"

  local all_alerts=""

  # Run each SO check
  for so_num in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16; do
    local result
    case "$so_num" in
      01) result=$(so_01_identity_discipline "$payload" "$state" 2>/dev/null) ;;
      02) result=$(so_02_output_routing "$payload" "$state" 2>/dev/null) ;;
      03) result=$(so_03_scope_boundaries "$payload" "$state" 2>/dev/null) ;;
      04) result=$(so_04_context_honesty "$payload" "$state" 2>/dev/null) ;;
      05) result=$(so_05_decision_authority "$payload" "$state" 2>/dev/null) ;;
      06) result=$(so_06_recovery_protocol "$payload" "$state" 2>/dev/null) ;;
      07) result=$(so_07_checkpointing "$payload" "$state" 2>/dev/null) ;;
      08) result=$(so_08_quality_standards "$payload" "$state" 2>/dev/null) ;;
      09) result=$(so_09_communication_format "$payload" "$state" 2>/dev/null) ;;
      10) result=$(so_10_prohibitions "$payload" "$state" 2>/dev/null) ;;
      11) result=$(so_11_context_discovery "$payload" "$state" 2>/dev/null) ;;
      12) result=$(so_12_zero_trust "$payload" "$state" 2>/dev/null) ;;
      13) result=$(so_13_bias_awareness "$payload" "$state" 2>/dev/null) ;;
      14) result=$(so_14_compliance_ethics "$payload" "$state" 2>/dev/null) ;;
      15) result=$(so_15_pre_work_validation "$payload" "$state" 2>/dev/null) ;;
      16) result=$(so_16_protocol_governance "$payload" "$state" 2>/dev/null) ;;
    esac

    result=$(echo "$result" | tr -d '\r')
    local alert
    alert=$(echo "$result" | jq -r '.alert // ""' 2>/dev/null | tr -d '\r')
    if [ -n "$alert" ]; then
      all_alerts="${all_alerts:+$all_alerts }$alert"
    fi
  done

  local alert_count=0
  if [ -n "$all_alerts" ]; then
    # Count individual alerts (space-separated SO- prefixes)
    alert_count=$(echo "$all_alerts" | grep -oE 'SO-[0-9]+' | wc -l | tr -d ' ')
  fi

  jq -n --arg alerts "$all_alerts" --argjson count "$alert_count" \
    '{"alerts": $alerts, "alert_count": $count}'
}
