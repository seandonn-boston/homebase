#!/bin/bash
# Admiral Framework — Debt Tracker (QA-06)
# Scans the codebase for technical debt signals:
#   - TODO/FIXME/HACK comments (with estimated age via git blame)
#   - High-complexity modules (complexity_max above threshold)
#   - Skipped tests (.skip / xit / xdescribe)
#   - Outdated dependencies (package.json entries flagged as old)
#   - Code duplication indicators (repeated identical blocks)
#
# Assigns S/M/L effort estimates and produces a risk-prioritised backlog.
# debt_ratio = debt_items / total_modules
#
# Usage:
#   debt_tracker.sh [--json] [--module MOD] [--save]
#
# Flags:
#   --json         Emit machine-readable JSON on stdout
#   --module MOD   Restrict scan to named module path
#   --save         Write report to admiral/quality/metrics/debt-<timestamp>.json
#
# Exit codes:
#   0  No high-risk debt items
#   1  High-risk debt items found
#   2  Hard error (missing dependency, bad arguments)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
METRICS_DIR="${SCRIPT_DIR}/metrics"

COMPLEXITY_MAX_THRESHOLD=20   # above this = high complexity debt
DUPLICATION_MIN_LINES=8       # minimum identical lines to flag as duplication

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
OPT_JSON=false
OPT_MODULE=""
OPT_SAVE=false

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --json)    OPT_JSON=true ;;
      --save)    OPT_SAVE=true ;;
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
# Discover scan root(s)
# ---------------------------------------------------------------------------
discover_scan_roots() {
  if [ -n "$OPT_MODULE" ]; then
    if [ "${OPT_MODULE:0:1}" = "/" ]; then
      echo "$OPT_MODULE"
    else
      echo "${PROJECT_ROOT}/${OPT_MODULE}"
    fi
    return
  fi
  find "${PROJECT_ROOT}/admiral" -mindepth 1 -maxdepth 1 -type d 2>/dev/null \
    | grep -vE "node_modules|\.git|dist|__pycache__" \
    | sort
}

# ---------------------------------------------------------------------------
# Effort estimate based on scope
# Lines of context + type of item => S / M / L
# ---------------------------------------------------------------------------
estimate_effort() {
  local item_type="$1"
  local scope="$2"   # "file", "module", "project"

  case "$item_type" in
    todo_fixme)
      case "$scope" in
        file)    echo "S" ;;
        module)  echo "M" ;;
        *)       echo "L" ;;
      esac
      ;;
    hack)        echo "M" ;;
    complexity)
      case "$scope" in
        file)    echo "M" ;;
        *)       echo "L" ;;
      esac
      ;;
    skipped_test) echo "S" ;;
    outdated_dep) echo "M" ;;
    duplication)  echo "M" ;;
    *)            echo "S" ;;
  esac
}

# ---------------------------------------------------------------------------
# Blast radius: rough measure of how many other modules could be affected
# For now: file-level=1, module-level=3, project-level=5
# ---------------------------------------------------------------------------
blast_radius_score() {
  local scope="$1"
  case "$scope" in
    file)    echo "1" ;;
    module)  echo "3" ;;
    project) echo "5" ;;
    *)       echo "2" ;;
  esac
}

effort_numeric() {
  local effort="$1"
  case "$effort" in
    S) echo "1" ;;
    M) echo "2" ;;
    L) echo "3" ;;
    *) echo "1" ;;
  esac
}

# ---------------------------------------------------------------------------
# Get approximate age in days for a file via git log
# ---------------------------------------------------------------------------
file_age_days() {
  local filepath="$1"
  if ! command -v git >/dev/null 2>&1; then
    echo "0"
    return
  fi
  local age_ts
  age_ts=$(git -C "$PROJECT_ROOT" log -1 --format="%ct" -- "$filepath" 2>/dev/null || echo "")
  if [ -z "$age_ts" ]; then
    echo "0"
    return
  fi
  local now_ts
  now_ts=$(date +%s 2>/dev/null || echo "$age_ts")
  local diff=$(( (now_ts - age_ts) / 86400 ))
  if [ "$diff" -lt 0 ]; then diff=0; fi
  echo "$diff"
}

