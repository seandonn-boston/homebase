#!/bin/bash
# Spec Compliance: Part 9 — Platform Integration
# Tests: Claude Code adapter pattern, hook wiring, headless authority shift
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$SCRIPT_DIR/test_helpers.sh"
source "$PROJECT_DIR/admiral/config/reference_constants.sh"

echo "--- Part 9: Platform Integration ---"

# Claude Code adapter hooks exist (three-handler pattern)
assert_file_exists "session_start adapter" "$PROJECT_DIR/.hooks/session_start_adapter.sh"
assert_file_exists "pre_tool_use adapter" "$PROJECT_DIR/.hooks/pre_tool_use_adapter.sh"
assert_file_exists "post_tool_use adapter" "$PROJECT_DIR/.hooks/post_tool_use_adapter.sh"

# Adapters are executable
assert_true "session_start adapter is executable" \
  "$([ -x "$PROJECT_DIR/.hooks/session_start_adapter.sh" ] && echo true || echo false)"
assert_true "pre_tool_use adapter is executable" \
  "$([ -x "$PROJECT_DIR/.hooks/pre_tool_use_adapter.sh" ] && echo true || echo false)"
assert_true "post_tool_use adapter is executable" \
  "$([ -x "$PROJECT_DIR/.hooks/post_tool_use_adapter.sh" ] && echo true || echo false)"

# Headless agent authority shift constant
assert_eq "headless authority shift is 1 tier" "1" "$RC_HEADLESS_AUTHORITY_SHIFT"

# Cross-platform adapters (not yet implemented beyond Claude Code)
skip_test "Cursor adapter" "Not started"
skip_test "Windsurf adapter" "Not started"
skip_test "API-direct adapter" "Not started"

report_results "Part 9: Platform Integration"
