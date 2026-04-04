#!/bin/bash
# Admiral Framework — Review Checklist Generator (QA-08)
# Accepts a file list (from git diff or explicit), classifies files by risk level,
# generates a markdown checklist appropriate to each risk level, and pre-fills
# auto-verifiable items.
#
# Usage:
#   review_checklist.sh [--json] [--changed] [--base BRANCH] [file ...]
#
# Flags:
#   --json           Emit machine-readable JSON (checklist as structured data)
#   --changed        Use files from git diff HEAD (staged + unstaged)
#   --base BRANCH    Diff against named base branch (default: main)
#   [file ...]       Explicit file list (overrides --changed)
#
# Exit codes:
#   0  Checklist generated successfully
#   1  High-risk files found (informational — checklist still emitted)
#   2  Hard error (missing dependency, bad config)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RISK_CONFIG="${PROJECT_ROOT}/admiral/config/risk_profiles.json"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
OPT_JSON=false
OPT_CHANGED=false
OPT_BASE="main"
EXPLICIT_FILES=()

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --json)    OPT_JSON=true ;;
      --changed) OPT_CHANGED=true ;;
      --base)
        shift
        if [ $# -eq 0 ]; then
          echo "ERROR: --base requires a branch name" >&2
          exit 2
        fi
        OPT_BASE="$1"
        ;;
      --*)
        echo "ERROR: Unknown flag: $1" >&2
        exit 2
        ;;
      *)
        EXPLICIT_FILES+=("$1")
        ;;
    esac
    shift
  done
}

# ---------------------------------------------------------------------------
# Load risk config
# ---------------------------------------------------------------------------
load_config() {
  if [ ! -f "$RISK_CONFIG" ]; then
    echo "ERROR: risk profiles config not found: $RISK_CONFIG" >&2
    exit 2
  fi
  if ! jq empty "$RISK_CONFIG" 2>/dev/null; then
    echo "ERROR: risk profiles config is not valid JSON: $RISK_CONFIG" >&2
    exit 2
  fi
}

# ---------------------------------------------------------------------------
# Collect files
# ---------------------------------------------------------------------------
collect_files() {
  if [ "${#EXPLICIT_FILES[@]}" -gt 0 ]; then
    return
  fi

  if [ "$OPT_CHANGED" = true ]; then
    local git_files
    git_files=$(git -C "$PROJECT_ROOT" diff --name-only HEAD 2>/dev/null || true)
    local staged_files
    staged_files=$(git -C "$PROJECT_ROOT" diff --name-only --cached 2>/dev/null || true)
    local all_changed
    all_changed=$(printf '%s\n%s\n' "$git_files" "$staged_files" \
      | sort -u | grep -v '^$' || true)

    while IFS= read -r f; do
      local abs="${PROJECT_ROOT}/${f}"
      if [ -f "$abs" ]; then
        EXPLICIT_FILES+=("$f")
      fi
    done <<< "$all_changed"
    return
  fi

  # Diff against base branch
  if command -v git >/dev/null 2>&1; then
    local diff_files
    diff_files=$(git -C "$PROJECT_ROOT" diff --name-only "${OPT_BASE}...HEAD" 2>/dev/null || true)
    if [ -n "$diff_files" ]; then
      while IFS= read -r f; do
        if [ -n "$f" ] && [ -f "${PROJECT_ROOT}/${f}" ]; then
          EXPLICIT_FILES+=("$f")
        fi
      done <<< "$diff_files"
      return
    fi
  fi

  # Fallback: changed vs HEAD
  while IFS= read -r f; do
    if [ -n "$f" ] && [ -f "${PROJECT_ROOT}/${f}" ]; then
      EXPLICIT_FILES+=("$f")
    fi
  done < <(git -C "$PROJECT_ROOT" status --short 2>/dev/null \
    | awk '{print $2}' | grep -v '^$' || true)
}

