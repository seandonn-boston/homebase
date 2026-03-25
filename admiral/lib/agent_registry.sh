#!/bin/bash
# agent_registry.sh — Runtime agent registry for fleet orchestration
# Provides lookup APIs for agent definitions: by ID, capability, and model tier.
# All functions return structured JSON.

# Registry state
_REGISTRY_FILE=""
_REGISTRY_LOADED=""

# Initialize the registry from the fleet_registry.json file
registry_init() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local project_root
  project_root="$(cd "$script_dir/../.." && pwd)"

  _REGISTRY_FILE="$project_root/admiral/config/fleet_registry.json"

  if [ ! -f "$_REGISTRY_FILE" ]; then
    echo "ERROR: Fleet registry not found at $_REGISTRY_FILE" >&2
    return 1
  fi

  if ! jq empty "$_REGISTRY_FILE" 2>/dev/null; then
    echo "ERROR: Invalid JSON in $_REGISTRY_FILE" >&2
    return 1
  fi

  _REGISTRY_LOADED="true"
}

# Ensure registry is loaded
_ensure_loaded() {
  if [ "$_REGISTRY_LOADED" != "true" ]; then
    registry_init
  fi
}

# Count agents in the registry
registry_count() {
  _ensure_loaded
  jq '.agents | length' "$_REGISTRY_FILE" | tr -d '\r'
}

# Get a single agent by ID. Returns empty string if not found.
registry_get_agent() {
  local agent_id="$1"
  _ensure_loaded

  local result
  result=$(jq --arg id "$agent_id" '.agents[] | select(.agent_id == $id)' "$_REGISTRY_FILE" 2>/dev/null | tr -d '\r')

  if [ -z "$result" ] || [ "$result" = "null" ]; then
    echo ""
    return 0
  fi

  echo "$result"
}

# Find agents by capability. Returns JSON array.
registry_find_by_capability() {
  local capability="$1"
  _ensure_loaded

  jq --arg cap "$capability" '[.agents[] | select(.capabilities[]? == $cap)]' "$_REGISTRY_FILE" | tr -d '\r'
}

# Find agents by model tier. Returns JSON array.
registry_find_by_tier() {
  local tier="$1"
  _ensure_loaded

  jq --arg tier "$tier" '[.agents[] | select(.model_tier == $tier)]' "$_REGISTRY_FILE" | tr -d '\r'
}

# List all agents. Returns JSON array of all agent definitions.
registry_list_all() {
  _ensure_loaded

  jq '.agents' "$_REGISTRY_FILE" | tr -d '\r'
}

# List agent IDs only. Returns JSON array of strings.
registry_list_ids() {
  _ensure_loaded

  jq '[.agents[].agent_id]' "$_REGISTRY_FILE" | tr -d '\r'
}

# Check if an agent has a specific tool allowed
registry_agent_has_tool() {
  local agent_id="$1"
  local tool="$2"
  _ensure_loaded

  local result
  result=$(jq --arg id "$agent_id" --arg tool "$tool" \
    '.agents[] | select(.agent_id == $id) | .tools.allowed | index($tool) != null' \
    "$_REGISTRY_FILE" 2>/dev/null | tr -d '\r')

  if [ "$result" = "true" ]; then
    echo "true"
  else
    echo "false"
  fi
}

# Check if a tool is denied for an agent
registry_agent_tool_denied() {
  local agent_id="$1"
  local tool="$2"
  _ensure_loaded

  local result
  result=$(jq --arg id "$agent_id" --arg tool "$tool" \
    '.agents[] | select(.agent_id == $id) | .tools.denied | index($tool) != null' \
    "$_REGISTRY_FILE" 2>/dev/null | tr -d '\r')

  if [ "$result" = "true" ]; then
    echo "true"
  else
    echo "false"
  fi
}

# Validate the entire registry for consistency
registry_validate() {
  _ensure_loaded

  local errors=0
  local agent_count
  agent_count=$(registry_count)

  # Check minimum fleet size
  if [ "$agent_count" -lt 1 ]; then
    echo "ERROR: Registry has no agents" >&2
    errors=$((errors + 1))
  fi

  # Check for duplicate agent IDs
  local unique_count
  unique_count=$(jq '[.agents[].agent_id] | unique | length' "$_REGISTRY_FILE" | tr -d '\r')
  if [ "$unique_count" != "$agent_count" ]; then
    echo "ERROR: Duplicate agent IDs found" >&2
    errors=$((errors + 1))
  fi

  # Check each agent has required fields
  local required_fields=("agent_id" "role" "model_tier" "capabilities" "tools")
  for field in "${required_fields[@]}"; do
    local missing
    missing=$(jq --arg f "$field" '[.agents[] | select(has($f) | not) | .agent_id] | length' "$_REGISTRY_FILE" | tr -d '\r')
    if [ "$missing" != "0" ]; then
      echo "ERROR: $missing agent(s) missing required field '$field'" >&2
      errors=$((errors + 1))
    fi
  done

  # Check valid model tiers
  local valid_tiers='["tier1_flagship","tier2_workhorse","tier3_utility","tier4_economy"]'
  local invalid_tiers
  invalid_tiers=$(jq --argjson valid "$valid_tiers" \
    '[.agents[] | select(.model_tier as $t | $valid | index($t) | not) | .agent_id]' \
    "$_REGISTRY_FILE" | tr -d '\r')
  if [ "$invalid_tiers" != "[]" ]; then
    echo "ERROR: Invalid model tiers: $invalid_tiers" >&2
    errors=$((errors + 1))
  fi

  # Check valid roles
  local valid_roles='["orchestrator","architect","implementer","qa","security","triage","curator","custom"]'
  local invalid_roles
  invalid_roles=$(jq --argjson valid "$valid_roles" \
    '[.agents[] | select(.role as $r | $valid | index($r) | not) | .agent_id]' \
    "$_REGISTRY_FILE" | tr -d '\r')
  if [ "$invalid_roles" != "[]" ]; then
    echo "ERROR: Invalid roles: $invalid_roles" >&2
    errors=$((errors + 1))
  fi

  # Check tool overlap (allowed ∩ denied should be empty)
  local overlap
  overlap=$(jq '[.agents[] | select((.tools.allowed // []) as $a | (.tools.denied // []) as $d | ($a - ($a - $d)) | length > 0) | .agent_id]' \
    "$_REGISTRY_FILE" | tr -d '\r')
  if [ "$overlap" != "[]" ]; then
    echo "ERROR: Tool overlap (allowed ∩ denied) in agents: $overlap" >&2
    errors=$((errors + 1))
  fi

  if [ "$errors" -eq 0 ]; then
    echo "Registry valid: $agent_count agents, no errors"
  else
    echo "Registry validation failed: $errors error(s)" >&2
    return 1
  fi
}
