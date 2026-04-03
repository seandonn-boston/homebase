#!/bin/bash
# Admiral Framework — Quality Pipeline (QA-03)
# Multi-stage quality gate: lint → type-check → test → coverage → security → review.
# Each stage produces a pass/fail result. Pipeline halts on Blocker-severity failures
# and emits a self-healing hint so an agent can fix and re-run.
#
# Usage:
#   pipeline.sh [--json] [--stages STAGE,...] [--path PATH] [--fail-fast]
#
# Flags:
#   --json              Emit machine-readable JSON summary on stdout
#   --stages STAGE,...  Comma-separated list of stages to run (default: all)
#   --path PATH         Scope pipeline to this directory/file (default: project root)
#   --fail-fast         Stop immediately on first failing stage (regardless of severity)
#
# Exit codes:
#   0  All stages passed
#   1  One or more stages failed
#   2  Hard error (missing dependency, bad arguments)
#
# Stage names: lint, typecheck, test, coverage, security, review

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
OPT_JSON=false
OPT_FAIL_FAST=false
OPT_PATH="$PROJECT_ROOT"
OPT_STAGES="lint,typecheck,test,coverage,security,review"

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --json)       OPT_JSON=true ;;
      --fail-fast)  OPT_FAIL_FAST=true ;;
      --path)
        shift
        if [ $# -eq 0 ]; then
          echo "ERROR: --path requires an argument" >&2
          exit 2
        fi
        OPT_PATH="$1"
        ;;
      --stages)
        shift
        if [ $# -eq 0 ]; then
          echo "ERROR: --stages requires an argument" >&2
          exit 2
        fi
        OPT_STAGES="$1"
        ;;
      --*)
        echo "ERROR: Unknown flag: $1" >&2
        exit 2
        ;;
    esac
    shift
  done
}

# ---------------------------------------------------------------------------
# Stage result accumulator
# ---------------------------------------------------------------------------
STAGES_JSON="[]"
PIPELINE_START_MS=0

now_ms() {
  # Milliseconds since epoch (bash on Linux; fallback for macOS/Git Bash)
  if date +%s%3N >/dev/null 2>&1; then
    date +%s%3N
  else
    python3 -c "import time; print(int(time.time()*1000))" 2>/dev/null || echo "0"
  fi
}

record_stage() {
  local name="$1"
  local status="$2"
  local duration_ms="$3"
  local issues="$4"
  local detail="$5"

  local entry
  entry=$(jq -n \
    --arg nm   "$name" \
    --arg st   "$status" \
    --argjson d "$duration_ms" \
    --argjson i "$issues" \
    --arg det  "$detail" \
    '{name: $nm, status: $st, duration_ms: $d, issues: $i, detail: $det}')

  STAGES_JSON=$(echo "$STAGES_JSON" | jq --argjson e "$entry" '. + [$e]')
}

# ---------------------------------------------------------------------------
# Utility: check if a stage is enabled
# ---------------------------------------------------------------------------
stage_enabled() {
  local stage="$1"
  echo "$OPT_STAGES" | tr ',' '\n' | grep -qx "$stage"
}

# ---------------------------------------------------------------------------
# Stage 1: Lint
# ---------------------------------------------------------------------------
run_lint() {
  local start_ms
  start_ms=$(now_ms)

  if ! stage_enabled "lint"; then
    record_stage "lint" "skip" 0 0 "Stage not in --stages list"
    return 0
  fi

  local issues=0
  local detail=""
  local status="pass"

  # ShellCheck for .sh files
  if command -v shellcheck >/dev/null 2>&1; then
    local sh_issues=0
    local sh_out=""
    # Process all .sh files in batches via xargs; each batch produces a JSON
    # array, so we merge them with jq -s 'add // []' to handle multiple arrays.
    sh_out=$(find "$OPT_PATH" \
      \( -name "node_modules" -o -name ".git" -o -name "dist" \) -prune \
      -o -name "*.sh" -print0 2>/dev/null \
      | xargs -0 -n 50 shellcheck --format=json 2>/dev/null \
      | jq -s 'add // []' 2>/dev/null || true)

    if [ -n "$sh_out" ]; then
      sh_issues=$(echo "$sh_out" | jq 'length' 2>/dev/null | tr -d '\r' || echo "0")
    fi
    issues=$((issues + sh_issues))
    detail="${detail}shellcheck: ${sh_issues} issues; "
  else
    detail="${detail}shellcheck: not installed (skipped); "
  fi

  # Biome for .ts files
  if command -v npx >/dev/null 2>&1; then
    local ts_issues=0
    local biome_out=""
    biome_out=$(cd "$PROJECT_ROOT" && npx biome check --reporter=json "$OPT_PATH" 2>/dev/null || true)

    if [ -n "$biome_out" ]; then
      ts_issues=$(echo "$biome_out" | jq '.diagnostics | length' 2>/dev/null | tr -d '\r' || echo "0")
    fi
    issues=$((issues + ts_issues))
    detail="${detail}biome: ${ts_issues} issues; "
  else
    detail="${detail}biome/npx: not installed (skipped); "
  fi

  if [ "$issues" -gt 0 ]; then
    status="fail"
    detail="${detail}SELF-HEAL: run 'shellcheck <file>' and 'npx biome check --apply' to fix lint issues"
  fi

  local end_ms
  end_ms=$(now_ms)
  local duration=$((end_ms - start_ms))

  record_stage "lint" "$status" "$duration" "$issues" "$detail"

  [ "$status" = "pass" ]
}

