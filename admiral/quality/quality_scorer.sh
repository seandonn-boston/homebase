#!/bin/bash
# Admiral Framework — Quality Scorer (QA-09)
# Calculates a composite 0-100 quality score per module.
#
# Dimensions and weights:
#   test_coverage  25%   — coverage percentage
#   complexity     20%   — inverse of avg cyclomatic complexity
#   lint           15%   — inverse of lint violations
#   docs           15%   — documentation / test ratio proxy
#   churn          10%   — stability (inverse of churn)
#   defect_density 15%   — inverse of defect markers per 1k lines
#
# Classification:
#   green  80-100
#   yellow 60-79
#   red    0-59
#
# Usage:
#   quality_scorer.sh [--json] [--save] [--module MOD] [--since DAYS]
#
# Flags:
#   --json          Emit machine-readable JSON on stdout
#   --save          Persist scores to admiral/quality/metrics/quality_scores.json
#   --module MOD    Score only the named module
#   --since DAYS    Churn look-back window (default: 30)
#
# Exit codes:
#   0  All modules green or yellow
#   1  One or more modules red
#   2  Hard error (missing dependency, bad arguments)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WEIGHTS_CONFIG="${PROJECT_ROOT}/admiral/config/quality_weights.json"
METRICS_DIR="${SCRIPT_DIR}/metrics"
SCORES_FILE="${METRICS_DIR}/quality_scores.json"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
OPT_JSON=false
OPT_SAVE=false
OPT_MODULE=""
OPT_SINCE=30

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --json)   OPT_JSON=true ;;
      --save)   OPT_SAVE=true ;;
      --since)
        shift
        if [ $# -eq 0 ]; then
          echo "ERROR: --since requires an argument" >&2
          exit 2
        fi
        OPT_SINCE="$1"
        ;;
      --module)
        shift
        if [ $# -eq 0 ]; then
          echo "ERROR: --module requires an argument" >&2
          exit 2
        fi
        OPT_MODULE="$1"
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
# Load config
# ---------------------------------------------------------------------------
load_config() {
  if [ ! -f "$WEIGHTS_CONFIG" ]; then
    echo "ERROR: quality weights config not found: $WEIGHTS_CONFIG" >&2
    exit 2
  fi
  if ! jq empty "$WEIGHTS_CONFIG" 2>/dev/null; then
    echo "ERROR: quality weights config is not valid JSON: $WEIGHTS_CONFIG" >&2
    exit 2
  fi
}

get_weight() {
  local dim="$1"
  jq -r --arg d "$dim" '.dimensions[$d].weight' "$WEIGHTS_CONFIG" 2>/dev/null | tr -d '\r'
}

get_threshold() {
  local key="$1"
  jq -r --arg k "$key" '.thresholds[$k]' "$WEIGHTS_CONFIG" 2>/dev/null | tr -d '\r'
}

# ---------------------------------------------------------------------------
# Module discovery
# ---------------------------------------------------------------------------
discover_modules() {
  if [ -n "$OPT_MODULE" ]; then
    echo "$OPT_MODULE"
    return
  fi
  find "${PROJECT_ROOT}/admiral" -mindepth 1 -maxdepth 1 -type d 2>/dev/null \
    | grep -vE "node_modules|\.git|dist|__pycache__" \
    | while IFS= read -r dir; do
        if find "$dir" -maxdepth 3 \( -name "*.ts" -o -name "*.sh" \) \
            -not -path "*/node_modules/*" 2>/dev/null | grep -q .; then
          echo "${dir#${PROJECT_ROOT}/}"
        fi
      done \
    | sort
}

# ---------------------------------------------------------------------------
# Raw metric helpers (reuse patterns from metrics_collector.sh)
# ---------------------------------------------------------------------------
resolve_abs() {
  local p="$1"
  if [ "${p:0:1}" = "/" ]; then echo "$p"; else echo "${PROJECT_ROOT}/${p}"; fi
}

collect_complexity_avg() {
  local abs="$1"
  local total=0
  local count=0
  while IFS= read -r f; do
    local ext="${f##*.}"
    local c=0
    case "$ext" in
      sh) c=$(grep -cE '^\s*(if |elif |while |for |case )|\|\||&&' "$f" 2>/dev/null || echo "0") ;;
      ts) c=$(grep -cE '^\s*(if\s*\(|else\s+if\s*\(|case\s+[^:]+:|catch\s*\()|\?\s*[^:?]|\|\||&&' "$f" 2>/dev/null || echo "0") ;;
    esac
    c=$(echo "$c" | tr -d ' \r\n')
    total=$((total + c))
    count=$((count + 1))
  done < <(find "$abs" -maxdepth 5 \
    \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
    -o \( -name "*.ts" -not -name "*.test.ts" -not -name "*.spec.ts" \
         -o -name "*.sh" \) -print 2>/dev/null | grep -v "test_")
  if [ "$count" -gt 0 ]; then awk "BEGIN { printf \"%.2f\", $total / $count }"; else echo "0"; fi
}

