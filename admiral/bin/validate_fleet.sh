#!/bin/bash
# validate_fleet.sh — Fleet configuration pre-flight validator (S-09)
# Validates fleet config against spec constraints:
# - 1-12 agents (spec fleet size range)
# - No tool list overlap (allowed ∩ denied = ∅)
# - Valid model tiers and roles
# - Required roles present (orchestrator)
# - No duplicate agent IDs
# - Capability coverage (minimum viable fleet)
# Outputs structured JSON report. Exit 0 if valid, 1 if invalid.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source agent registry
source "$PROJECT_ROOT/admiral/lib/agent_registry.sh"

# Initialize registry
registry_init

# Validation state
errors=()
warnings=()

add_error() { errors+=("$1"); }
add_warning() { warnings+=("$1"); }

REGISTRY_FILE="$PROJECT_ROOT/admiral/config/fleet_registry.json"
AGENT_COUNT=$(registry_count)

# 1. Fleet size check (1-12 agents)
if [ "$AGENT_COUNT" -lt 1 ]; then
  add_error "Fleet has no agents (minimum 1)"
elif [ "$AGENT_COUNT" -gt 12 ]; then
  add_warning "Fleet has $AGENT_COUNT agents (recommended max 12 — coordination costs increase)"
fi

# 2. Duplicate agent IDs
UNIQUE_COUNT=$(jq '[.agents[].agent_id] | unique | length' "$REGISTRY_FILE" | tr -d '\r')
if [ "$UNIQUE_COUNT" != "$AGENT_COUNT" ]; then
  DUPES=$(jq '[.agents[].agent_id] | group_by(.) | map(select(length > 1) | .[0]) | join(", ")' "$REGISTRY_FILE" | tr -d '\r"')
  add_error "Duplicate agent IDs: $DUPES"
fi

# 3. Valid model tiers
VALID_TIERS='["tier1_flagship","tier2_workhorse","tier3_utility","tier4_economy"]'
INVALID_TIERS=$(jq --argjson valid "$VALID_TIERS" \
  '[.agents[] | select(.model_tier as $t | $valid | index($t) | not) | "\(.agent_id): \(.model_tier)"] | join(", ")' \
  "$REGISTRY_FILE" | tr -d '\r"')
if [ -n "$INVALID_TIERS" ]; then
  add_error "Invalid model tiers: $INVALID_TIERS"
fi

# 4. Valid roles
VALID_ROLES='["orchestrator","architect","implementer","qa","security","triage","curator","custom"]'
INVALID_ROLES=$(jq --argjson valid "$VALID_ROLES" \
  '[.agents[] | select(.role as $r | $valid | index($r) | not) | "\(.agent_id): \(.role)"] | join(", ")' \
  "$REGISTRY_FILE" | tr -d '\r"')
if [ -n "$INVALID_ROLES" ]; then
  add_error "Invalid roles: $INVALID_ROLES"
fi

# 5. Required roles
HAS_ORCHESTRATOR=$(jq '[.agents[] | select(.role == "orchestrator")] | length' "$REGISTRY_FILE" | tr -d '\r')
if [ "$HAS_ORCHESTRATOR" -lt 1 ]; then
  add_warning "No orchestrator agent defined (required for fleet coordination)"
fi

# 6. Tool list overlap (allowed ∩ denied = ∅)
OVERLAP_AGENTS=$(jq '[.agents[] | select(
  (.tools.allowed // []) as $a |
  (.tools.denied // []) as $d |
  ($a - ($a - $d)) | length > 0
) | .agent_id] | join(", ")' "$REGISTRY_FILE" | tr -d '\r"')
if [ -n "$OVERLAP_AGENTS" ]; then
  add_error "Tool list overlap (allowed ∩ denied non-empty) in: $OVERLAP_AGENTS"
fi

# 7. Required fields per agent
REQUIRED_FIELDS=("agent_id" "role" "model_tier" "capabilities" "tools")
for field in "${REQUIRED_FIELDS[@]}"; do
  MISSING=$(jq --arg f "$field" \
    '[.agents[] | select(has($f) | not) | .agent_id] | join(", ")' \
    "$REGISTRY_FILE" | tr -d '\r"')
  if [ -n "$MISSING" ]; then
    add_error "Missing required field '$field' in: $MISSING"
  fi
done

# 8. Capabilities coverage — minimum viable fleet
MVF_CAPABILITIES=("task_routing" "code_review" "security_audit")
for cap in "${MVF_CAPABILITIES[@]}"; do
  CAP_COUNT=$(jq --arg c "$cap" \
    '[.agents[] | select(.capabilities[]? == $c)] | length' \
    "$REGISTRY_FILE" | tr -d '\r')
  if [ "$CAP_COUNT" -lt 1 ]; then
    add_warning "No agent has capability '$cap' (recommended for minimum viable fleet)"
  fi
done

# 9. Agent ID format validation
INVALID_IDS=$(jq '[.agents[] | select(.agent_id | test("^[a-z][a-z0-9-]*$") | not) | .agent_id] | join(", ")' \
  "$REGISTRY_FILE" | tr -d '\r"')
if [ -n "$INVALID_IDS" ]; then
  add_error "Invalid agent ID format (must be lowercase with hyphens): $INVALID_IDS"
fi

# 10. Empty capabilities check
EMPTY_CAPS=$(jq '[.agents[] | select(.capabilities | length == 0) | .agent_id] | join(", ")' \
  "$REGISTRY_FILE" | tr -d '\r"')
if [ -n "$EMPTY_CAPS" ]; then
  add_error "Agents with empty capabilities: $EMPTY_CAPS"
fi

# Build report
ERROR_COUNT=${#errors[@]}
WARNING_COUNT=${#warnings[@]}
STATUS="valid"
if [ "$ERROR_COUNT" -gt 0 ]; then
  STATUS="invalid"
fi

# JSON output
ERRORS_JSON="[]"
if [ "$ERROR_COUNT" -gt 0 ]; then
  ERRORS_JSON=$(printf '%s\n' "${errors[@]}" | jq -R . | jq -s .)
fi

WARNINGS_JSON="[]"
if [ "$WARNING_COUNT" -gt 0 ]; then
  WARNINGS_JSON=$(printf '%s\n' "${warnings[@]}" | jq -R . | jq -s .)
fi

jq -n --arg status "$STATUS" \
      --argjson agents "$AGENT_COUNT" \
      --argjson errors "$ERROR_COUNT" \
      --argjson warnings "$WARNING_COUNT" \
      --argjson error_list "$ERRORS_JSON" \
      --argjson warning_list "$WARNINGS_JSON" '{
  status: $status,
  agent_count: $agents,
  error_count: $errors,
  warning_count: $warnings,
  errors: $error_list,
  warnings: $warning_list
}'

# Human-readable summary
echo "" >&2
echo "Fleet Configuration Validation: $STATUS" >&2
echo "Agents: $AGENT_COUNT" >&2
if [ "$ERROR_COUNT" -gt 0 ]; then
  echo "Errors ($ERROR_COUNT):" >&2
  for err in "${errors[@]}"; do
    echo "  - $err" >&2
  done
fi
if [ "$WARNING_COUNT" -gt 0 ]; then
  echo "Warnings ($WARNING_COUNT):" >&2
  for warn in "${warnings[@]}"; do
    echo "  - $warn" >&2
  done
fi

if [ "$STATUS" = "invalid" ]; then
  exit 1
fi
exit 0
