#!/bin/bash
# Admiral Framework — SDLC Quality Gates (S-13) and Review Checklist (S-14)
# Pre-merge gates enforcing test coverage, lint, review checklist.
# Configurable per-project, integrates with CI.

# Check if tests pass
quality_check_tests() {
  local project_dir="${CLAUDE_PROJECT_DIR:-.}"
  local result='{"check": "tests", "status": "unknown", "details": ""}'

  if [ -f "$project_dir/package.json" ]; then
    local test_output
    local exit_code=0
    test_output=$(cd "$project_dir" && npm test 2>&1) || exit_code=$?
    if [ "$exit_code" -eq 0 ]; then
      result=$(jq -n '{"check": "tests", "status": "pass", "details": "npm test passed"}')
    else
      result=$(jq -n --arg d "$test_output" '{"check": "tests", "status": "fail", "details": ("npm test failed: " + ($d | .[:200]))}')
    fi
  else
    result=$(jq -n '{"check": "tests", "status": "skip", "details": "No package.json found"}')
  fi

  echo "$result" | tr -d '\r'
}

# Check if linting passes
quality_check_lint() {
  local project_dir="${CLAUDE_PROJECT_DIR:-.}"
  local result

  if [ -f "$project_dir/node_modules/.bin/biome" ]; then
    local exit_code=0
    cd "$project_dir" && npx biome check . 2>/dev/null || exit_code=$?
    if [ "$exit_code" -eq 0 ]; then
      result=$(jq -n '{"check": "lint", "status": "pass", "details": "Biome lint passed"}')
    else
      result=$(jq -n '{"check": "lint", "status": "fail", "details": "Biome lint failed"}')
    fi
  else
    result=$(jq -n '{"check": "lint", "status": "skip", "details": "Biome not installed"}')
  fi

  echo "$result" | tr -d '\r'
}

# Automated review checklist validation (S-14)
# Returns a structured checklist with check status
quality_review_checklist() {
  local project_dir="${CLAUDE_PROJECT_DIR:-.}"
  local changes_file="${1:-}"

  local checks="[]"

  # Security: no secrets in diff
  if [ -n "$changes_file" ] && [ -f "$changes_file" ]; then
    if grep -qiE 'password\s*=|api_key\s*=|secret\s*=|token\s*=' "$changes_file" 2>/dev/null; then
      checks=$(echo "$checks" | jq '. + [{"item": "no_secrets", "status": "fail", "detail": "Potential secrets detected in changes"}]')
    else
      checks=$(echo "$checks" | jq '. + [{"item": "no_secrets", "status": "pass", "detail": "No secrets detected"}]')
    fi
  else
    checks=$(echo "$checks" | jq '. + [{"item": "no_secrets", "status": "skip", "detail": "No changes file provided"}]')
  fi

  # Test coverage: tests exist for changed files
  checks=$(echo "$checks" | jq '. + [{"item": "test_coverage", "status": "pending", "detail": "Verify test coverage for changed files"}]')

  # Documentation: README or docs updated if API changed
  checks=$(echo "$checks" | jq '. + [{"item": "documentation", "status": "pending", "detail": "Verify documentation updated if API changed"}]')

  # Performance: no obvious performance regressions
  checks=$(echo "$checks" | jq '. + [{"item": "performance", "status": "pending", "detail": "Verify no performance regressions"}]')

  # Correctness: implementation matches requirements
  checks=$(echo "$checks" | jq '. + [{"item": "correctness", "status": "pending", "detail": "Verify implementation matches requirements"}]')

  # Readability: code is clear and maintainable
  checks=$(echo "$checks" | jq '. + [{"item": "readability", "status": "pending", "detail": "Verify code clarity and maintainability"}]')

  echo "$checks" | tr -d '\r'
}

# Run all quality gates and return combined result
quality_run_all_gates() {
  local results="[]"

  local test_result
  test_result=$(quality_check_tests)
  results=$(echo "$results" | jq --argjson r "$test_result" '. + [$r]')

  local lint_result
  lint_result=$(quality_check_lint)
  results=$(echo "$results" | jq --argjson r "$lint_result" '. + [$r]')

  local pass_count
  pass_count=$(echo "$results" | jq '[.[] | select(.status == "pass")] | length' | tr -d '\r')
  local fail_count
  fail_count=$(echo "$results" | jq '[.[] | select(.status == "fail")] | length' | tr -d '\r')
  local total
  total=$(echo "$results" | jq 'length' | tr -d '\r')

  local gate_status="pass"
  if [ "$fail_count" -gt 0 ]; then
    gate_status="fail"
  fi

  jq -n --arg status "$gate_status" \
        --argjson pass "$pass_count" \
        --argjson fail_count "$fail_count" \
        --argjson total "$total" \
        --argjson checks "$results" \
        '{
          gate_status: $status,
          passed: $pass,
          failed: $fail_count,
          total: $total,
          checks: $checks
        }'
}
