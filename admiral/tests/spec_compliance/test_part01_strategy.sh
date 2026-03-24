#!/bin/bash
# Spec Compliance: Part 1 — Strategy
# Verifies Ground Truth, readiness, go/no-go, task criteria, pipeline gate
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PASS=0; FAIL=0

assert() {
  if [ "$2" = "true" ]; then PASS=$((PASS+1)); echo "  [PASS] $1"
  else FAIL=$((FAIL+1)); echo "  [FAIL] $1"; fi
}

echo "=== Part 1 — Strategy Compliance ==="

# Ground Truth schema exists
assert "Ground Truth schema exists" "$([ -f "$ADMIRAL_DIR/schemas/ground-truth.v1.schema.json" ] && echo true || echo false)"

# Ground Truth template exists
assert "Ground Truth template exists" "$([ -f "$ADMIRAL_DIR/templates/ground-truth.template.json" ] && echo true || echo false)"

# Generator exists and is executable
assert "generate_ground_truth exists" "$([ -x "$ADMIRAL_DIR/bin/generate_ground_truth" ] && echo true || echo false)"

# Validator exists and is executable
assert "validate_ground_truth exists" "$([ -x "$ADMIRAL_DIR/bin/validate_ground_truth" ] && echo true || echo false)"

# Boundaries validator exists
assert "validate_boundaries exists" "$([ -x "$ADMIRAL_DIR/bin/validate_boundaries" ] && echo true || echo false)"

# Readiness assessment exists
assert "readiness_assess exists" "$([ -x "$ADMIRAL_DIR/bin/readiness_assess" ] && echo true || echo false)"

# Go/No-Go gate exists
assert "go_no_go_gate exists" "$([ -x "$ADMIRAL_DIR/bin/go_no_go_gate" ] && echo true || echo false)"

# Task criteria schema exists
assert "Task criteria schema exists" "$([ -f "$ADMIRAL_DIR/schemas/task-criteria.v1.schema.json" ] && echo true || echo false)"

# Task criteria validator exists
assert "validate_task_criteria exists" "$([ -x "$ADMIRAL_DIR/bin/validate_task_criteria" ] && echo true || echo false)"

# Spec-First pipeline gate exists
assert "spec_first_gate exists" "$([ -x "$ADMIRAL_DIR/bin/spec_first_gate" ] && echo true || echo false)"

# Pipeline manifest exists
assert "pipeline_manifest exists" "$([ -f "$ADMIRAL_DIR/config/pipeline_manifest.json" ] && echo true || echo false)"

# Schema defines required fields per spec
required=$(jq -r '.required | join(",")' "$ADMIRAL_DIR/schemas/ground-truth.v1.schema.json" 2>/dev/null)
assert "Schema requires schema_version" "$(echo "$required" | grep -q schema_version && echo true || echo false)"
assert "Schema requires mission" "$(echo "$required" | grep -q mission && echo true || echo false)"
assert "Schema requires boundaries" "$(echo "$required" | grep -q boundaries && echo true || echo false)"
assert "Schema requires success_criteria" "$(echo "$required" | grep -q success_criteria && echo true || echo false)"

# Pipeline entry enum values match spec
entry_values=$(jq -r '.properties.mission.properties.pipeline_entry.enum | join(",")' "$ADMIRAL_DIR/schemas/ground-truth.v1.schema.json" 2>/dev/null)
assert "Pipeline entry has Requirements" "$(echo "$entry_values" | grep -q Requirements && echo true || echo false)"
assert "Pipeline entry has Implementation" "$(echo "$entry_values" | grep -q Implementation && echo true || echo false)"

echo ""
echo "Part 1: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