collect_coverage_pct() {
  local module_path="$1"
  local abs="$2"
  local coverage_summary="${PROJECT_ROOT}/coverage/coverage-summary.json"
  if [ -f "$coverage_summary" ]; then
    local pct
    pct=$(jq -r --arg m "$module_path" '
      [to_entries[] | select(.key | contains($m)) | .value.lines.pct]
      | if length > 0 then (add / length) else null end
    ' "$coverage_summary" 2>/dev/null | tr -d '\r')
    if [ -n "$pct" ] && [ "$pct" != "null" ]; then
      printf "%.0f" "$pct" 2>/dev/null || echo "$pct"
      return
    fi
  fi

  local src=0
  local tst=0
  while IFS= read -r f; do
    local lc
    lc=$(wc -l < "$f" | tr -d ' \r\n')
    src=$((src + lc))
  done < <(find "$abs" -maxdepth 5 \
    \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
    -o \( -name "*.ts" -not -name "*.test.ts" -not -name "*.spec.ts" \
         -o -name "*.sh" \) -print 2>/dev/null | grep -v "test_")
  while IFS= read -r f; do
    local lc
    lc=$(wc -l < "$f" | tr -d ' \r\n')
    tst=$((tst + lc))
  done < <(find "$abs" -maxdepth 5 \
    \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
    -o \( -name "*.test.ts" -o -name "*.spec.ts" -o -name "test_*.sh" \) -print 2>/dev/null)
  if [ "$src" -gt 0 ]; then
    local pct=$((tst * 100 / src))
    if [ "$pct" -gt 100 ]; then pct=100; fi
    echo "$pct"
  else
    echo "0"
  fi
}

collect_lint_count() {
  local abs="$1"
  local violations=0
  if command -v shellcheck >/dev/null 2>&1; then
    local sh_files=()
    while IFS= read -r f; do sh_files+=("$f"); done < <(find "$abs" -maxdepth 5 \
      \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
      -o -name "*.sh" -print 2>/dev/null)
    if [ "${#sh_files[@]}" -gt 0 ]; then
      local sc
      sc=$(shellcheck --format=json "${sh_files[@]}" 2>/dev/null || true)
      if [ -n "$sc" ]; then
        local cnt
        cnt=$(echo "$sc" | jq 'length' 2>/dev/null | tr -d '\r' || echo "0")
        violations=$((violations + cnt))
      fi
    fi
  fi
  echo "$violations"
}

collect_test_ratio() {
  local abs="$1"
  local tc=0
  local sc=0
  tc=$(find "$abs" -maxdepth 5 \
    \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
    -o \( -name "*.test.ts" -o -name "*.spec.ts" -o -name "test_*.sh" \) -print 2>/dev/null \
    | wc -l | tr -d ' ')
  sc=$(find "$abs" -maxdepth 5 \
    \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
    -o \( -name "*.ts" -not -name "*.test.ts" -not -name "*.spec.ts" \
         -o -name "*.sh" \) -print 2>/dev/null | grep -v "test_" | wc -l | tr -d ' ')
  if [ "$sc" -gt 0 ]; then
    awk "BEGIN { printf \"%.2f\", $tc / $sc }"
  else
    echo "0.00"
  fi
}

collect_churn() {
  local module_path="$1"
  if ! command -v git >/dev/null 2>&1; then echo "0"; return; fi
  local since_date
  since_date=$(date -u -d "${OPT_SINCE} days ago" +%Y-%m-%d 2>/dev/null \
    || date -u -v-"${OPT_SINCE}"d +%Y-%m-%d 2>/dev/null \
    || python3 -c "import datetime; print((datetime.date.today() - datetime.timedelta(days=${OPT_SINCE})).isoformat())" 2>/dev/null \
    || echo "")
  if [ -z "$since_date" ]; then echo "0"; return; fi
  local out
  out=$(git -C "$PROJECT_ROOT" log --since="$since_date" --numstat --no-merges \
    -- "${module_path}/" 2>/dev/null || true)
  if [ -n "$out" ]; then
    echo "$out" | awk '/^[0-9]/ {s+=$1+$2} END {print s+0}'
  else
    echo "0"
  fi
}

collect_defect_density() {
  local abs="$1"
  local total_lines=0
  local markers=0
  while IFS= read -r f; do
    local lc
    lc=$(wc -l < "$f" | tr -d ' \r\n')
    total_lines=$((total_lines + lc))
    local mc
    mc=$(grep -cEi 'TODO|FIXME|BUG|HACK|XXX' "$f" 2>/dev/null || echo "0")
    mc=$(echo "$mc" | tr -d ' \r\n')
    markers=$((markers + mc))
  done < <(find "$abs" -maxdepth 5 \
    \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
    -o \( -name "*.ts" -o -name "*.sh" \) -print 2>/dev/null)
  if [ "$total_lines" -gt 0 ]; then
    awk "BEGIN { printf \"%.2f\", ($markers / $total_lines) * 1000 }"
  else
    echo "0.00"
  fi
}

# ---------------------------------------------------------------------------
# Dimension scoring functions (each returns 0-100)
# ---------------------------------------------------------------------------
score_coverage() {
  local pct="$1"
  local ideal=90
  local acceptable=60
  ideal=$(jq -r '.dimensions.test_coverage.ideal' "$WEIGHTS_CONFIG" | tr -d '\r')
  acceptable=$(jq -r '.dimensions.test_coverage.acceptable' "$WEIGHTS_CONFIG" | tr -d '\r')
  awk "BEGIN {
    if ($pct >= $ideal) print 100
    else if ($pct >= $acceptable) printf \"%.0f\", 60 + ($pct - $acceptable) / ($ideal - $acceptable) * 40
    else if ($pct > 0) printf \"%.0f\", ($pct / $acceptable) * 60
    else print 0
  }"
}

