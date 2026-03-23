#!/usr/bin/env bash
# T-17: Tests for standing_orders.sh rendering
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export CLAUDE_PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../lib/standing_orders.sh"

source "$SCRIPT_DIR/test_helpers.sh"

# --- render_standing_orders ---
output=$(render_standing_orders 2>/dev/null)

assert_not_empty "render_standing_orders: produces output" "$output"
assert_contains "render_standing_orders: has header" "ADMIRAL STARTER PROFILE" "$output"
assert_contains "render_standing_orders: has SO marker" "SO-" "$output"
assert_contains "render_standing_orders: has enforcement hooks section" "ACTIVE ENFORCEMENT HOOKS" "$output"
assert_contains "render_standing_orders: lists session_start_adapter" "session_start_adapter" "$output"
assert_contains "render_standing_orders: lists pre_tool_use_adapter" "pre_tool_use_adapter" "$output"
assert_contains "render_standing_orders: lists post_tool_use_adapter" "post_tool_use_adapter" "$output"
assert_contains "render_standing_orders: has design principle" "DESIGN PRINCIPLE" "$output"
assert_contains "render_standing_orders: has token budget note" "TOKEN BUDGET" "$output"

# Check that all 16 SOs are rendered
so_count=$(echo "$output" | grep -c 'SO-' || true)
assert_eq "render_standing_orders: renders all 16 SOs" "1" "$((so_count >= 16 ? 1 : 0))"

# Each SO should have at least one rule
rule_count=$(echo "$output" | grep -c '  - ' || true)
assert_eq "render_standing_orders: has rules" "1" "$((rule_count > 0 ? 1 : 0))"

# --- count_standing_orders ---
count=$(count_standing_orders)
assert_eq "count_standing_orders: returns 16" "16" "$count"

# --- Graceful degradation: missing SO dir ---
SO_DIR="/nonexistent/so/dir"
output_missing=$(render_standing_orders 2>/dev/null)
assert_contains "render_standing_orders: missing dir still has header" "ADMIRAL STARTER PROFILE" "$output_missing"
assert_contains "render_standing_orders: missing dir still has enforcement section" "ACTIVE ENFORCEMENT HOOKS" "$output_missing"

count_missing=$(SO_DIR="/nonexistent" count_standing_orders)
assert_eq "count_standing_orders: returns 0 for missing dir" "0" "$count_missing"

# --- Summary ---
report_results "standing_orders tests"