# ---------------------------------------------------------------------------
# Stage 2: Type-check
# ---------------------------------------------------------------------------
run_typecheck() {
  local start_ms
  start_ms=$(now_ms)

  if ! stage_enabled "typecheck"; then
    record_stage "typecheck" "skip" 0 0 "Stage not in --stages list"
    return 0
  fi

  local status="pass"
  local issues=0
  local detail=""

  if [ ! -f "${PROJECT_ROOT}/tsconfig.json" ]; then
    record_stage "typecheck" "skip" 0 0 "No tsconfig.json found"
    return 0
  fi

  if ! command -v npx >/dev/null 2>&1; then
    record_stage "typecheck" "skip" 0 0 "npx not installed"
    return 0
  fi

  local tsc_out=""
  local tsc_exit=0
  tsc_out=$(cd "$PROJECT_ROOT" && npx tsc --noEmit 2>&1) || tsc_exit=$?

  if [ "$tsc_exit" -ne 0 ]; then
    status="fail"
    issues=$(echo "$tsc_out" | grep -c "error TS" || echo "1")
    detail="TypeScript errors detected. SELF-HEAL: run 'npx tsc --noEmit' and fix reported errors. First error: $(echo "$tsc_out" | grep 'error TS' | head -1 | tr -d '\n')"
  else
    detail="tsc: no type errors"
  fi

  local end_ms
  end_ms=$(now_ms)
  local duration=$((end_ms - start_ms))

  record_stage "typecheck" "$status" "$duration" "$issues" "$detail"

  [ "$status" = "pass" ]
}

# ---------------------------------------------------------------------------
# Stage 3: Test
# ---------------------------------------------------------------------------
run_test() {
  local start_ms
  start_ms=$(now_ms)

  if ! stage_enabled "test"; then
    record_stage "test" "skip" 0 0 "Stage not in --stages list"
    return 0
  fi

  local status="pass"
  local issues=0
  local detail=""

  # Prefer npm test if package.json has a test script
  local has_npm_test=false
  if [ -f "${PROJECT_ROOT}/package.json" ]; then
    if jq -e '.scripts.test' "${PROJECT_ROOT}/package.json" >/dev/null 2>&1; then
      has_npm_test=true
    fi
  fi

  if [ "$has_npm_test" = true ] && command -v npm >/dev/null 2>&1; then
    local npm_out=""
    local npm_exit=0
    npm_out=$(cd "$PROJECT_ROOT" && npm test 2>&1) || npm_exit=$?

    if [ "$npm_exit" -ne 0 ]; then
      status="fail"
      issues=$(echo "$npm_out" | grep -cE "failing|FAIL|Error" 2>/dev/null || echo "1")
      detail="npm test failed (exit ${npm_exit}). SELF-HEAL: run 'npm test' locally and fix failing tests. Output tail: $(echo "$npm_out" | tail -5 | tr '\n' '|')"
    else
      local passed
      passed=$(echo "$npm_out" | grep -oE '[0-9]+ passing' | head -1 || echo "unknown")
      detail="npm test: ${passed}"
    fi
  else
    # Fall back to bash test runner: find test_*.sh files under project
    local test_files=()
    while IFS= read -r f; do
      test_files+=("$f")
    done < <(find "$OPT_PATH" \
      \( -name "node_modules" -o -name ".git" -o -name "dist" \) -prune \
      -o -name "test_*.sh" -print 2>/dev/null | sort)

    local run_count=0
    local fail_count=0

    for tf in "${test_files[@]}"; do
      run_count=$((run_count + 1))
      local tf_exit=0
      bash "$tf" >/dev/null 2>&1 || tf_exit=$?
      if [ "$tf_exit" -ne 0 ]; then
        fail_count=$((fail_count + 1))
        detail="${detail}FAILED: $(basename "$tf"); "
      fi
    done

    issues=$fail_count

    if [ "$fail_count" -gt 0 ]; then
      status="fail"
      detail="${detail}SELF-HEAL: run failing test scripts directly to see assertion output"
    else
      detail="bash tests: ${run_count} suites passed"
    fi
  fi

  local end_ms
  end_ms=$(now_ms)
  local duration=$((end_ms - start_ms))

  record_stage "test" "$status" "$duration" "$issues" "$detail"

  [ "$status" = "pass" ]
}

