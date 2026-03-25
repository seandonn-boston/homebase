#!/bin/bash
# generate_capability_registry.sh — Machine-readable Agent Capability Registry (F-13)
# Consolidates all agent definitions into a single queryable JSON file.
# Auto-regenerates when run.
#
# Usage: generate_capability_registry.sh [definitions_dir] [output_file]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEFINITIONS_DIR="${1:-$PROJECT_ROOT/fleet/agents/definitions}"
OUTPUT_FILE="${2:-$PROJECT_ROOT/fleet/agents/capability-registry.json}"

# Collect all agent definition JSON files
shopt -s nullglob
FILES=("$DEFINITIONS_DIR"/*.json)
shopt -u nullglob

# Filter out non-definition files
AGENT_FILES=()
for f in "${FILES[@]}"; do
  name=$(basename "$f" .json)
  if [ "$name" = "validation-report" ] || [ "$name" = "capability-registry" ]; then
    continue
  fi
  AGENT_FILES+=("$f")
done

AGENT_COUNT=${#AGENT_FILES[@]}

if [ "$AGENT_COUNT" -eq 0 ]; then
  echo "No agent definitions found in $DEFINITIONS_DIR" >&2
  exit 1
fi

# Build the registry — concatenate all agent files into a temp JSONL then slurp
TEMP_JSONL=$(mktemp)
TEMP_AGENTS=$(mktemp)
trap "rm -f $TEMP_JSONL $TEMP_AGENTS" EXIT
for f in "${AGENT_FILES[@]}"; do
  jq -c '.' "$f" >> "$TEMP_JSONL"
done
jq -cs '.' "$TEMP_JSONL" > "$TEMP_AGENTS"

# Generate the registry with metadata
GENERATED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
jq --arg generated "$GENERATED" --argjson count "$AGENT_COUNT" \
  '{
    "$schema": "capability-registry.v1",
    "generated_at": $generated,
    "agent_count": $count,
    "agents": .,
    "by_role": (group_by(.role) | map({(.[0].role): [.[].agent_id]}) | add),
    "by_tier": (group_by(.model_tier) | map({(.[0].model_tier): [.[].agent_id]}) | add)
  }' "$TEMP_AGENTS" > "$OUTPUT_FILE"

echo "Generated capability registry: $OUTPUT_FILE ($AGENT_COUNT agents)"