# ---------------------------------------------------------------------------
# Debt accumulator
# ---------------------------------------------------------------------------
DEBT_ITEMS="[]"
TOTAL_FILES=0

add_debt_item() {
  local type="$1"
  local location="$2"
  local description="$3"
  local effort="$4"
  local scope="$5"
  local age_days="$6"

  local blast
  blast=$(blast_radius_score "$scope")
  local effort_n
  effort_n=$(effort_numeric "$effort")
  local risk_score=$(( blast * effort_n ))

  local entry
  entry=$(jq -n \
    --arg type        "$type" \
    --arg location    "$location" \
    --arg description "$description" \
    --arg effort      "$effort" \
    --arg scope       "$scope" \
    --argjson age     "$age_days" \
    --argjson blast   "$blast" \
    --argjson risk    "$risk_score" \
    '{
      type:        $type,
      location:    $location,
      description: $description,
      effort:      $effort,
      scope:       $scope,
      age_days:    $age,
      blast_radius: $blast,
      risk_score:  $risk
    }')
  DEBT_ITEMS=$(echo "$DEBT_ITEMS" | jq --argjson e "$entry" '. + [$e]')
}

# ---------------------------------------------------------------------------
# Scan 1: TODO / FIXME / HACK comments
# ---------------------------------------------------------------------------
scan_todo_fixme() {
  local root="$1"
  while IFS= read -r filepath; do
    local age
    age=$(file_age_days "$filepath")
    local line_num=0
    while IFS= read -r line; do
      line_num=$((line_num + 1))
      local marker=""
      if echo "$line" | grep -qiE '\bTODO\b'; then
        marker="TODO"
      elif echo "$line" | grep -qiE '\bFIXME\b'; then
        marker="FIXME"
      elif echo "$line" | grep -qiE '\bHACK\b'; then
        marker="HACK"
      fi
      if [ -n "$marker" ]; then
        local desc
        desc=$(echo "$line" | sed 's/^[[:space:]]*//' | cut -c1-120)
        local item_type="todo_fixme"
        local effort_val="S"
        if [ "$marker" = "HACK" ]; then
          item_type="hack"
          effort_val="M"
        fi
        add_debt_item \
          "$item_type" \
          "${filepath#${PROJECT_ROOT}/}:${line_num}" \
          "$desc" \
          "$effort_val" \
          "file" \
          "$age"
      fi
    done < "$filepath"
  done < <(find "$root" -maxdepth 6 \
    \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
    -o \( -name "*.ts" -o -name "*.sh" \) -print 2>/dev/null)
}

# ---------------------------------------------------------------------------
# Scan 2: High-complexity files
# ---------------------------------------------------------------------------
count_file_complexity_local() {
  local filepath="$1"
  local ext="${filepath##*.}"
  case "$ext" in
    sh)
      grep -cE '^\s*(if |elif |while |for |case )|\|\||&&' "$filepath" 2>/dev/null || echo "0"
      ;;
    ts)
      grep -cE '^\s*(if\s*\(|else\s+if\s*\(|case\s+[^:]+:|catch\s*\()|\?\s*[^:?]|\|\||&&' \
        "$filepath" 2>/dev/null || echo "0"
      ;;
    *)
      echo "0"
      ;;
  esac
}

