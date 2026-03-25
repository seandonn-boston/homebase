#!/bin/bash
# Admiral Framework — Task Routing Engine (S-07)
# Routes tasks to agents based on task type, file ownership, capability scores.
# Returns structured JSON routing decision with justification.
# Implements the 4-stage selection pipeline from SD-10.

SCRIPT_DIR_ROUTER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR_ROUTER="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR_ROUTER/../.." && pwd)}"

# Source agent registry
source "$PROJECT_DIR_ROUTER/admiral/lib/agent_registry.sh"

# Task type to capability mapping
# Maps common task types to the capabilities needed to fulfill them
_task_type_to_capability() {
  local task_type="$1"
  case "$task_type" in
    server_logic|api_endpoint|backend_feature)   echo "server_logic" ;;
    ui_component|frontend_feature|styling)       echo "ui_implementation" ;;
    security_audit|vulnerability_scan|pentest)   echo "security_audit" ;;
    code_review|quality_check|test_review)       echo "code_review" ;;
    architecture|design|technical_spec)          echo "architecture_design" ;;
    ci_cd|pipeline|deployment|infrastructure)    echo "ci_cd_management" ;;
    task_assignment|coordination|decomposition)  echo "task_routing" ;;
    triage|classification|priority)              echo "task_classification" ;;
    *)                                           echo "$task_type" ;;
  esac
}

# File path to agent capability mapping
_file_to_capability() {
  local file_path="$1"
  case "$file_path" in
    admiral/tests/*|.hooks/tests/*)              echo "code_review" ;;
    admiral/schemas/*|admiral/config/*)          echo "server_logic" ;;
    .hooks/*|admiral/lib/*|admiral/bin/*)         echo "server_logic" ;;
    control-plane/src/*|control-plane/test/*)     echo "server_logic" ;;
    src/components/*|src/pages/*|src/styles/*)    echo "ui_implementation" ;;
    .github/workflows/*|scripts/*|Dockerfile*)   echo "ci_cd_management" ;;
    docs/*|*.md)                                  echo "architecture_design" ;;
    *)                                           echo "" ;;
  esac
}

# Route a task to the best agent
# Usage: route_task <task_type> [file_path] [priority]
# Returns JSON: {agent_id, role, score, justification, alternatives[]}
route_task() {
  local task_type="$1"
  local file_path="${2:-}"
  local priority="${3:-normal}"

  registry_init

  # Stage 1: Eligibility filter — find agents with matching capabilities
  local capability
  capability=$(_task_type_to_capability "$task_type")
  local eligible
  eligible=$(registry_find_by_capability "$capability" | tr -d '\r')
  local eligible_count
  eligible_count=$(echo "$eligible" | jq 'length' | tr -d '\r')

  # If no exact capability match, try file-based routing
  if [ "$eligible_count" -eq 0 ] && [ -n "$file_path" ]; then
    local file_cap
    file_cap=$(_file_to_capability "$file_path")
    if [ -n "$file_cap" ]; then
      eligible=$(registry_find_by_capability "$file_cap" | tr -d '\r')
      eligible_count=$(echo "$eligible" | jq 'length' | tr -d '\r')
    fi
  fi

  # Fallback: list all agents
  if [ "$eligible_count" -eq 0 ]; then
    eligible=$(registry_list_all | tr -d '\r')
    eligible_count=$(echo "$eligible" | jq 'length' | tr -d '\r')
  fi

  if [ "$eligible_count" -eq 0 ]; then
    jq -n '{
      "routed": false,
      "reason": "no_eligible_agents",
      "agent_id": null,
      "justification": "No agents available in the fleet registry."
    }'
    return 1
  fi

  # Stage 2: Capability scoring
  # Score each agent: exact capability match = 3, file ownership = 2, fallback = 1
  local scored
  scored=$(echo "$eligible" | jq --arg cap "$capability" --arg fp "$file_path" '
    [.[] | {
      agent_id: .agent_id,
      role: .role,
      model_tier: .model_tier,
      score: (
        (if (.capabilities | index($cap)) then 3 else 0 end) +
        (if ($fp != "" and (
          (.paths.write // [])[] | test($fp; "i")
        )) then 2 else 0 end) +
        1
      )
    }] | sort_by(-.score)
  ' 2>/dev/null | tr -d '\r')

  # Handle jq errors
  if [ -z "$scored" ] || [ "$scored" = "null" ]; then
    scored=$(echo "$eligible" | jq '[.[] | {agent_id: .agent_id, role: .role, model_tier: .model_tier, score: 1}]' | tr -d '\r')
  fi

  # Stage 3: Select best agent
  local best
  best=$(echo "$scored" | jq '.[0]' | tr -d '\r')
  local best_id
  best_id=$(echo "$best" | jq -r '.agent_id' | tr -d '\r')
  local best_role
  best_role=$(echo "$best" | jq -r '.role' | tr -d '\r')
  local best_score
  best_score=$(echo "$best" | jq -r '.score' | tr -d '\r')

  # Stage 4: Build alternatives
  local alternatives
  alternatives=$(echo "$scored" | jq '[.[1:3][] | {agent_id: .agent_id, role: .role, score: .score}]' | tr -d '\r')

  # Build justification
  local justification="Routed to $best_id ($best_role) via ${task_type} capability match (score: $best_score)."
  if [ -n "$file_path" ]; then
    justification="$justification File context: $file_path."
  fi

  jq -n --arg id "$best_id" \
        --arg role "$best_role" \
        --argjson score "$best_score" \
        --arg just "$justification" \
        --argjson alts "$alternatives" \
        --arg task "$task_type" \
        --arg priority "$priority" \
        '{
          routed: true,
          agent_id: $id,
          role: $role,
          score: $score,
          justification: $just,
          task_type: $task,
          priority: $priority,
          alternatives: $alts
        }'
}
