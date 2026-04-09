#!/bin/bash
# Admiral Framework — Agent Definition Template Generator (F-14)
# Scaffolds a new agent definition (md + json) from name and category.
#
# Usage: ./generate-agent.sh <name> <category>
#   Categories: command, engineering, quality, governance, specialist, scale, meta, data, domain, ecosystem
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFINITIONS_DIR="$SCRIPT_DIR/../definitions"

NAME="${1:-}"
CATEGORY="${2:-specialist}"

if [ -z "$NAME" ]; then
  echo "Usage: generate-agent.sh <name> [category]"
  echo "Categories: command, engineering, quality, governance, specialist, scale, meta, data, domain, ecosystem"
  exit 1
fi

SLUG=$(echo "$NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
TITLE=$(echo "$NAME" | sed 's/-/ /g; s/\b./\U&/g')
MD_FILE="$DEFINITIONS_DIR/${SLUG}.md"
JSON_FILE="$DEFINITIONS_DIR/${SLUG}.json"

if [ -f "$MD_FILE" ] || [ -f "$JSON_FILE" ]; then
  echo "Error: Agent '$SLUG' already exists"
  exit 1
fi

mkdir -p "$DEFINITIONS_DIR"

# Generate markdown definition
cat > "$MD_FILE" << EOF
# ${TITLE}

## Identity
- **Role:** ${TITLE}
- **Category:** ${CATEGORY}
- **Tier:** Tier 2 Workhorse
- **Model:** claude-sonnet-4-20250514

## Authority
- **Autonomous:** [list actions this agent can take without approval]
- **Propose:** [list actions requiring human review]
- **Escalate:** [list situations requiring Admiral intervention]

## Constraints
- Does NOT do: [list negative capabilities]
- File access: [list permitted paths]

## Tool Registry
- **Allowed:** Read, Glob, Grep
- **Denied:** [list denied tools]

## Interface Contracts
- **Accepts:** [describe input format]
- **Produces:** [describe output format]

## Context Injection
- Standing context: identity, constraints, project Ground Truth
- Session context: task specification, relevant code
EOF

# Generate JSON definition
cat > "$JSON_FILE" << EOF
{
  "agent_id": "${SLUG}",
  "role": "${SLUG}",
  "category": "${CATEGORY}",
  "model_tier": "tier2_workhorse",
  "description": "${TITLE} agent",
  "capabilities": [],
  "tools": {
    "allowed": ["Read", "Glob", "Grep"],
    "denied": []
  },
  "paths": {
    "read": ["**/*"],
    "write": [],
    "denied": ["aiStrat/**"]
  },
  "authority": {
    "autonomous": [],
    "propose": [],
    "escalate": []
  },
  "standing_orders": "all"
}
EOF

echo "Created: $MD_FILE"
echo "Created: $JSON_FILE"
echo "Next: edit both files to define the agent's capabilities and constraints"
