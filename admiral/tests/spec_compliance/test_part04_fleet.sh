#!/bin/bash
# Spec Compliance: Part 4 — Fleet Composition
# Tests: Fleet constants, agent definition schema
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$SCRIPT_DIR/test_helpers.sh"
source "$PROJECT_DIR/admiral/config/reference_constants.sh"

echo "--- Part 4: Fleet Composition ---"

# Fleet size constants match spec
assert_eq "fleet min agents is 1" "1" "$RC_FLEET_MIN_AGENTS"
assert_eq "fleet max agents is 12" "12" "$RC_FLEET_MAX_AGENTS"

# Agent definition schema exists and is valid
SCHEMA="$PROJECT_DIR/admiral/schemas/agent-definition.v1.schema.json"
assert_file_exists "agent-definition schema exists" "$SCHEMA"
assert_true "agent-definition schema is valid JSON" \
  "$(jq empty "$SCHEMA" 2>/dev/null && echo true || echo false)"

# Fleet orchestration runtime (not yet implemented)
skip_test "fleet orchestration runtime" "Not started — spec Part 4 fleet routing not implemented"

report_results "Part 4: Fleet Composition"
