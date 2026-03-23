#!/bin/bash
# Spec Compliance: Part 1 — Strategy
# Tests: Ground Truth schema, generator, validator, boundaries checklist
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$SCRIPT_DIR/test_helpers.sh"

echo "--- Part 1: Strategy ---"

# Ground Truth schema exists and is valid JSON
assert_file_exists "ground-truth schema exists" "$PROJECT_DIR/admiral/schemas/ground-truth.v1.schema.json"
assert_true "ground-truth schema is valid JSON" \
  "$(jq empty "$PROJECT_DIR/admiral/schemas/ground-truth.v1.schema.json" 2>/dev/null && echo true || echo false)"

# Schema has required top-level properties per spec
SCHEMA="$PROJECT_DIR/admiral/schemas/ground-truth.v1.schema.json"
PROPS=$(jq -r '.properties | keys[]' "$SCHEMA" 2>/dev/null | tr '\n' ',')
assert_contains "schema has mission property" "$PROPS" "mission"
assert_contains "schema has boundaries property" "$PROPS" "boundaries"
assert_contains "schema has success_criteria property" "$PROPS" "success_criteria"

# Generator tool exists and is executable
assert_file_exists "generate_ground_truth exists" "$PROJECT_DIR/admiral/bin/generate_ground_truth"
assert_true "generate_ground_truth is executable" \
  "$([ -x "$PROJECT_DIR/admiral/bin/generate_ground_truth" ] && echo true || echo false)"

# Validator tool exists and is executable
assert_file_exists "validate_ground_truth exists" "$PROJECT_DIR/admiral/bin/validate_ground_truth"
assert_true "validate_ground_truth is executable" \
  "$([ -x "$PROJECT_DIR/admiral/bin/validate_ground_truth" ] && echo true || echo false)"

# Boundaries validator exists (ST-08)
assert_file_exists "validate_boundaries exists" "$PROJECT_DIR/admiral/bin/validate_boundaries"
assert_true "validate_boundaries is executable" \
  "$([ -x "$PROJECT_DIR/admiral/bin/validate_boundaries" ] && echo true || echo false)"

# Generator produces valid output when run with --help or similar
GEN_OUTPUT=$(bash "$PROJECT_DIR/admiral/bin/generate_ground_truth" --help 2>&1) || true
assert_true "generator has help output" \
  "$([ -n "$GEN_OUTPUT" ] && echo true || echo false)"

report_results "Part 1: Strategy"