score_complexity() {
  local avg="$1"
  local ideal_max=5
  local acceptable_max=15
  ideal_max=$(jq -r '.dimensions.complexity.ideal_max_avg' "$WEIGHTS_CONFIG" | tr -d '\r')
  acceptable_max=$(jq -r '.dimensions.complexity.acceptable_max_avg' "$WEIGHTS_CONFIG" | tr -d '\r')
  awk "BEGIN {
    if ($avg <= $ideal_max) print 100
    else if ($avg <= $acceptable_max) printf \"%.0f\", 100 - (($avg - $ideal_max) / ($acceptable_max - $ideal_max)) * 40
    else { v = 60 - (($avg - $acceptable_max) * 3); printf \"%.0f\", (v < 0 ? 0 : v) }
  }" 2>/dev/null || echo "50"
}

score_lint() {
  local violations="$1"
  awk "BEGIN {
    if ($violations == 0) print 100
    else if ($violations <= 5) printf \"%.0f\", 100 - $violations * 8
    else if ($violations <= 20) printf \"%.0f\", 60 - ($violations - 5) * 2
    else print 0
  }" 2>/dev/null || echo "50"
}

score_docs() {
  local ratio="$1"
  local ideal=1.0
  local acceptable=0.5
  ideal=$(jq -r '.dimensions.docs.ideal_ratio' "$WEIGHTS_CONFIG" | tr -d '\r')
  acceptable=$(jq -r '.dimensions.docs.acceptable_ratio' "$WEIGHTS_CONFIG" | tr -d '\r')
  awk "BEGIN {
    if ($ratio >= $ideal) print 100
    else if ($ratio >= $acceptable) printf \"%.0f\", 60 + ($ratio - $acceptable) / ($ideal - $acceptable) * 40
    else if ($ratio > 0) printf \"%.0f\", ($ratio / $acceptable) * 60
    else print 0
  }" 2>/dev/null || echo "0"
}

