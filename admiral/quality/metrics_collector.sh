#!/bin/bash
# Admiral Framework — Metrics Collector (QA-04)
# Collects quality metrics per module: cyclomatic complexity, test coverage,
# code churn, defect density, lint violations, and test ratios.
#
# Usage:
#   metrics_collector.sh [--json] [--save] [--modules MOD,...] [--since DAYS]
#
# Flags:
#   --json              Emit machine-readable JSON on stdout
#   --save              Persist snapshot to admiral/quality/metrics/<timestamp>.json
#   --modules MOD,...   Comma-separated list of module paths to measure (default: auto-discover)
#   --since DAYS        Look back N days for git churn (default: 30)
#
# Exit codes:
#   0  Metrics collected successfully
#   1  Partial failure (some modules could not be measured)
#   2  Hard error (missing dependency, bad arguments)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
METRICS_DIR="${SCRIPT_DIR}/metrics"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
OPT_JSON=false
OPT_SAVE=false
OPT_MODULES=""
OPT_SINCE=30

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --json)    OPT_JSON=true ;;
      --save)    OPT_SAVE=true ;;
      --modules)
        shift
        if [ $# -eq 0 ]; then
          echo "ERROR: --modules requires an argument" >&2
          exit 2
        fi
        OPT_MODULES="$1"
        ;;
      --since)
        shift
        if [ $# -eq 0 ]; then
          echo "ERROR: --since requires an argument" >&2
          exit 2
        fi
        OPT_SINCE="$1"
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
# Discover modules: top-level subdirectories under admiral/ that have source files
# ---------------------------------------------------------------------------
discover_modules() {
  if [ -n "$OPT_MODULES" ]; then
    echo "$OPT_MODULES" | tr ',' '\n'
    return
  fi

  # Return paths relative to PROJECT_ROOT
  find "${PROJECT_ROOT}/admiral" -mindepth 1 -maxdepth 1 -type d 2>/dev/null \
    | grep -vE "node_modules|\.git|dist|__pycache__" \
    | while IFS= read -r dir; do
        # Only include if the directory has at least one .ts or .sh file
        if find "$dir" -maxdepth 3 \( -name "*.ts" -o -name "*.sh" \) -not -path "*/node_modules/*" 2>/dev/null | grep -q .; then
          echo "${dir#${PROJECT_ROOT}/}"
        fi
      done \
    | sort
}

# ---------------------------------------------------------------------------
# Metric 1: Cyclomatic complexity
# Count decision points per source file, then compute avg and max per module
# ---------------------------------------------------------------------------
count_file_complexity() {
  local filepath="$1"
  local ext="${filepath##*.}"

  case "$ext" in
    sh)
      # if, elif, while, for, case branches, &&, ||
      grep -cE '^\s*(if |elif |while |for |case )|\|\||&&' "$filepath" 2>/dev/null || echo "0"
      ;;
    ts)
      # if, else if, ternary, &&, ||, switch case, catch, ternary ?
      grep -cE '^\s*(if\s*\(|else\s+if\s*\(|case\s+[^:]+:|catch\s*\()|\?\s*[^:?]|\|\||&&' \
        "$filepath" 2>/dev/null || echo "0"
      ;;
    *)
      echo "0"
      ;;
  esac
}

resolve_abs_path() {
  local module_path="$1"
  if [ "${module_path:0:1}" = "/" ]; then
    echo "$module_path"
  else
    echo "${PROJECT_ROOT}/${module_path}"
  fi
}

collect_complexity() {
  local module_path="$1"
  local abs_path
  abs_path=$(resolve_abs_path "$module_path")

  local total=0
  local max=0
  local file_count=0

  while IFS= read -r f; do
    local c
    c=$(count_file_complexity "$f")
    c=$(echo "$c" | tr -d ' \r\n')
    total=$((total + c))
    file_count=$((file_count + 1))
    if [ "$c" -gt "$max" ]; then
      max=$c
    fi
  done < <(find "$abs_path" -maxdepth 5 \
    \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
    -o \( -name "*.ts" -not -name "*.test.ts" -not -name "*.spec.ts" \
         -o -name "*.sh" \) -print 2>/dev/null | grep -v "test_")

  local avg=0
  if [ "$file_count" -gt 0 ]; then
    avg=$((total / file_count))
  fi

  echo "${avg}:${max}"
}