# ---------------------------------------------------------------------------
# Classify a file as high / medium / low risk
# ---------------------------------------------------------------------------
classify_file_risk() {
  local filepath="$1"

  # Check high-risk patterns
  local high_count
  high_count=$(jq -r '.path_patterns.high[]' "$RISK_CONFIG" 2>/dev/null | wc -l | tr -d ' ')
  local i=0
  while IFS= read -r pattern; do
    if [[ "$filepath" == *"$pattern"* ]]; then
      echo "high"
      return
    fi
  done < <(jq -r '.path_patterns.high[]' "$RISK_CONFIG" 2>/dev/null)

  # Check low-risk patterns
  while IFS= read -r pattern; do
    if [[ "$filepath" == *"$pattern"* ]]; then
      echo "low"
      return
    fi
  done < <(jq -r '.path_patterns.low[]' "$RISK_CONFIG" 2>/dev/null)

  # Default: medium
  echo "medium"
}

# ---------------------------------------------------------------------------
# Get checklist items for a risk level
# ---------------------------------------------------------------------------
get_checklist_items() {
  local risk_level="$1"
  jq -r --arg r "$risk_level" '.risk_levels[$r].checklist_items[]' "$RISK_CONFIG" 2>/dev/null
}

get_min_reviewers() {
  local risk_level="$1"
  jq -r --arg r "$risk_level" '.risk_levels[$r].min_reviewers' "$RISK_CONFIG" 2>/dev/null | tr -d '\r'
}

# ---------------------------------------------------------------------------
# Check auto-verifiable items
# ---------------------------------------------------------------------------
check_lint_pass() {
  local filepath="$1"
  local ext="${filepath##*.}"
  case "$ext" in
    sh)
      if command -v shellcheck >/dev/null 2>&1; then
        local abs_path="${PROJECT_ROOT}/${filepath}"
        if [ -f "$abs_path" ]; then
          shellcheck "$abs_path" >/dev/null 2>&1 && echo "true" || echo "false"
          return
        fi
      fi
      ;;
    ts)
      if command -v npx >/dev/null 2>&1; then
        local abs_path="${PROJECT_ROOT}/${filepath}"
        if [ -f "$abs_path" ]; then
          cd "$PROJECT_ROOT"
          npx biome check "$abs_path" >/dev/null 2>&1 && echo "true" || echo "false"
          return
        fi
      fi
      ;;
  esac
  echo "unknown"
}

# ---------------------------------------------------------------------------
# Build the checklist
# ---------------------------------------------------------------------------
build_checklist() {
  local files_json="$1"

  local overall_risk="low"
  local has_high=false
  local has_medium=false

  # Determine overall risk
  while IFS= read -r filepath; do
    if [ -z "$filepath" ]; then continue; fi
    local risk
    risk=$(classify_file_risk "$filepath")
    case "$risk" in
      high)   has_high=true ;;
      medium) has_medium=true ;;
    esac
  done < <(echo "$files_json" | jq -r '.[]')

  if [ "$has_high" = true ]; then
    overall_risk="high"
  elif [ "$has_medium" = true ]; then
    overall_risk="medium"
  fi

  local min_reviewers
  min_reviewers=$(get_min_reviewers "$overall_risk")

  # Build file classifications
  local file_classifications="[]"
  local lint_results="[]"
  while IFS= read -r filepath; do
    if [ -z "$filepath" ]; then continue; fi
    local risk
    risk=$(classify_file_risk "$filepath")
    local lint_result
    lint_result=$(check_lint_pass "$filepath")
    local fc_entry
    fc_entry=$(jq -n \
      --arg file "$filepath" \
      --arg risk "$risk" \
      --arg lint "$lint_result" \
      '{file: $file, risk: $risk, lint_pass: $lint}')
    file_classifications=$(echo "$file_classifications" | jq --argjson e "$fc_entry" '. + [$e]')
    lint_results=$(echo "$lint_results" | jq --argjson l '"'$lint_result'"' '. + [$l]')
  done < <(echo "$files_json" | jq -r '.[]')

  # Determine if lint is all passing
  local all_lint_pass=false
  local unknown_lint=false
  local fail_lint=false
  while IFS= read -r r; do
    case "$r" in
      false)   fail_lint=true ;;
      unknown) unknown_lint=true ;;
    esac
  done < <(echo "$lint_results" | jq -r '.[]')
  if [ "$fail_lint" = false ] && [ "$unknown_lint" = false ]; then
    all_lint_pass=true
  fi

  local lint_checked="[ ] Lint passes (run shellcheck / biome check)"
  if [ "$all_lint_pass" = true ]; then
    lint_checked="[x] Lint passes (auto-verified)"
  elif [ "$fail_lint" = true ]; then
    lint_checked="[!] Lint FAILS — fix before merge"
  fi

  # Build checklist items JSON
  local checklist_items="[]"
  while IFS= read -r item; do
    if [ -z "$item" ]; then continue; fi
    local ci
    ci=$(jq -n --arg text "$item" --argjson auto false '{text: $text, auto_verified: $auto, checked: false}')
    checklist_items=$(echo "$checklist_items" | jq --argjson c "$ci" '. + [$c]')
  done < <(get_checklist_items "$overall_risk")

  # Add auto-verifiable items as pre-filled
  local lint_ci
  lint_ci=$(jq -n \
    --arg text "$lint_checked" \
    --argjson auto "$all_lint_pass" \
    --argjson checked "$all_lint_pass" \
    '{text: $text, auto_verified: $auto, checked: $checked}')
  checklist_items=$(echo "$checklist_items" | jq --argjson c "$lint_ci" '. + [$c]')

  local test_ci
  test_ci=$(jq -n \
    '{text: "[ ] Tests pass (run test suite before merge)", auto_verified: false, checked: false}')
  checklist_items=$(echo "$checklist_items" | jq --argjson c "$test_ci" '. + [$c]')

  jq -n \
    --arg risk    "$overall_risk" \
    --argjson min "$min_reviewers" \
    --argjson files "$file_classifications" \
    --argjson items "$checklist_items" \
    '{
      overall_risk:   $risk,
      min_reviewers:  $min,
      file_count:     ($files | length),
      files:          $files,
      checklist_items: $items
    }'
}

