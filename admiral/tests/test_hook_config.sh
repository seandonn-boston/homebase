#!/usr/bin/env bash
# Tests for admiral/lib/hook_config.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/hook_config.sh"

PASS=0
FAIL=0
TMPDIR_BASE=$(mktemp -d)

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $desc"
    echo "  expected: $expected"
    echo "  actual:   $actual"
  fi
}

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

# --- load_hook_config ---
PROJECT_DIR="$TMPDIR_BASE"
mkdir -p "$TMPDIR_BASE/admiral"
echo '{"hooks":{"maxSameError":5,"debug":true},"timeout":30}' > "$TMPDIR_BASE/admiral/config.json"

result=$(load_hook_config '.hooks.maxSameError' '3')
assert_eq "load_hook_config: reads existing value" "5" "$result"

result=$(load_hook_config '.timeout' '10')
assert_eq "load_hook_config: reads top-level value" "30" "$result"

result=$(load_hook_config '.hooks.missing' 'default_val')
assert_eq "load_hook_config: returns default for missing key" "default_val" "$result"

PROJECT_DIR="/nonexistent"
result=$(load_hook_config '.any' 'fallback')
assert_eq "load_hook_config: returns default when no config file" "fallback" "$result"

# --- detect_secrets ---
rc=0
detect_secrets "password = myP@ss123" || rc=$?
assert_eq "detect_secrets: detects password pattern" "0" "$rc"

rc=0
detect_secrets "AWS_ACCESS_KEY_ID=AKIA..." || rc=$?
assert_eq "detect_secrets: detects AWS key" "0" "$rc"

rc=0
detect_secrets "-----BEGIN RSA PRIVATE KEY-----" || rc=$?
assert_eq "detect_secrets: detects RSA key" "0" "$rc"

rc=0
detect_secrets "api_key = sk-abc123" || rc=$?
assert_eq "detect_secrets: detects api_key" "0" "$rc"

rc=0
detect_secrets "just normal text here" || rc=$?
assert_eq "detect_secrets: clean text returns 1" "1" "$rc"

rc=0
detect_secrets "const x = 42; console.log(x);" || rc=$?
assert_eq "detect_secrets: code without secrets returns 1" "1" "$rc"

# Cleanup
rm -rf "$TMPDIR_BASE"

# --- Summary ---
echo ""
echo "hook_config tests: $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
