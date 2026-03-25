#!/bin/bash
# generate-agent.sh — Agent Definition Template Generator (F-14)
# Scaffolds .md + .json for a new agent definition.
#
# Usage: generate-agent.sh <agent-id> <role> [model-tier]
# Example: generate-agent.sh backend-implementer implementer tier2_workhorse
#
# Roles: orchestrator, architect, implementer, qa, security, triage, curator, custom
# Tiers: tier1_flagship, tier2_workhorse, tier3_utility, tier4_economy
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEFINITIONS_DIR="$PROJECT_ROOT/fleet/agents/definitions"

# Parse arguments
AGENT_ID="${1:-}"
ROLE="${2:-custom}"
MODEL_TIER="${3:-tier2_workhorse}"

if [ -z "$AGENT_ID" ]; then
  echo "Usage: generate-agent.sh <agent-id> <role> [model-tier]"
  echo ""
  echo "Roles: orchestrator, architect, implementer, qa, security, triage, curator, custom"
  echo "Tiers: tier1_flagship, tier2_workhorse, tier3_utility, tier4_economy"
  exit 1
fi

# Validate agent_id format
if ! echo "$AGENT_ID" | grep -qE '^[a-z][a-z0-9-]*$'; then
  echo "ERROR: agent_id must match ^[a-z][a-z0-9-]*$ (got: $AGENT_ID)" >&2
  exit 1
fi

# Check if files already exist
MD_FILE="$DEFINITIONS_DIR/$AGENT_ID.md"
JSON_FILE="$DEFINITIONS_DIR/$AGENT_ID.json"

if [ -f "$MD_FILE" ] || [ -f "$JSON_FILE" ]; then
  echo "ERROR: Definition files already exist for $AGENT_ID" >&2
  exit 1
fi

mkdir -p "$DEFINITIONS_DIR"

# Default tools by role
case "$ROLE" in
  orchestrator)
    ALLOWED='["Read", "Glob", "Grep", "Agent", "AskUserQuestion"]'
    DENIED='["Write", "Edit", "Bash", "NotebookEdit"]'
    WRITE_PATHS='["admiral/state/**", ".admiral/**"]'
    ;;
  architect)
    ALLOWED='["Read", "Glob", "Grep", "Agent", "WebSearch"]'
    DENIED='["Write", "Edit", "Bash", "NotebookEdit"]'
    WRITE_PATHS='["docs/adr/**"]'
    ;;
  implementer)
    ALLOWED='["Read", "Write", "Edit", "Bash", "Glob", "Grep"]'
    DENIED='["Agent", "WebFetch", "WebSearch"]'
    WRITE_PATHS='["admiral/**", "control-plane/**", ".hooks/**"]'
    ;;
  qa)
    ALLOWED='["Read", "Bash", "Glob", "Grep"]'
    DENIED='["Write", "Edit", "Agent", "NotebookEdit"]'
    WRITE_PATHS='[]'
    ;;
  security)
    ALLOWED='["Read", "Bash", "Glob", "Grep", "WebSearch"]'
    DENIED='["Write", "Edit", "Agent", "NotebookEdit"]'
    WRITE_PATHS='[]'
    ;;
  triage)
    ALLOWED='["Read", "Glob", "Grep"]'
    DENIED='["Write", "Edit", "Bash", "Agent", "NotebookEdit", "WebFetch", "WebSearch"]'
    WRITE_PATHS='[]'
    ;;
  curator)
    ALLOWED='["Read", "Glob", "Grep", "Agent"]'
    DENIED='["Write", "Edit", "Bash", "NotebookEdit"]'
    WRITE_PATHS='[]'
    ;;
  *)
    ALLOWED='["Read", "Glob", "Grep"]'
    DENIED='[]'
    WRITE_PATHS='[]'
    ;;
esac

# Convert agent-id to display name
DISPLAY_NAME=$(echo "$AGENT_ID" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1')

# Generate JSON definition
jq -n \
  --arg id "$AGENT_ID" \
  --arg role "$ROLE" \
  --arg tier "$MODEL_TIER" \
  --argjson allowed "$ALLOWED" \
  --argjson denied "$DENIED" \
  --argjson write_paths "$WRITE_PATHS" \
  '{
    agent_id: $id,
    version: "1.0.0",
    role: $role,
    asp_spec_ref: null,
    model_tier: $tier,
    tools: { allowed: $allowed, denied: $denied },
    paths: {
      read: ["**/*"],
      write: $write_paths,
      denied: ["aiStrat/**", ".github/workflows/**"]
    },
    authority: {
      autonomous: [],
      propose: [],
      escalate: ["security_decision", "spec_modification"]
    },
    standing_orders: "all"
  }' > "$JSON_FILE"

# Generate Markdown definition
cat > "$MD_FILE" << MDEOF
# $DISPLAY_NAME

## Identity

- **Agent ID:** $AGENT_ID
- **Role:** $ROLE
- **Model Tier:** $MODEL_TIER
- **Version:** 1.0.0

## Description

<!-- Brief description of this agent's purpose and responsibilities -->

## Authority

### Autonomous
<!-- Actions this agent can take without approval -->

### Propose
<!-- Actions requiring a written proposal -->

### Escalate
<!-- Actions requiring immediate escalation -->
- Security decisions
- Spec modifications

## Constraints

### Does NOT Do
<!-- Explicit boundaries — what this agent must never do -->

### Tool Access
- **Allowed:** $(echo "$ALLOWED" | jq -r 'join(", ")')
- **Denied:** $(echo "$DENIED" | jq -r 'join(", ")')

### File Ownership
- **Read:** All files
- **Write:** $(echo "$WRITE_PATHS" | jq -r 'if length == 0 then "None" else join(", ") end')
- **Denied:** aiStrat/\*\*, .github/workflows/\*\*

## Interface Contracts

### Inputs
<!-- What this agent receives and from whom -->

### Outputs
<!-- What this agent produces and for whom -->

## Standing Orders

All 16 Standing Orders apply.
MDEOF

echo "Created: $MD_FILE"
echo "Created: $JSON_FILE"