# ---------------------------------------------------------------------------
# Metric 2: Test coverage estimate
# Use coverage-summary.json if available, else compute test-to-code ratio
# ---------------------------------------------------------------------------
collect_coverage() {
  local module_path="$1"
  local abs_path
  abs_path=$(resolve_abs_path "$module_path")

  # Look for Istanbul/c8 coverage data scoped to module
  local coverage_summary="${PROJECT_ROOT}/coverage/coverage-summary.json"

  if [ -f "$coverage_summary" ]; then
    # Try to find module-specific entry (keys are absolute file paths)
    local module_pct
    module_pct=$(jq -r "
      [to_entries[]
       | select(.key | contains(\"${module_path}\"))
       | .value.lines.pct
      ] | if length > 0 then (add / length) else null end
    " "$coverage_summary" 2>/dev/null | tr -d '\r')

    if [ -n "$module_pct" ] && [ "$module_pct" != "null" ]; then
      printf "%.0f" "$module_pct" 2>/dev/null || echo "$module_pct"
      return
    fi
  fi

  # Fallback: test-to-code line ratio as a proxy (capped at 100)
  local src_lines=0
  local test_lines=0

  while IFS= read -r f; do
    local lc
    lc=$(wc -l < "$f" | tr -d ' \r\n')
    src_lines=$((src_lines + lc))
  done < <(find "$abs_path" -maxdepth 5 \
    \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
    -o \( -name "*.ts" -not -name "*.test.ts" -not -name "*.spec.ts" \
         -o -name "*.sh" \) -print 2>/dev/null | grep -v "test_")

  while IFS= read -r f; do
    local lc
    lc=$(wc -l < "$f" | tr -d ' \r\n')
    test_lines=$((test_lines + lc))
  done < <(find "$abs_path" -maxdepth 5 \
    \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
    -o \( -name "*.test.ts" -o -name "*.spec.ts" -o -name "test_*.sh" \) -print 2>/dev/null)

  if [ "$src_lines" -gt 0 ]; then
    local pct
    pct=$((test_lines * 100 / src_lines))
    if [ "$pct" -gt 100 ]; then pct=100; fi
    echo "$pct"
  else
    echo "0"
  fi
}

# ---------------------------------------------------------------------------
# Metric 3: Code churn (git log lines added+removed in last N days)
# ---------------------------------------------------------------------------
collect_churn() {
  local module_path="$1"
  local since_days="$2"

  if ! command -v git >/dev/null 2>&1; then
    echo "0"
    return
  fi

  local since_date
  since_date=$(date -u -d "${since_days} days ago" +%Y-%m-%d 2>/dev/null \
    || date -u -v-"${since_days}"d +%Y-%m-%d 2>/dev/null \
    || python3 -c "import datetime; print((datetime.date.today() - datetime.timedelta(days=${since_days})).isoformat())" 2>/dev/null \
    || echo "")

  if [ -z "$since_date" ]; then
    echo "0"
    return
  fi

  local churn=0
  local git_out=""
  git_out=$(git -C "$PROJECT_ROOT" log \
    --since="$since_date" \
    --numstat \
    --no-merges \
    -- "${module_path}/" 2>/dev/null || true)

  if [ -n "$git_out" ]; then
    # Sum added + removed lines (columns 1 and 2); skip binary files (-)
    churn=$(echo "$git_out" | awk '/^[0-9]/ {added+=$1; removed+=$2} END {print added+removed+0}')
  fi

  echo "$churn"
}

# ---------------------------------------------------------------------------
# Metric 4: Defect density — TODO/FIXME/BUG markers per 1000 lines
# ---------------------------------------------------------------------------
collect_defect_density() {
  local module_path="$1"
  local abs_path
  abs_path=$(resolve_abs_path "$module_path")

  local total_lines=0
  local marker_count=0

  while IFS= read -r f; do
    local lc
    lc=$(wc -l < "$f" | tr -d ' \r\n')
    total_lines=$((total_lines + lc))
    local mc
    mc=$(grep -cEi 'TODO|FIXME|BUG|HACK|XXX' "$f" 2>/dev/null || echo "0")
    mc=$(echo "$mc" | tr -d ' \r\n')
    marker_count=$((marker_count + mc))
  done < <(find "$abs_path" -maxdepth 5 \
    \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
    -o \( -name "*.ts" -o -name "*.sh" \) -print 2>/dev/null)

  if [ "$total_lines" -gt 0 ]; then
    # density per 1000 lines, 2 decimal precision via awk
    awk "BEGIN { printf \"%.2f\", (${marker_count} / ${total_lines}) * 1000 }"
  else
    echo "0.00"
  fi
}

# ---------------------------------------------------------------------------
# Metric 5: Lint violations (ShellCheck for .sh; Biome for .ts)
# ---------------------------------------------------------------------------
collect_lint_violations() {
  local module_path="$1"
  local abs_path
  abs_path=$(resolve_abs_path "$module_path")

  local violations=0

  # ShellCheck
  if command -v shellcheck >/dev/null 2>&1; then
    local sh_files=()
    while IFS= read -r f; do
      sh_files+=("$f")
    done < <(find "$abs_path" -maxdepth 5 \
      \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
      -o -name "*.sh" -print 2>/dev/null)

    if [ "${#sh_files[@]}" -gt 0 ]; then
      local sc_out=""
      sc_out=$(shellcheck --format=json "${sh_files[@]}" 2>/dev/null || true)
      if [ -n "$sc_out" ]; then
        local sc_count
        sc_count=$(echo "$sc_out" | jq 'length' 2>/dev/null | tr -d '\r' || echo "0")
        violations=$((violations + sc_count))
      fi
    fi
  fi

  # Biome (TypeScript)
  if command -v npx >/dev/null 2>&1; then
    local biome_out=""
    biome_out=$(cd "$PROJECT_ROOT" && npx biome check --reporter=json "$abs_path" 2>/dev/null || true)
    if [ -n "$biome_out" ]; then
      local biome_count
      biome_count=$(echo "$biome_out" | jq '.diagnostics | length' 2>/dev/null | tr -d '\r' || echo "0")
      violations=$((violations + biome_count))
    fi
  fi

  echo "$violations"
}

# ---------------------------------------------------------------------------
# Metric 6: Test count and test-to-code ratio
# ---------------------------------------------------------------------------
collect_test_metrics() {
  local module_path="$1"
  local abs_path
  abs_path=$(resolve_abs_path "$module_path")

  # Count test files
  local test_count=0
  test_count=$(find "$abs_path" -maxdepth 5 \
    \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
    -o \( -name "*.test.ts" -o -name "*.spec.ts" -o -name "test_*.sh" \) -print 2>/dev/null \
    | wc -l | tr -d ' ')

  # Count source files
  local src_count=0
  src_count=$(find "$abs_path" -maxdepth 5 \
    \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
    -o \( -name "*.ts" -not -name "*.test.ts" -not -name "*.spec.ts" \
         -o -name "*.sh" \) -print 2>/dev/null \
    | grep -v "test_" | wc -l | tr -d ' ')

  local ratio_str="0.00"
  if [ "$src_count" -gt 0 ]; then
    ratio_str=$(awk "BEGIN { printf \"%.2f\", ${test_count} / ${src_count} }")
  fi

  echo "${test_count}:${src_count}:${ratio_str}"
}

# ---------------------------------------------------------------------------
# Collect all metrics for a single module
# ---------------------------------------------------------------------------
MODULES_JSON="[]"
PARTIAL_FAILURE=false

collect_module_metrics() {
  local module_path="$1"
  local abs_path
  abs_path=$(resolve_abs_path "$module_path")

  if [ ! -d "$abs_path" ]; then
    PARTIAL_FAILURE=true
    return
  fi

  # Collect each metric
  local complexity_str
  complexity_str=$(collect_complexity "$module_path")
  local complexity_avg="${complexity_str%%:*}"
  local complexity_max="${complexity_str##*:}"

  local coverage_pct
  coverage_pct=$(collect_coverage "$module_path")

  local churn
  churn=$(collect_churn "$module_path" "$OPT_SINCE")

  local defect_density
  defect_density=$(collect_defect_density "$module_path")

  local lint_violations
  lint_violations=$(collect_lint_violations "$module_path")

  local test_metrics
  test_metrics=$(collect_test_metrics "$module_path")
  local test_count="${test_metrics%%:*}"
  local rest="${test_metrics#*:}"
  local ratio_str="${rest##*:}"

  # Build JSON entry
  local entry
  entry=$(jq -n \
    --arg name      "$module_path" \
    --argjson ca    "$complexity_avg" \
    --argjson cm    "$complexity_max" \
    --argjson cov   "$coverage_pct" \
    --argjson churn "$churn" \
    --arg dd        "$defect_density" \
    --argjson lv    "$lint_violations" \
    --argjson tc    "$test_count" \
    --arg ratio     "$ratio_str" \
    '{
      name:                  $name,
      complexity_avg:        $ca,
      complexity_max:        $cm,
      test_coverage_pct:     $cov,
      churn_lines_30d:       $churn,
      defect_density_per_1k: $dd,
      lint_violations:       $lv,
      test_count:            $tc,
      test_to_code_ratio:    $ratio
    }')

  MODULES_JSON=$(echo "$MODULES_JSON" | jq --argjson e "$entry" '. + [$e]')
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  parse_args "$@"

  local timestamp
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%S.000Z)

  # Discover or parse modules
  local modules=()
  while IFS= read -r m; do
    if [ -n "$m" ]; then
      modules+=("$m")
    fi
  done < <(discover_modules)

  if [ "${#modules[@]}" -eq 0 ]; then
    echo "WARNING: No modules found to measure" >&2
  fi

  for m in "${modules[@]}"; do
    collect_module_metrics "$m"
  done

  local report
  report=$(jq -n \
    --arg ts       "$timestamp" \
    --argjson mods "$MODULES_JSON" \
    --argjson since "$OPT_SINCE" \
    '{metrics: {
        timestamp:       $ts,
        churn_window_days: $since,
        modules:         $mods
      }}')

  if [ "$OPT_SAVE" = true ]; then
    mkdir -p "$METRICS_DIR"
    local safe_ts
    safe_ts=$(echo "$timestamp" | tr ':' '-')
    local snapshot_path="${METRICS_DIR}/${safe_ts}.json"
    echo "$report" > "$snapshot_path"
    if [ "$OPT_JSON" = false ]; then
      echo "Snapshot saved: $snapshot_path" >&2
    fi
  fi

  if [ "$OPT_JSON" = true ]; then
    echo "$report"
  else
    local mod_count="${#modules[@]}"
    echo "========================================"
    echo " Quality Metrics Report"
    echo " Churn window: ${OPT_SINCE} days"
    echo "========================================"
    printf " %-35s %5s %5s %6s %6s %7s %5s %5s %6s\n" \
      "Module" "CmpA" "CmpM" "Cov%" "Churn" "Defect" "Lint" "Tests" "Ratio"
    echo "------------------------------------------------------------------------"

    echo "$MODULES_JSON" | jq -r '.[] | [
      .name,
      (.complexity_avg | tostring),
      (.complexity_max | tostring),
      (.test_coverage_pct | tostring),
      (.churn_lines_30d | tostring),
      .defect_density_per_1k,
      (.lint_violations | tostring),
      (.test_count | tostring),
      .test_to_code_ratio
    ] | @tsv' \
      | while IFS=$'\t' read -r name ca cm cov churn dd lv tc ratio; do
          printf " %-35s %5s %5s %6s %6s %7s %5s %5s %6s\n" \
            "${name:0:35}" "$ca" "$cm" "$cov" "$churn" "$dd" "$lv" "$tc" "$ratio"
        done

    echo "========================================"
    echo " Modules measured: $mod_count"
    echo "========================================"
  fi

  if [ "$PARTIAL_FAILURE" = true ]; then
    exit 1
  fi
  exit 0
}

main "$@"