# ---------------------------------------------------------------------------
# Render checklist as markdown
# ---------------------------------------------------------------------------
render_markdown() {
  local checklist_json="$1"
  local risk
  risk=$(echo "$checklist_json" | jq -r '.overall_risk')
  local min_reviewers
  min_reviewers=$(echo "$checklist_json" | jq -r '.min_reviewers')
  local file_count
  file_count=$(echo "$checklist_json" | jq -r '.file_count')

  local risk_label
  case "$risk" in
    high)   risk_label="HIGH RISK" ;;
    medium) risk_label="MEDIUM RISK" ;;
    low)    risk_label="LOW RISK" ;;
    *)      risk_label="UNKNOWN" ;;
  esac

  echo "## PR Review Checklist"
  echo ""
  echo "**Risk Level:** ${risk_label}  "
  echo "**Files Changed:** ${file_count}  "
  echo "**Minimum Reviewers:** ${min_reviewers}  "
  echo ""
  echo "### Files"
  echo "$checklist_json" | jq -r '.files[] | "- `\(.file)` — \(.risk) risk"'
  echo ""
  echo "### Checklist"
  echo "$checklist_json" | jq -r '.checklist_items[] |
    if .checked then "- [x] \(.text)"
    elif (.text | startswith("[!]")) then "- \(.text)"
    else "- [ ] \(.text)" end'
  echo ""
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
  collect_files

  if [ "${#EXPLICIT_FILES[@]}" -eq 0 ]; then
    echo "WARNING: No files to generate checklist for." >&2
    if [ "$OPT_JSON" = true ]; then
      jq -n '{checklist: {overall_risk: "low", min_reviewers: 1, file_count: 0, files: [], checklist_items: []}}'
    fi
    exit 0
  fi

  local files_json
  files_json=$(printf '%s\n' "${EXPLICIT_FILES[@]}" | jq -R . | jq -s .)

  local checklist
  checklist=$(build_checklist "$files_json")

  local timestamp
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%S.000Z)

  local overall_risk
  overall_risk=$(echo "$checklist" | jq -r '.overall_risk')

  local report
  report=$(jq -n \
    --arg ts "$timestamp" \
    --argjson c "$checklist" \
    '{checklist: ($c + {timestamp: $ts})}')

  if [ "$OPT_JSON" = true ]; then
    echo "$report"
  else
    render_markdown "$checklist"
  fi

  if [ "$overall_risk" = "high" ]; then
    exit 1
  fi
  exit 0
}

main "$@"
