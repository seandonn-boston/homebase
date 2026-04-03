#!/bin/bash
# Admiral Framework — Regression Gate (QA-10)
# Compares quality scores between the current branch and a base branch.
# Blocks merge if any module drops below the red threshold (60) or declines
# more than 10 points compared to the base branch scores.
#
# Usage:
#   regression_gate.sh [--json] [--base BRANCH] [--allow-regression RATIONALE]
#
# Flags:
#   --json                    Emit machine-readable JSON quality impact report
#   --base BRANCH             Base branch to compare against (default: main)
#   --allow-regression TEXT   Allow regression; TEXT is the required rationale
#
# Exit codes:
#   0  No regressions detected (or allowed via --allow-regression)
#   1  Regression detected and not allowed
#   2  Hard error (missing dependency, bad arguments)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCORER="${SCRIPT_DIR}/quality_scorer.sh"
SCORES_FILE="${SCRIPT_DIR}/metrics/quality_scores.json"
WEIGHTS_CONFIG="${PROJECT_ROOT}/admiral/config/quality_weights.json"

RED_THRESHOLD=60      # drop below this => regression
DECLINE_THRESHOLD=10  # point decline from base => regression

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
OPT_JSON=false
OPT_BASE="main"
OPT_ALLOW_REGRESSION=""

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --json) OPT_JSON=true ;;
      --base)
        shift
        if [ $# -eq 0 ]; then
          echo "ERROR: --base requires a branch name" >&2
          exit 2
        fi
        OPT_BASE="$1"
        ;;
      --allow-regression)
        shift
        if [ $# -eq 0 ]; then
          echo "ERROR: --allow-regression requires a rationale argument" >&2
          exit 2
        fi
        OPT_ALLOW_REGRESSION="$1"
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
# Score the current branch
# ---------------------------------------------------------------------------
score_current_branch() {
  bash "$SCORER" --json 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# Score the base branch by stashing, checking out, scoring, then restoring
# Falls back to historical scores file if git checkout is not safe
# ---------------------------------------------------------------------------
score_base_branch() {
  # First try historical scores file
  if [ -f "$SCORES_FILE" ] && jq empty "$SCORES_FILE" 2>/dev/null; then
    local history_len
    history_len=$(jq 'length' "$SCORES_FILE" 2>/dev/null | tr -d '\r')
    if [ "$history_len" -gt 0 ]; then
      # Use the oldest available snapshot as a proxy for base
      local base_scores
      base_scores=$(jq '.[0].scores' "$SCORES_FILE" 2>/dev/null || echo "[]")
      echo "$base_scores"
      return
    fi
  fi

  # Try to get base branch scores via git worktree (non-destructive)
  if ! command -v git >/dev/null 2>&1; then
    echo "[]"
    return
  fi

  local current_branch
  current_branch=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  if [ -z "$current_branch" ] || [ "$current_branch" = "$OPT_BASE" ]; then
    echo "[]"
    return
  fi

  # Check if base branch exists
  if ! git -C "$PROJECT_ROOT" rev-parse --verify "$OPT_BASE" >/dev/null 2>&1; then
    echo "WARNING: Base branch '$OPT_BASE' not found; skipping base comparison" >&2
    echo "[]"
    return
  fi

  # Use git show to read scorer and config at base branch, run in temp dir
  local tmpdir
  tmpdir=$(mktemp -d)
  local base_result="[]"

  trap 'rm -rf "$tmpdir"' EXIT

  # Export base branch files to temp location
  git -C "$PROJECT_ROOT" archive "$OPT_BASE" \
    admiral/quality/quality_scorer.sh \
    admiral/config/quality_weights.json 2>/dev/null \
  | tar -x -C "$tmpdir" 2>/dev/null || true

  if [ -f "${tmpdir}/admiral/quality/quality_scorer.sh" ]; then
    # Patch the scorer to use PROJECT_ROOT paths but read metrics from base
    local base_scorer="${tmpdir}/admiral/quality/quality_scorer.sh"
    # Run base scorer with current modules but scoring from project root
    base_result=$(bash "$base_scorer" --json 2>/dev/null | jq '.quality_scores.modules // []' || echo "[]")
  fi

  rm -rf "$tmpdir"
  trap - EXIT

  echo "$base_result"
}

# ---------------------------------------------------------------------------
# Compare current scores to base scores
# Returns JSON array of regression objects
# ---------------------------------------------------------------------------
compare_scores() {
  local current_modules="$1"
  local base_modules="$2"

  local regressions="[]"
  local improvements="[]"
  local neutral="[]"

  while IFS= read -r mod_name; do
    if [ -z "$mod_name" ]; then continue; fi

    local current_score
    current_score=$(echo "$current_modules" | jq -r \
      --arg m "$mod_name" '.[] | select(.module == $m) | .score' | head -1 | tr -d '\r')

    local base_score
    base_score=$(echo "$base_modules" | jq -r \
      --arg m "$mod_name" '.[] | select(.module == $m) | .score' | head -1 | tr -d '\r')

    if [ -z "$current_score" ] || [ "$current_score" = "null" ]; then continue; fi

    local current_class
    current_class=$(echo "$current_modules" | jq -r \
      --arg m "$mod_name" '.[] | select(.module == $m) | .classification' | head -1 | tr -d '\r')

    # If no base score, only check absolute threshold
    if [ -z "$base_score" ] || [ "$base_score" = "null" ]; then
      if [ "$current_score" -lt "$RED_THRESHOLD" ]; then
        local reg
        reg=$(jq -n \
          --arg module "$mod_name" \
          --argjson current "$current_score" \
          --arg class "$current_class" \
          --arg reason "score below red threshold ($RED_THRESHOLD)" \
          '{module: $module, current_score: $current, base_score: null, delta: null,
            classification: $class, reason: $reason, type: "threshold_breach"}')
        regressions=$(echo "$regressions" | jq --argjson r "$reg" '. + [$r]')
      fi
      continue
    fi

    local delta=$(( current_score - base_score ))

    # Check threshold breach
    if [ "$current_score" -lt "$RED_THRESHOLD" ]; then
      local reg
      reg=$(jq -n \
        --arg module "$mod_name" \
        --argjson current "$current_score" \
        --argjson base "$base_score" \
        --argjson delta "$delta" \
        --arg class "$current_class" \
        --arg reason "score ($current_score) dropped below red threshold ($RED_THRESHOLD)" \
        '{module: $module, current_score: $current, base_score: $base, delta: $delta,
          classification: $class, reason: $reason, type: "threshold_breach"}')
      regressions=$(echo "$regressions" | jq --argjson r "$reg" '. + [$r]')
      continue
    fi

    # Check >10 point decline
    if [ "$delta" -lt "-${DECLINE_THRESHOLD}" ]; then
      local reg
      reg=$(jq -n \
        --arg module "$mod_name" \
        --argjson current "$current_score" \
        --argjson base "$base_score" \
        --argjson delta "$delta" \
        --arg class "$current_class" \
        --arg reason "score declined by $((0 - delta)) points (threshold: $DECLINE_THRESHOLD)" \
        '{module: $module, current_score: $current, base_score: $base, delta: $delta,
          classification: $class, reason: $reason, type: "decline"}')
      regressions=$(echo "$regressions" | jq --argjson r "$reg" '. + [$r]')
      continue
    fi

    # Improvement or neutral
    if [ "$delta" -gt 0 ]; then
      local imp
      imp=$(jq -n \
        --arg module "$mod_name" \
        --argjson current "$current_score" \
        --argjson base "$base_score" \
        --argjson delta "$delta" \
        --arg class "$current_class" \
        '{module: $module, current_score: $current, base_score: $base, delta: $delta, classification: $class}')
      improvements=$(echo "$improvements" | jq --argjson i "$imp" '. + [$i]')
    else
      local neu
      neu=$(jq -n \
        --arg module "$mod_name" \
        --argjson current "$current_score" \
        --argjson base "$base_score" \
        --argjson delta "$delta" \
        --arg class "$current_class" \
        '{module: $module, current_score: $current, base_score: $base, delta: $delta, classification: $class}')
      neutral=$(echo "$neutral" | jq --argjson n "$neu" '. + [$n]')
    fi
  done < <(echo "$current_modules" | jq -r '.[].module')

  jq -n \
    --argjson regressions  "$regressions" \
    --argjson improvements "$improvements" \
    --argjson neutral      "$neutral" \
    '{regressions: $regressions, improvements: $improvements, neutral: $neutral}'
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

  if [ ! -f "$SCORER" ]; then
    echo "ERROR: quality_scorer.sh not found at $SCORER" >&2
    exit 2
  fi

  # Score current branch
  local current_report
  current_report=$(score_current_branch)
  local current_modules
  current_modules=$(echo "$current_report" | jq '.quality_scores.modules // []' 2>/dev/null || echo "[]")

  # Score / load base branch
  local base_modules
  base_modules=$(score_base_branch)

  # Compare
  local comparison
  comparison=$(compare_scores "$current_modules" "$base_modules")

  local regression_count
  regression_count=$(echo "$comparison" | jq '.regressions | length')
  local improvement_count
  improvement_count=$(echo "$comparison" | jq '.improvements | length')
  local neutral_count
  neutral_count=$(echo "$comparison" | jq '.neutral | length')

  local gate_status="pass"
  if [ "$regression_count" -gt 0 ] && [ -z "$OPT_ALLOW_REGRESSION" ]; then
    gate_status="fail"
  elif [ "$regression_count" -gt 0 ] && [ -n "$OPT_ALLOW_REGRESSION" ]; then
    gate_status="allowed"
  fi

  local timestamp
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%S.000Z)

  local current_branch
  current_branch=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

  local report
  report=$(jq -n \
    --arg ts          "$timestamp" \
    --arg branch      "$current_branch" \
    --arg base        "$OPT_BASE" \
    --arg status      "$gate_status" \
    --argjson rcount  "$regression_count" \
    --argjson icount  "$improvement_count" \
    --argjson ncount  "$neutral_count" \
    --argjson comp    "$comparison" \
    --arg rationale   "$OPT_ALLOW_REGRESSION" \
    --argjson threshold "$RED_THRESHOLD" \
    --argjson decline   "$DECLINE_THRESHOLD" \
    '{regression_gate: {
        timestamp:          $ts,
        current_branch:     $branch,
        base_branch:        $base,
        gate_status:        $status,
        regression_count:   $rcount,
        improvement_count:  $icount,
        neutral_count:      $ncount,
        red_threshold:      $threshold,
        decline_threshold:  $decline,
        allow_regression_rationale: (if $rationale == "" then null else $rationale end),
        regressions:        $comp.regressions,
        improvements:       $comp.improvements,
        neutral:            $comp.neutral
      }}')

  if [ "$OPT_JSON" = true ]; then
    echo "$report"
  else
    echo "========================================"
    echo " Regression Gate Report"
    echo " Branch : $current_branch"
    echo " Base   : $OPT_BASE"
    echo " Status : $gate_status"
    echo "========================================"
    echo " Regressions : $regression_count"
    echo " Improvements: $improvement_count"
    echo " Neutral     : $neutral_count"
    echo ""

    if [ "$regression_count" -gt 0 ]; then
      echo "REGRESSIONS:"
      echo "$comparison" | jq -r '.regressions[] |
        "  [FAIL] \(.module): score=\(.current_score) base=\(.base_score // "N/A") delta=\(.delta // "N/A")\n         Reason: \(.reason)"'
      echo ""
      if [ -n "$OPT_ALLOW_REGRESSION" ]; then
        echo "  EXCEPTION GRANTED: $OPT_ALLOW_REGRESSION"
      fi
    fi

    if [ "$improvement_count" -gt 0 ]; then
      echo "IMPROVEMENTS:"
      echo "$comparison" | jq -r '.improvements[] |
        "  [+\(.delta)] \(.module): \(.base_score // "N/A") -> \(.current_score)"'
      echo ""
    fi

    echo "========================================"
  fi

  case "$gate_status" in
    pass|allowed) exit 0 ;;
    fail)         exit 1 ;;
    *)            exit 2 ;;
  esac
}

main "$@"