# ---------------------------------------------------------------------------
# Stage 4: Coverage
# ---------------------------------------------------------------------------
run_coverage() {
  local start_ms
  start_ms=$(now_ms)

  if ! stage_enabled "coverage"; then
    record_stage "coverage" "skip" 0 0 "Stage not in --stages list"
    return 0
  fi

  local status="pass"
  local issues=0
  local detail=""
  local threshold=60  # minimum coverage percentage

  # Look for coverage report files
  local coverage_summary="${PROJECT_ROOT}/coverage/coverage-summary.json"
  local lcov_info="${PROJECT_ROOT}/coverage/lcov.info"

  if [ -f "$coverage_summary" ]; then
    # Parse Istanbul/c8 coverage-summary.json
    local total_pct
    total_pct=$(jq -r '.total.lines.pct' "$coverage_summary" 2>/dev/null | tr -d '\r' || echo "0")
    local total_int=${total_pct%.*}

    if [ "$total_int" -lt "$threshold" ]; then
      status="fail"
      issues=1
      detail="Coverage ${total_pct}% is below threshold ${threshold}%. SELF-HEAL: add tests for uncovered code paths, then re-run 'npm test -- --coverage'"
    else
      detail="Coverage: ${total_pct}% (threshold: ${threshold}%)"
    fi
  elif [ -f "$lcov_info" ]; then
    # Estimate from lcov: count lines hit vs total
    local lines_hit lines_total pct
    lines_hit=$(grep -c "^DA:[0-9]*,[^0]" "$lcov_info" 2>/dev/null || echo "0")
    lines_total=$(grep -c "^DA:" "$lcov_info" 2>/dev/null || echo "0")
    if [ "$lines_total" -gt 0 ]; then
      pct=$((lines_hit * 100 / lines_total))
    else
      pct=0
    fi

    if [ "$pct" -lt "$threshold" ]; then
      status="fail"
      issues=1
      detail="LCOV coverage ${pct}% below threshold ${threshold}%. SELF-HEAL: increase test coverage"
    else
      detail="LCOV coverage: ${pct}% (threshold: ${threshold}%)"
    fi
  else
    # Estimate test-to-code ratio as a proxy
    local src_count test_count ratio
    src_count=$(find "$OPT_PATH" \
      \( -name "node_modules" -o -name ".git" -o -name "dist" \) -prune \
      -o \( -name "*.ts" -not -name "*.test.ts" -not -name "*.spec.ts" \) -print 2>/dev/null \
      | grep -v "test_" | wc -l | tr -d ' ')
    test_count=$(find "$OPT_PATH" \
      \( -name "node_modules" -o -name ".git" -o -name "dist" \) -prune \
      -o \( -name "*.test.ts" -o -name "*.spec.ts" -o -name "test_*.sh" \) -print 2>/dev/null \
      | wc -l | tr -d ' ')

    if [ "$src_count" -gt 0 ]; then
      ratio=$((test_count * 100 / src_count))
    else
      ratio=100
    fi

    detail="No coverage report found. Estimated test ratio: ${test_count} tests / ${src_count} sources = ${ratio}%"
    # Don't fail on estimated ratio — it's informational
  fi

  local end_ms
  end_ms=$(now_ms)
  local duration=$((end_ms - start_ms))

  record_stage "coverage" "$status" "$duration" "$issues" "$detail"

  [ "$status" = "pass" ]
}

