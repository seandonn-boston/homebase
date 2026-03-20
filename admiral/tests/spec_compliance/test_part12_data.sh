#!/bin/bash
# Spec Compliance: Part 12 — Data Ecosystem
# Tests: Event system, execution traces, journal ingestion
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$SCRIPT_DIR/test_helpers.sh"

echo "--- Part 12: Data Ecosystem ---"

# Control plane event system exists
assert_file_exists "events.ts exists" "$PROJECT_DIR/control-plane/src/events.ts"

# Execution traces exist
assert_file_exists "trace.ts exists" "$PROJECT_DIR/control-plane/src/trace.ts"

# Journal ingester exists
assert_file_exists "ingest.ts exists" "$PROJECT_DIR/control-plane/src/ingest.ts"

# Event log written by hooks (JSONL format)
POST_ADAPTER=$(cat "$PROJECT_DIR/.hooks/post_tool_use_adapter.sh")
assert_contains "post adapter writes event log" "$POST_ADAPTER" "event_log"

PRE_ADAPTER=$(cat "$PROJECT_DIR/.hooks/pre_tool_use_adapter.sh")
assert_contains "pre adapter writes event log" "$PRE_ADAPTER" "event_log"

# Long-term analytics (not yet implemented)
skip_test "long-term analytics pipeline" "Not started"

report_results "Part 12: Data Ecosystem"