scan_complexity() {
  local root="$1"
  while IFS= read -r filepath; do
    local complexity
    complexity=$(count_file_complexity_local "$filepath")
    complexity=$(echo "$complexity" | tr -d ' \r\n')
    if [ "$complexity" -gt "$COMPLEXITY_MAX_THRESHOLD" ]; then
      local age
      age=$(file_age_days "$filepath")
      add_debt_item \
        "complexity" \
        "${filepath#${PROJECT_ROOT}/}" \
        "Cyclomatic complexity ${complexity} exceeds threshold ${COMPLEXITY_MAX_THRESHOLD}" \
        "$(estimate_effort complexity file)" \
        "file" \
        "$age"
    fi
  done < <(find "$root" -maxdepth 6 \
    \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
    -o \( -name "*.ts" -not -name "*.test.ts" -not -name "*.spec.ts" \
         -o -name "*.sh" \) -print 2>/dev/null | grep -v "test_")
}

# ---------------------------------------------------------------------------
# Scan 3: Skipped tests
# ---------------------------------------------------------------------------
scan_skipped_tests() {
  local root="$1"
  while IFS= read -r filepath; do
    local line_num=0
    while IFS= read -r line; do
      line_num=$((line_num + 1))
      if echo "$line" | grep -qE '\.skip\s*\(|xit\s*\(|xdescribe\s*\(|xtest\s*\('; then
        local age
        age=$(file_age_days "$filepath")
        local desc
        desc=$(echo "$line" | sed 's/^[[:space:]]*//' | cut -c1-120)
        add_debt_item \
          "skipped_test" \
          "${filepath#${PROJECT_ROOT}/}:${line_num}" \
          "Skipped test: $desc" \
          "$(estimate_effort skipped_test file)" \
          "file" \
          "$age"
      fi
    done < "$filepath"
  done < <(find "$root" -maxdepth 6 \
    \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
    -o \( -name "*.test.ts" -o -name "*.spec.ts" \) -print 2>/dev/null)
}

# ---------------------------------------------------------------------------
# Scan 4: Outdated dependencies (package.json)
# Reports any dependency pinned to a specific old version pattern
# ---------------------------------------------------------------------------
scan_outdated_deps() {
  local root="$1"
  while IFS= read -r pkg_file; do
    if ! jq empty "$pkg_file" 2>/dev/null; then continue; fi
    local age
    age=$(file_age_days "$pkg_file")

    # Flag deps using exact old version patterns: 0.x.x or very old majors
    local deps_count
    deps_count=$(jq '[.dependencies // {}, .devDependencies // {}
      | to_entries[]
      | select(.value | test("^[0-9]|^~[0-9]|^\\^[0-9]"))
      ] | length' "$pkg_file" 2>/dev/null | tr -d '\r' || echo "0")

    if [ "$deps_count" -gt 0 ]; then
      add_debt_item \
        "outdated_dep" \
        "${pkg_file#${PROJECT_ROOT}/}" \
        "package.json has ${deps_count} pinned dependency versions that may be outdated" \
        "$(estimate_effort outdated_dep module)" \
        "module" \
        "$age"
    fi
  done < <(find "$root" -maxdepth 3 -name "package.json" \
    -not -path "*/node_modules/*" 2>/dev/null)
}