# ---------------------------------------------------------------------------
# Stage 5: Security
# ---------------------------------------------------------------------------
run_security() {
  local start_ms
  start_ms=$(now_ms)

  if ! stage_enabled "security"; then
    record_stage "security" "skip" 0 0 "Stage not in --stages list"
    return 0
  fi

  local status="pass"
  local issues=0
  local detail=""

  # Pattern 1: hardcoded secrets (common patterns)
  local secret_patterns=(
    "password\s*=\s*['\"][^'\"]{4,}"
    "api_key\s*=\s*['\"][^'\"]{8,}"
    "secret\s*=\s*['\"][^'\"]{8,}"
    "token\s*=\s*['\"][^'\"]{8,}"
    "private_key\s*=\s*['\"][^'\"]{8,}"
    "BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY"
    "AKIA[0-9A-Z]{16}"
  )

  local secret_count=0
  local first_secret=""
  for pattern in "${secret_patterns[@]}"; do
    local found
    found=$(find "$OPT_PATH" \
      \( -name "node_modules" -o -name ".git" -o -name "dist" -o -name "*.lock" \) -prune \
      -o \( -name "*.ts" -o -name "*.sh" -o -name "*.env" -o -name "*.json" \) -print 2>/dev/null \
      | xargs grep -liE "$pattern" 2>/dev/null || true)

    if [ -n "$found" ]; then
      secret_count=$((secret_count + 1))
      if [ -z "$first_secret" ]; then
        first_secret="$found"
      fi
    fi
  done

  if [ "$secret_count" -gt 0 ]; then
    status="fail"
    issues=$((issues + secret_count))
    detail="${detail}Potential secrets detected in ${secret_count} pattern(s). First match: ${first_secret}. SELF-HEAL: remove hardcoded secrets, use environment variables or a secrets manager; "
  fi

  # Pattern 2: unsafe eval usage in bash
  local eval_count=0
  eval_count=$(find "$OPT_PATH" \
    \( -name "node_modules" -o -name ".git" -o -name "dist" \) -prune \
    -o -name "*.sh" -print 2>/dev/null \
    | xargs grep -lE '^\s*eval\s' 2>/dev/null | wc -l | tr -d ' ' || echo "0")

  if [ "$eval_count" -gt 0 ]; then
    issues=$((issues + eval_count))
    detail="${detail}eval usage found in ${eval_count} shell file(s) — review for injection risk; "
  fi

  # Pattern 3: TODO/FIXME/HACK security markers
  local security_todo_count=0
  security_todo_count=$(find "$OPT_PATH" \
    \( -name "node_modules" -o -name ".git" -o -name "dist" \) -prune \
    -o \( -name "*.ts" -o -name "*.sh" \) -print 2>/dev/null \
    | xargs grep -ciE "TODO.*security|FIXME.*security|HACK.*security|SECURITY.*TODO" 2>/dev/null \
    | awk -F: '{s+=$2} END {print s+0}' || echo "0")

  if [ "$security_todo_count" -gt 0 ]; then
    issues=$((issues + security_todo_count))
    detail="${detail}${security_todo_count} security-tagged TODO/FIXME markers found — resolve before release; "
  fi

  if [ "$issues" -eq 0 ]; then
    detail="No obvious security issues detected"
  fi

  if [ "$status" = "fail" ]; then
    detail="${detail}SELF-HEAL: Review flagged files and remove/rotate any exposed credentials"
  fi

  local end_ms
  end_ms=$(now_ms)
  local duration=$((end_ms - start_ms))

  record_stage "security" "$status" "$duration" "$issues" "$detail"

  [ "$status" = "pass" ]
}

# ---------------------------------------------------------------------------
# Stage 6: Code Review (QA-01)
# ---------------------------------------------------------------------------
run_review() {
  local start_ms
  start_ms=$(now_ms)

  if ! stage_enabled "review"; then
    record_stage "review" "skip" 0 0 "Stage not in --stages list"
    return 0
  fi

  local review_script="${SCRIPT_DIR}/code_review.sh"

  if [ ! -f "$review_script" ]; then
    record_stage "review" "skip" 0 0 "code_review.sh (QA-01) not found at ${review_script}"
    return 0
  fi

  local status="pass"
  local issues=0
  local detail=""

  local review_out=""
  local review_exit=0
  review_out=$(bash "$review_script" --json 2>/dev/null) || review_exit=$?

  if [ -n "$review_out" ] && echo "$review_out" | jq empty 2>/dev/null; then
    local blocker major
    blocker=$(echo "$review_out" | jq '.review.summary.blocker // 0' | tr -d '\r')
    major=$(echo "$review_out"   | jq '.review.summary.major // 0'   | tr -d '\r')
    issues=$((blocker + major))

    if [ "$blocker" -gt 0 ]; then
      status="fail"
      detail="Blocker issues: ${blocker}, Major issues: ${major}. SELF-HEAL: run 'admiral/quality/code_review.sh --json' to see full issue list"
    elif [ "$major" -gt 0 ]; then
      status="fail"
      detail="Major issues: ${major}. SELF-HEAL: run 'admiral/quality/code_review.sh --json' to see full issue list"
    else
      local total
      total=$(echo "$review_out" | jq '.review.summary | .minor + .cosmetic' | tr -d '\r' || echo "0")
      detail="Review passed. Minor/cosmetic: ${total}"
    fi
  elif [ "$review_exit" -ne 0 ]; then
    status="fail"
    issues=1
    detail="code_review.sh exited with code ${review_exit}. SELF-HEAL: run code_review.sh manually to diagnose"
  else
    detail="Review completed (no JSON output — check code_review.sh)"
  fi

  local end_ms
  end_ms=$(now_ms)
  local duration=$((end_ms - start_ms))

  record_stage "review" "$status" "$duration" "$issues" "$detail"

  [ "$status" = "pass" ]
}