score_churn() {
  local churn="$1"
  local low=100
  local high=1000
  low=$(jq -r '.dimensions.churn.low_churn_lines' "$WEIGHTS_CONFIG" | tr -d '\r')
  high=$(jq -r '.dimensions.churn.high_churn_lines' "$WEIGHTS_CONFIG" | tr -d '\r')
  awk "BEGIN {
    if ($churn <= $low) print 100
    else if ($churn <= $high) printf \"%.0f\", 100 - (($churn - $low) / ($high - $low)) * 60
    else print 40
  }" 2>/dev/null || echo "50"
}

score_defect() {
  local density="$1"
  local acceptable=2.0
  local critical=10.0
  acceptable=$(jq -r '.dimensions.defect_density.acceptable_per_1k' "$WEIGHTS_CONFIG" | tr -d '\r')
  critical=$(jq -r '.dimensions.defect_density.critical_per_1k' "$WEIGHTS_CONFIG" | tr -d '\r')
  awk "BEGIN {
    if ($density == 0) print 100
    else if ($density <= $acceptable) printf \"%.0f\", 100 - ($density / $acceptable) * 20
    else if ($density <= $critical) printf \"%.0f\", 80 - (($density - $acceptable) / ($critical - $acceptable)) * 60
    else print 20
  }" 2>/dev/null || echo "50"
}

classify_score() {
  local score="$1"
  local green
  green=$(get_threshold "green")
  local yellow
  yellow=$(get_threshold "yellow")
  if [ "$score" -ge "$green" ]; then echo "green"
  elif [ "$score" -ge "$yellow" ]; then echo "yellow"
  else echo "red"
  fi
}

# ---------------------------------------------------------------------------
# Score one module
# ---------------------------------------------------------------------------
MODULE_SCORES="[]"
RED_COUNT=0

score_module() {
  local module_path="$1"
  local abs
  abs=$(resolve_abs "$module_path")

  if [ ! -d "$abs" ]; then return; fi

  local coverage
  coverage=$(collect_coverage_pct "$module_path" "$abs")
  local complexity_avg
  complexity_avg=$(collect_complexity_avg "$abs")
  local lint_count
  lint_count=$(collect_lint_count "$abs")
  local test_ratio
  test_ratio=$(collect_test_ratio "$abs")
  local churn
  churn=$(collect_churn "$module_path")
  local defect_density
  defect_density=$(collect_defect_density "$abs")

  # Dimension scores
  local s_cov
  s_cov=$(score_coverage "$coverage")
  local s_cmp
  s_cmp=$(score_complexity "$complexity_avg")
  local s_lint
  s_lint=$(score_lint "$lint_count")
  local s_docs
  s_docs=$(score_docs "$test_ratio")
  local s_churn
  s_churn=$(score_churn "$churn")
  local s_defect
  s_defect=$(score_defect "$defect_density")

  # Weights
  local w_cov w_cmp w_lint w_docs w_churn w_defect
  w_cov=$(get_weight "test_coverage")
  w_cmp=$(get_weight "complexity")
  w_lint=$(get_weight "lint")
  w_docs=$(get_weight "docs")
  w_churn=$(get_weight "churn")
  w_defect=$(get_weight "defect_density")

  # Composite score
  local composite
  composite=$(awk "BEGIN { printf \"%.0f\", $s_cov * $w_cov + $s_cmp * $w_cmp + $s_lint * $w_lint + $s_docs * $w_docs + $s_churn * $w_churn + $s_defect * $w_defect }")

  local classification
  classification=$(classify_score "$composite")

  if [ "$classification" = "red" ]; then
    RED_COUNT=$((RED_COUNT + 1))
  fi

  local entry
  entry=$(jq -n \
    --arg module     "$module_path" \
    --argjson score  "$composite" \
    --arg class      "$classification" \
    --argjson s_cov  "$s_cov" \
    --argjson s_cmp  "$s_cmp" \
    --argjson s_lint "$s_lint" \
    --argjson s_docs "$s_docs" \
    --argjson s_churn "$s_churn" \
    --argjson s_defect "$s_defect" \
    --arg raw_cov    "$coverage" \
    --arg raw_cmp    "$complexity_avg" \
    --argjson raw_lint "$lint_count" \
    --arg raw_docs   "$test_ratio" \
    --argjson raw_churn "$churn" \
    --arg raw_defect "$defect_density" \
    '{
      module:         $module,
      score:          $score,
      classification: $class,
      dimensions: {
        test_coverage:  {score: $s_cov,    raw: ($raw_cov | tonumber)},
        complexity:     {score: $s_cmp,    raw: ($raw_cmp | tonumber)},
        lint:           {score: $s_lint,   raw: $raw_lint},
        docs:           {score: $s_docs,   raw: ($raw_docs | tonumber)},
        churn:          {score: $s_churn,  raw: $raw_churn},
        defect_density: {score: $s_defect, raw: ($raw_defect | tonumber)}
      }
    }')

  MODULE_SCORES=$(echo "$MODULE_SCORES" | jq --argjson e "$entry" '. + [$e]')
}