# ---------------------------------------------------------------------------
# Scan 5: Code duplication indicators
# Uses a simple rolling hash approach: hash every N-line block, flag duplicates
# ---------------------------------------------------------------------------
scan_duplication() {
  local root="$1"
  local tmpfile
  tmpfile=$(mktemp)

  # Collect all source files into a list
  find "$root" -maxdepth 6 \
    \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
    -o \( -name "*.ts" -not -name "*.test.ts" -not -name "*.spec.ts" \
         -o -name "*.sh" \) -print 2>/dev/null | grep -v "test_" > "$tmpfile"

  # For each file, extract contiguous non-blank blocks of min lines and hash
  declare -A seen_hashes
  while IFS= read -r filepath; do
    local block_lines=0
    local block_content=""
    while IFS= read -r line; do
      # Skip blank lines as block separators
      if [ -z "$(echo "$line" | tr -d ' \t')" ]; then
        if [ "$block_lines" -ge "$DUPLICATION_MIN_LINES" ]; then
          local hash
          hash=$(echo "$block_content" | md5sum 2>/dev/null | cut -d' ' -f1 || \
                 echo "$block_content" | cksum | cut -d' ' -f1)
          if [ -n "${seen_hashes[$hash]+x}" ]; then
            local age
            age=$(file_age_days "$filepath")
            add_debt_item \
              "duplication" \
              "${filepath#${PROJECT_ROOT}/}" \
              "Duplicated code block detected (${block_lines} lines, also in ${seen_hashes[$hash]})" \
              "$(estimate_effort duplication module)" \
              "module" \
              "$age"
          else
            seen_hashes[$hash]="${filepath#${PROJECT_ROOT}/}"
          fi
        fi
        block_lines=0
        block_content=""
      else
        block_content="${block_content}${line}"
        block_lines=$((block_lines + 1))
      fi
    done < "$filepath"
  done < "$tmpfile"

  rm -f "$tmpfile"
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

  local scan_roots=()
  while IFS= read -r r; do
    if [ -n "$r" ]; then scan_roots+=("$r"); fi
  done < <(discover_scan_roots)

  local total_modules="${#scan_roots[@]}"

  for root in "${scan_roots[@]}"; do
    if [ ! -d "$root" ]; then continue; fi
    scan_todo_fixme   "$root"
    scan_complexity   "$root"
    scan_skipped_tests "$root"
    scan_outdated_deps "$root"
    scan_duplication  "$root"
  done

  # Sort by risk_score descending
  local sorted_items
  sorted_items=$(echo "$DEBT_ITEMS" | jq 'sort_by(-.risk_score)')

  local debt_count
  debt_count=$(echo "$sorted_items" | jq 'length')

  local debt_ratio="0.00"
  if [ "$total_modules" -gt 0 ]; then
    debt_ratio=$(awk "BEGIN { printf \"%.2f\", ${debt_count} / ${total_modules} }")
  fi

  local high_risk_count
  high_risk_count=$(echo "$sorted_items" | jq '[.[] | select(.risk_score >= 6)] | length')

  local timestamp
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%S.000Z)

  local report
  report=$(jq -n \
    --arg ts           "$timestamp" \
    --argjson items    "$sorted_items" \
    --argjson total    "$total_modules" \
    --argjson count    "$debt_count" \
    --arg ratio        "$debt_ratio" \
    --argjson high     "$high_risk_count" \
    '{debt_report: {
        timestamp:      $ts,
        total_modules:  $total,
        debt_items:     $count,
        debt_ratio:     ($ratio | tonumber),
        high_risk_count: $high,
        backlog:        $items
      }}')

  if [ "$OPT_SAVE" = true ]; then
    mkdir -p "$METRICS_DIR"
    local safe_ts
    safe_ts=$(echo "$timestamp" | tr ':' '-')
    local out_path="${METRICS_DIR}/debt-${safe_ts}.json"
    echo "$report" > "$out_path"
    if [ "$OPT_JSON" = false ]; then
      echo "Report saved: $out_path" >&2
    fi
  fi

  if [ "$OPT_JSON" = true ]; then
    echo "$report"
  else
    echo "========================================"
    echo " Technical Debt Report"
    echo " Modules scanned : $total_modules"
    echo " Debt items      : $debt_count"
    echo " Debt ratio      : $debt_ratio"
    echo " High-risk items : $high_risk_count"
    echo "========================================"
    if [ "$debt_count" -gt 0 ]; then
      echo ""
      echo "Priority Backlog (sorted by risk):"
      echo "$sorted_items" | jq -r '.[] |
        "  [Risk:\(.risk_score) Effort:\(.effort) Blast:\(.blast_radius)] \(.type | ascii_upcase)\n    \(.location)\n    \(.description)\n"'
    else
      echo "No debt items found."
    fi
    echo "========================================"
  fi

  if [ "$high_risk_count" -gt 0 ]; then
    exit 1
  fi
  exit 0
}

main "$@"