# ---------------------------------------------------------------------------
# Determine if a stage failure is a Blocker (halts pipeline)
# Blocker stages: lint, typecheck, security
# Continue-on-fail stages: test, coverage, review
# ---------------------------------------------------------------------------
is_blocker_stage() {
  local stage="$1"
  case "$stage" in
    lint|typecheck|security) return 0 ;;
    *) return 1 ;;
  esac
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  parse_args "$@"

  PIPELINE_START_MS=$(now_ms)

  local overall_status="pass"
  local halted=false

  # Run stages in order
  local ordered_stages=(lint typecheck test coverage security review)

  for stage in "${ordered_stages[@]}"; do
    if [ "$halted" = true ]; then
      record_stage "$stage" "skip" 0 0 "Pipeline halted by earlier blocker"
      continue
    fi

    local stage_pass=true

    case "$stage" in
      lint)      run_lint      || stage_pass=false ;;
      typecheck) run_typecheck || stage_pass=false ;;
      test)      run_test      || stage_pass=false ;;
      coverage)  run_coverage  || stage_pass=false ;;
      security)  run_security  || stage_pass=false ;;
      review)    run_review    || stage_pass=false ;;
    esac

    if [ "$stage_pass" = false ]; then
      overall_status="fail"

      # Halt on blocker stages OR if --fail-fast
      if is_blocker_stage "$stage" || [ "$OPT_FAIL_FAST" = true ]; then
        halted=true
      fi
    fi
  done

  local pipeline_end_ms
  pipeline_end_ms=$(now_ms)
  local total_duration=$((pipeline_end_ms - PIPELINE_START_MS))

  local timestamp
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%S.000Z)

  local report
  report=$(jq -n \
    --arg ts     "$timestamp" \
    --argjson st "$STAGES_JSON" \
    --arg ov     "$overall_status" \
    --argjson dur "$total_duration" \
    '{pipeline: {
        timestamp:   $ts,
        stages:      $st,
        overall:     $ov,
        duration_ms: $dur
      }}')

  if [ "$OPT_JSON" = true ]; then
    echo "$report"
  else
    local pass_count fail_count skip_count
    pass_count=$(echo "$STAGES_JSON" | jq '[.[] | select(.status == "pass")] | length' | tr -d '\r')
    fail_count=$(echo "$STAGES_JSON" | jq '[.[] | select(.status == "fail")] | length' | tr -d '\r')
    skip_count=$(echo "$STAGES_JSON" | jq '[.[] | select(.status == "skip")] | length' | tr -d '\r')

    echo "========================================"
    echo " Quality Pipeline Report"
    echo "========================================"
    printf " %-12s %-8s %-6s %s\n" "Stage" "Status" "Issues" "Detail"
    echo "----------------------------------------"
    echo "$STAGES_JSON" | jq -r '.[] | [.name, .status, (.issues | tostring), .detail] | @tsv' \
      | while IFS=$'\t' read -r name status iss det; do
          printf " %-12s %-8s %-6s %s\n" "$name" "$status" "$iss" "${det:0:60}"
        done
    echo "========================================"
    printf " Passed: %d  Failed: %d  Skipped: %d  Duration: %dms\n" \
      "$pass_count" "$fail_count" "$skip_count" "$total_duration"
    echo " Overall: $overall_status"
    echo "========================================"

    if [ "$overall_status" = "fail" ]; then
      echo ""
      echo "Self-healing hints:"
      echo "$STAGES_JSON" \
        | jq -r '.[] | select(.status == "fail") | "  [" + .name + "] " + .detail' \
        | grep "SELF-HEAL" || true
    fi
  fi

  if [ "$overall_status" = "fail" ]; then
    exit 1
  fi
  exit 0
}

main "$@"