# ---------------------------------------------------------------------------
# Persist scores to history file
# ---------------------------------------------------------------------------
persist_scores() {
  local timestamp="$1"
  local scores="$2"
  mkdir -p "$METRICS_DIR"

  local history="[]"
  if [ -f "$SCORES_FILE" ]; then
    history=$(jq '.' "$SCORES_FILE" 2>/dev/null || echo "[]")
  fi

  local snapshot
  snapshot=$(jq -n \
    --arg ts "$timestamp" \
    --argjson s "$scores" \
    '{timestamp: $ts, scores: $s}')

  history=$(echo "$history" | jq --argjson snap "$snapshot" '. + [$snap]')
  echo "$history" > "$SCORES_FILE"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  parse_args "$@"

  if ! command -v jq >/dev/null 2>&1; then
    echo "ERROR: jq is required" >&2
    exit 2
  fi

  load_config

  while IFS= read -r mod; do
    if [ -n "$mod" ]; then score_module "$mod"; fi
  done < <(discover_modules)

  local timestamp
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%S.000Z)

  local total_modules
  total_modules=$(echo "$MODULE_SCORES" | jq 'length')
  local green_count yellow_count
  green_count=$(echo "$MODULE_SCORES" | jq '[.[] | select(.classification == "green")] | length')
  yellow_count=$(echo "$MODULE_SCORES" | jq '[.[] | select(.classification == "yellow")] | length')

  if [ "$OPT_SAVE" = true ]; then
    persist_scores "$timestamp" "$MODULE_SCORES"
  fi

  local report
  report=$(jq -n \
    --arg ts    "$timestamp" \
    --argjson mods "$MODULE_SCORES" \
    --argjson total "$total_modules" \
    --argjson green "$green_count" \
    --argjson yellow "$yellow_count" \
    --argjson red "$RED_COUNT" \
    '{quality_scores: {
        timestamp:     $ts,
        total_modules: $total,
        green:         $green,
        yellow:        $yellow,
        red:           $red,
        modules:       $mods
      }}')

  if [ "$OPT_JSON" = true ]; then
    echo "$report"
  else
    echo "========================================"
    echo " Quality Score Report"
    echo " Modules: $total_modules  Green: $green_count  Yellow: $yellow_count  Red: $RED_COUNT"
    echo "========================================"
    printf " %-35s %5s %-8s %5s %5s %5s %5s %5s %5s\n" \
      "Module" "Score" "Class" "Cov" "Cmp" "Lint" "Docs" "Churn" "Def"
    echo "------------------------------------------------------------------------"
    echo "$MODULE_SCORES" | jq -r '.[] | [
      .module, (.score|tostring), .classification,
      (.dimensions.test_coverage.score|tostring),
      (.dimensions.complexity.score|tostring),
      (.dimensions.lint.score|tostring),
      (.dimensions.docs.score|tostring),
      (.dimensions.churn.score|tostring),
      (.dimensions.defect_density.score|tostring)
    ] | @tsv' \
    | while IFS=$'\t' read -r mod score class cov cmp lint docs churn def; do
        printf " %-35s %5s %-8s %5s %5s %5s %5s %5s %5s\n" \
          "${mod:0:35}" "$score" "$class" "$cov" "$cmp" "$lint" "$docs" "$churn" "$def"
      done
    echo "========================================"
  fi

  if [ "$RED_COUNT" -gt 0 ]; then
    exit 1
  fi
  exit 0
}

main "$@"
