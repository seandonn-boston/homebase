#!/usr/bin/env bash
# Tests for admiral/lib/hook_config.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test_helpers.sh"
source "$SCRIPT_DIR/../lib/hook_config.sh"

# --- init_project_dir ---
# From env
CLAUDE_PROJECT_DIR="/tmp/test-project" init_project_dir
assert_eq "init_project_dir: from CLAUDE_PROJECT_DIR env" "/tmp/test-project" "$PROJECT_DIR"

# From payload
unset CLAUDE_PROJECT_DIR 2>/dev/null || true
init_project_dir '{"session_state":{"project_dir":"/from/payload"}}'
assert_eq "init_project_dir: from payload" "/from/payload" "$PROJECT_DIR"

# Empty payload falls back
CLAUDE_PROJECT_DIR="/tmp/fallback" init_project_dir '{}'
assert_eq "init_project_dir: empty payload falls back to env" "/tmp/fallback" "$PROJECT_DIR"

# --- get_admiral_path ---
PROJECT_DIR="/proj"
result=$(get_admiral_path "event_log.jsonl")
assert_eq "get_admiral_path: event_log" "/proj/.admiral/event_log.jsonl" "$result"

result=$(get_admiral_path "session_state.json")
assert_eq "get_admiral_path: session_state" "/proj/.admiral/session_state.json" "$result"

result=$(get_admiral_path "hook_errors.log")
assert_eq "get_admiral_path: hook_errors" "/proj/.admiral/hook_errors.log" "$result"

# --- get_config_file ---
PROJECT_DIR="/proj"
result=$(get_config_file)
assert_eq "get_config_file: returns config path" "/proj/admiral/config.json" "$result"

report_results "hook_config tests"
