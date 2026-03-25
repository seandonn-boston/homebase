#!/bin/bash
# test_protocol_registry_guard.sh — Tests for S-04 protocol registry guard
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOK="$PROJECT_ROOT/.hooks/protocol_registry_guard.sh"

export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"

pass=0
fail=0

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  PASS: $desc"
    pass=$((pass + 1))
  else
    echo "  FAIL: $desc (expected '$expected', got '$actual')"
    fail=$((fail + 1))
  fi
}

assert_json_field() {
  local desc="$1" json="$2" field="$3" expected="$4"
  local actual
  actual=$(echo "$json" | tr -d '\r' | jq -r "$field" 2>/dev/null)
  assert_eq "$desc" "$expected" "$actual"
}

run_hook() {
  local payload="$1"
  local exit_code=0
  local output
  output=$(echo "$payload" | bash "$HOOK" 2>/dev/null) || exit_code=$?
  echo "$output"
  return "$exit_code"
}

echo "Testing protocol_registry_guard.sh (S-04)"
echo "==========================================="
echo ""

# Test 1: Non-protocol tool passes through
echo "1. Non-protocol tool passthrough"
result=$(run_hook '{"tool_name":"Read","tool_input":{"file_path":"README.md"}}')
assert_json_field "Allowed" "$result" '.allowed' "true"
assert_json_field "Reason" "$result" '.reason' "non_protocol_tool"

# Test 2: Regular Bash command passes through
echo ""
echo "2. Regular Bash passthrough"
result=$(run_hook '{"tool_name":"Bash","tool_input":{"command":"echo hello"}}')
assert_json_field "Allowed" "$result" '.allowed' "true"
assert_json_field "Reason" "$result" '.reason' "non_mcp_operation"

# Test 3: MCP server install with "latest" — blocked
echo ""
echo "3. Block latest version"
exit_code=0
result=$(run_hook '{"tool_name":"Bash","tool_input":{"command":"npx @modelcontextprotocol/server-test@latest"}}') || exit_code=$?
assert_eq "Exit code 2 (blocked)" "2" "$exit_code"
assert_json_field "Not allowed" "$result" '.allowed' "false"
assert_json_field "Reason" "$result" '.reason' "blocked_version_latest"

# Test 4: MCP config Write with unapproved server — blocked
echo ""
echo "4. Block unapproved MCP server"
exit_code=0
result=$(run_hook '{"tool_name":"Write","tool_input":{"file_path":".claude/settings.json","content":"{\"mcpServers\":{\"name\":\"evil-server\"}}"}}') || exit_code=$?
assert_eq "Exit code 2 (blocked)" "2" "$exit_code"
assert_json_field "Not allowed" "$result" '.allowed' "false"
assert_json_field "Reason" "$result" '.reason' "unapproved_mcp_server"

# Test 5: MCP config with approved server — allowed
echo ""
echo "5. Allow approved MCP server"
result=$(run_hook '{"tool_name":"Write","tool_input":{"file_path":".claude/settings.json","content":"{\"mcpServers\":{\"name\":\"admiral-brain\"}}"}}')
assert_json_field "Allowed" "$result" '.allowed' "true"

# Test 6: Edit to non-MCP file — passthrough
echo ""
echo "6. Edit non-MCP file passthrough"
result=$(run_hook '{"tool_name":"Edit","tool_input":{"file_path":"src/index.ts","old_string":"foo","new_string":"bar"}}')
assert_json_field "Allowed" "$result" '.allowed' "true"
assert_json_field "Reason" "$result" '.reason' "non_mcp_operation"

# Test 7: Bash command referencing MCP — checked
echo ""
echo "7. MCP Bash command detected"
result=$(run_hook '{"tool_name":"Bash","tool_input":{"command":"npx mcp-server install my-tool"}}')
# No server name extracted, so should pass (MCP detected but no specific server to check)
assert_json_field "Allowed" "$result" '.allowed' "true"

# Test 8: Write to mcp_servers config file detected
echo ""
echo "8. MCP config file path detected"
result=$(run_hook '{"tool_name":"Write","tool_input":{"file_path":"config/mcp_servers.json","content":"{\"name\":\"admiral-fleet\",\"version\":\"1.0.0\"}"}}')
assert_json_field "Allowed" "$result" '.allowed' "true"

# Test 9: Output is always valid JSON
echo ""
echo "9. Output validity"
result=$(run_hook '{"tool_name":"Bash","tool_input":{"command":"echo test"}}')
json_valid=$(echo "$result" | tr -d '\r' | jq empty 2>/dev/null && echo true || echo false)
assert_eq "Output is valid JSON" "true" "$json_valid"

# Test 10: Agent tool passthrough
echo ""
echo "10. Agent tool passthrough"
result=$(run_hook '{"tool_name":"Agent","tool_input":{"prompt":"do something"}}')
assert_json_field "Allowed" "$result" '.allowed' "true"
assert_json_field "Reason" "$result" '.reason' "non_protocol_tool"

# Test 11: Content with "latest" in non-MCP context — not blocked
echo ""
echo "11. Latest in non-MCP context"
result=$(run_hook '{"tool_name":"Write","tool_input":{"file_path":"README.md","content":"get the latest version"}}')
assert_json_field "Allowed" "$result" '.allowed' "true"

echo ""
echo "==========================================="
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
