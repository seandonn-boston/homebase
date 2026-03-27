#!/bin/bash
# Admiral Framework — Code Review Automation (QA-01)
# Automated code review system that checks naming conventions, complexity,
# test presence, import hygiene, documentation, and file size limits.
#
# Usage:
#   code_review.sh [--changed] [--json] [file ...]
#
# Flags:
#   --changed   Only review files modified in git (unstaged + staged)
#   --json      Emit machine-readable JSON report on stdout
#   [file ...]  Explicit list of files to review (overrides --changed and all-files)
#
# Exit codes:
#   0  All checks passed
#   1  One or more issues found
#   2  Hard error (missing dependency, bad config)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

CONFIG_FILE="${PROJECT_ROOT}/admiral/config/review_rules.json"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
OPT_CHANGED=false
OPT_JSON=false
EXPLICIT_FILES=()

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --changed) OPT_CHANGED=true ;;
      --json)    OPT_JSON=true ;;
      --*)       echo "Unknown flag: $1" >&2 ; exit 2 ;;
      *)         EXPLICIT_FILES+=("$1") ;;
    esac
    shift
  done
}

# ---------------------------------------------------------------------------
# Load configuration
# ---------------------------------------------------------------------------
load_config() {
  if [ ! -f "$CONFIG_FILE" ]; then
    echo "ERROR: config file not found: $CONFIG_FILE" >&2
    exit 2
  fi
  if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
    echo "ERROR: config file is not valid JSON: $CONFIG_FILE" >&2
    exit 2
  fi
}

read_config_int() {
  local key="$1"
  jq -r "$key" "$CONFIG_FILE" | tr -d '\r'
}

read_config_str() {
  local key="$1"
  jq -r "$key" "$CONFIG_FILE" | tr -d '\r'
}

# ---------------------------------------------------------------------------
# Collect files to review
# ---------------------------------------------------------------------------
collect_files() {
  if [ "${#EXPLICIT_FILES[@]}" -gt 0 ]; then
    # Return explicit list — already populated in EXPLICIT_FILES
    return
  fi

  if [ "$OPT_CHANGED" = true ]; then
    # Files modified in working tree (staged + unstaged, existing only)
    local git_files
    git_files=$(git -C "$PROJECT_ROOT" diff --name-only HEAD 2>/dev/null || true)
    local staged_files
    staged_files=$(git -C "$PROJECT_ROOT" diff --name-only --cached 2>/dev/null || true)
    local untracked
    untracked=$(git -C "$PROJECT_ROOT" ls-files --others --exclude-standard 2>/dev/null || true)

    local all_changed
    all_changed=$(printf '%s\n%s\n%s\n' "$git_files" "$staged_files" "$untracked" \
      | sort -u | grep -v '^$' || true)

    while IFS= read -r f; do
      local abs_path="${PROJECT_ROOT}/${f}"
      if [ -f "$abs_path" ]; then
        EXPLICIT_FILES+=("$abs_path")
      fi
    done <<< "$all_changed"
    return
  fi

  # Default: all .sh and .ts files under project root (excluding node_modules, .git)
  while IFS= read -r f; do
    EXPLICIT_FILES+=("$f")
  done < <(find "$PROJECT_ROOT" \
    \( -name "node_modules" -o -name ".git" -o -name "dist" \) -prune \
    -o \( -name "*.sh" -o -name "*.ts" \) -print 2>/dev/null | sort)
}

# ---------------------------------------------------------------------------
# Issue accumulator
# ---------------------------------------------------------------------------
ISSUES_JSON="[]"

add_issue() {
  local issue="$1"
  local severity="$2"
  local location="$3"
  local expected="$4"
  local actual="$5"
  local confidence="$6"

  local entry
  entry=$(jq -n \
    --arg issue     "$issue" \
    --arg severity  "$severity" \
    --arg location  "$location" \
    --arg expected  "$expected" \
    --arg actual    "$actual" \
    --argjson conf  "$confidence" \
    '{issue: $issue, severity: $severity, location: $location,
      expected: $expected, actual: $actual, confidence: $conf}')

  ISSUES_JSON=$(echo "$ISSUES_JSON" | jq --argjson e "$entry" '. + [$e]')
}

# ---------------------------------------------------------------------------
# Check 1: Naming convention compliance
# ---------------------------------------------------------------------------
check_naming_conventions() {
  local filepath="$1"
  local basename
  basename=$(basename "$filepath")

  local bash_pattern
  bash_pattern=$(read_config_str '.naming.bash')
  local ts_pattern
  ts_pattern=$(read_config_str '.naming.typescript')
  local severity
  severity=$(read_config_str '.severity_map.naming')

  case "$basename" in
    *.sh)
      if ! echo "$basename" | grep -qE "$bash_pattern"; then
        add_issue \
          "Bash file name does not follow snake_case convention" \
          "$severity" \
          "$filepath:1" \
          "snake_case name matching pattern: $bash_pattern" \
          "found: $basename" \
          "0.95"
      fi
      ;;
    *.ts)
      if ! echo "$basename" | grep -qE "$ts_pattern"; then
        add_issue \
          "TypeScript file name does not follow kebab-case/camelCase convention" \
          "$severity" \
          "$filepath:1" \
          "kebab-case or camelCase name matching pattern: $ts_pattern" \
          "found: $basename" \
          "0.9"
      fi
      ;;
  esac
}

# ---------------------------------------------------------------------------
# Check 2: Cyclomatic complexity
# ---------------------------------------------------------------------------
count_bash_complexity() {
  local filepath="$1"
  # Count decision points: if, elif, while, for, case branches, &&, ||
  local count
  count=$(grep -cE '^\s*(if |elif |while |for |case )|\|\||&&' "$filepath" 2>/dev/null || echo "0")
  echo "$count"
}

count_ts_complexity() {
  local filepath="$1"
  # Count conditional paths: if, else if, ternary ?:, &&, ||, switch case, catch
  local count
  count=$(grep -cE '^\s*(if\s*\(|else\s+if\s*\(|case\s+|catch\s*\()|\?\s*[^:]|\|\||&&' \
    "$filepath" 2>/dev/null || echo "0")
  echo "$count"
}

check_cyclomatic_complexity() {
  local filepath="$1"
  local basename
  basename=$(basename "$filepath")

  local threshold
  threshold=$(read_config_int '.complexity_threshold')
  local severity
  severity=$(read_config_str '.severity_map.complexity')

  local complexity=0

  case "$basename" in
    *.sh)
      complexity=$(count_bash_complexity "$filepath")
      ;;
    *.ts)
      complexity=$(count_ts_complexity "$filepath")
      ;;
    *)
      return
      ;;
  esac

  if [ "$complexity" -gt "$threshold" ]; then
    add_issue \
      "File exceeds cyclomatic complexity threshold (consider splitting into smaller functions)" \
      "$severity" \
      "$filepath:1" \
      "complexity <= $threshold decision points" \
      "found $complexity decision points" \
      "0.8"
  fi
}

# ---------------------------------------------------------------------------
# Check 3: Test presence
# ---------------------------------------------------------------------------
find_test_file() {
  local filepath="$1"
  local basename
  basename=$(basename "$filepath")
  local dirpath
  dirpath=$(dirname "$filepath")

  # Derive candidate test names
  local stem="${basename%.*}"
  local ext="${basename##*.}"

  # Search patterns (most specific first)
  local candidates=()

  # Same directory: test_<name>.<ext>
  candidates+=("${dirpath}/test_${stem}.${ext}")
  # tests/ sibling directory
  candidates+=("${dirpath}/tests/test_${stem}.${ext}")
  # Project-level tests directory, preserving relative path
  local rel_path="${filepath#${PROJECT_ROOT}/}"
  local rel_dir
  rel_dir=$(dirname "$rel_path")
  candidates+=("${PROJECT_ROOT}/admiral/tests/test_${stem}.${ext}")
  candidates+=("${PROJECT_ROOT}/admiral/tests/${rel_dir}/test_${stem}.${ext}")

  # TypeScript: look for .test.ts and .spec.ts
  if [ "$ext" = "ts" ]; then
    candidates+=("${dirpath}/${stem}.test.ts")
    candidates+=("${dirpath}/${stem}.spec.ts")
    candidates+=("${dirpath}/__tests__/${stem}.test.ts")
  fi

  for c in "${candidates[@]}"; do
    if [ -f "$c" ]; then
      echo "$c"
      return 0
    fi
  done
  return 1
}

check_test_presence() {
  local filepath="$1"
  local basename
  basename=$(basename "$filepath")

  # Skip test files themselves
  case "$basename" in
    test_*|*.test.*|*.spec.*)
      return
      ;;
  esac

  # Skip generated/config/migration files
  case "$filepath" in
    */migrations/*|*/dist/*|*/node_modules/*)
      return
      ;;
  esac

  local severity
  severity=$(read_config_str '.severity_map.test_missing')

  if ! find_test_file "$filepath" >/dev/null 2>&1; then
    add_issue \
      "No corresponding test file found for source file" \
      "$severity" \
      "$filepath:1" \
      "test file at tests/test_$(basename "$filepath") or similar" \
      "no test file found" \
      "0.85"
  fi
}

# ---------------------------------------------------------------------------
# Check 4: Import hygiene (TypeScript only)
# ---------------------------------------------------------------------------
check_import_hygiene() {
  local filepath="$1"
  local basename
  basename=$(basename "$filepath")

  case "$basename" in
    *.ts) ;;
    *) return ;;
  esac

  local severity
  severity=$(read_config_str '.severity_map.import_hygiene')

  # Load banned imports from config
  local banned_count
  banned_count=$(jq '.banned_imports | length' "$CONFIG_FILE" | tr -d '\r')

  if [ "$banned_count" -gt 0 ]; then
    local i=0
    while [ "$i" -lt "$banned_count" ]; do
      local banned_import
      banned_import=$(jq -r ".banned_imports[$i]" "$CONFIG_FILE" | tr -d '\r')
      if grep -qE "from ['\"]${banned_import}" "$filepath" 2>/dev/null; then
        add_issue \
          "Banned import detected: ${banned_import}" \
          "$severity" \
          "$filepath:1" \
          "no import from banned module: ${banned_import}" \
          "import from ${banned_import} found" \
          "0.98"
      fi
      i=$((i + 1))
    done
  fi

  # Check for self-referential circular import patterns (same-package deep nesting)
  local file_dir
  file_dir=$(dirname "$filepath")
  local stem
  stem=$(basename "$filepath" .ts)

  # Flag any relative import that goes up and back into the same file's parent
  # Pattern: import from '../<same-dir>/<same-stem>' would be circular
  if grep -qE "from ['\"]\.\./${stem}['\"]" "$filepath" 2>/dev/null; then
    add_issue \
      "Potential circular import: file imports from parent path matching its own name" \
      "$severity" \
      "$filepath:1" \
      "no circular import references" \
      "found circular-looking import pattern" \
      "0.7"
  fi

  # Check for barrel file anti-pattern: importing from index when you are index
  if [ "$stem" = "index" ]; then
    if grep -qE "from ['\"]\.\/index['\"]" "$filepath" 2>/dev/null; then
      add_issue \
        "Index file imports from itself (circular barrel)" \
        "$severity" \
        "$filepath:1" \
        "index file should not import from ./index" \
        "self-referential barrel import found" \
        "0.95"
    fi
  fi
}

# ---------------------------------------------------------------------------
# Check 5: Documentation presence (TypeScript exported functions)
# ---------------------------------------------------------------------------
check_documentation_presence() {
  local filepath="$1"
  local basename
  basename=$(basename "$filepath")

  case "$basename" in
    *.ts) ;;
    *) return ;;
  esac

  local severity
  severity=$(read_config_str '.severity_map.documentation')

  # Find exported function/class/const declarations
  # For each one, check if the preceding non-blank line is a JSDoc comment closer
  local line_num=0
  local prev_line=""
  local prev_prev_line=""
  local in_jsdoc=false

  while IFS= read -r line; do
    line_num=$((line_num + 1))

    # Track JSDoc block end
    if echo "$line" | grep -qE '^\s*\*/\s*$'; then
      in_jsdoc=true
    else
      # Check if we're on an export line
      if echo "$line" | grep -qE '^\s*export\s+(async\s+)?function\s+\w|^\s*export\s+(default\s+)?class\s+\w|^\s*export\s+const\s+\w+\s*[=:(]'; then
        local func_name
        func_name=$(echo "$line" | grep -oE '(function|class|const)\s+\w+' | head -1 | awk '{print $2}')
        if [ "$in_jsdoc" != "true" ]; then
          add_issue \
            "Exported symbol '${func_name:-unknown}' lacks JSDoc documentation comment" \
            "$severity" \
            "${filepath}:${line_num}" \
            "/** JSDoc comment */ above each exported function/class/const" \
            "no JSDoc found before export at line ${line_num}" \
            "0.85"
        fi
        in_jsdoc=false
      else
        # Reset jsdoc tracking unless the line is blank or a JSDoc continuation
        if ! echo "$line" | grep -qE '^\s*$|^\s*\*'; then
          in_jsdoc=false
        fi
      fi
    fi
  done < "$filepath"
}

# ---------------------------------------------------------------------------
# Check 6: File size limits
# ---------------------------------------------------------------------------
check_file_size() {
  local filepath="$1"

  local max_lines
  max_lines=$(read_config_int '.max_file_lines')
  local severity
  severity=$(read_config_str '.severity_map.file_size')

  local line_count
  line_count=$(wc -l < "$filepath" | tr -d ' \r')

  if [ "$line_count" -gt "$max_lines" ]; then
    local over=$((line_count - max_lines))
    add_issue \
      "File exceeds maximum line limit — consider splitting into smaller modules" \
      "$severity" \
      "$filepath:${max_lines}" \
      "file length <= ${max_lines} lines" \
      "${line_count} lines (${over} over limit)" \
      "1.0"
  fi
}

# ---------------------------------------------------------------------------
# Run all checks on a single file
# ---------------------------------------------------------------------------
review_file() {
  local filepath="$1"

  # Resolve to absolute path
  if [ "${filepath:0:1}" != "/" ]; then
    filepath="${PROJECT_ROOT}/${filepath}"
  fi

  if [ ! -f "$filepath" ]; then
    return
  fi

  check_naming_conventions    "$filepath"
  check_cyclomatic_complexity "$filepath"
  check_test_presence         "$filepath"
  check_import_hygiene        "$filepath"
  check_documentation_presence "$filepath"
  check_file_size             "$filepath"
}

# ---------------------------------------------------------------------------
# Build summary counts
# ---------------------------------------------------------------------------
build_summary() {
  local blocker major minor cosmetic
  blocker=$(echo "$ISSUES_JSON"  | jq '[.[] | select(.severity == "Blocker")]  | length' | tr -d '\r')
  major=$(echo "$ISSUES_JSON"    | jq '[.[] | select(.severity == "Major")]    | length' | tr -d '\r')
  minor=$(echo "$ISSUES_JSON"    | jq '[.[] | select(.severity == "Minor")]    | length' | tr -d '\r')
  cosmetic=$(echo "$ISSUES_JSON" | jq '[.[] | select(.severity == "Cosmetic")] | length' | tr -d '\r')

  jq -n \
    --argjson b "$blocker" \
    --argjson ma "$major" \
    --argjson mi "$minor" \
    --argjson c  "$cosmetic" \
    '{blocker: $b, major: $ma, minor: $mi, cosmetic: $c}'
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  parse_args "$@"
  load_config
  collect_files

  local files_checked=${#EXPLICIT_FILES[@]}

  for f in "${EXPLICIT_FILES[@]}"; do
    review_file "$f"
  done

  local timestamp
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%S.000Z)

  local summary
  summary=$(build_summary)

  local blocker_count
  blocker_count=$(echo "$summary" | jq '.blocker' | tr -d '\r')
  local major_count
  major_count=$(echo "$summary" | jq '.major' | tr -d '\r')

  local status="pass"
  if [ "$blocker_count" -gt 0 ] || [ "$major_count" -gt 0 ]; then
    status="fail"
  fi

  local report
  report=$(jq -n \
    --arg ts          "$timestamp" \
    --argjson fc      "$files_checked" \
    --argjson issues  "$ISSUES_JSON" \
    --argjson summary "$summary" \
    --arg status      "$status" \
    '{review: {
        timestamp:     $ts,
        files_checked: $fc,
        issues:        $issues,
        summary:       $summary,
        status:        $status
      }}')

  if [ "$OPT_JSON" = true ]; then
    echo "$report"
  else
    # Human-readable output
    local total_issues
    total_issues=$(echo "$ISSUES_JSON" | jq 'length' | tr -d '\r')

    echo "========================================"
    echo " Code Review Report"
    echo "========================================"
    echo " Files checked : $files_checked"
    echo " Total issues  : $total_issues"
    echo " Blockers      : $(echo "$summary" | jq '.blocker' | tr -d '\r')"
    echo " Major         : $(echo "$summary" | jq '.major' | tr -d '\r')"
    echo " Minor         : $(echo "$summary" | jq '.minor' | tr -d '\r')"
    echo " Cosmetic      : $(echo "$summary" | jq '.cosmetic' | tr -d '\r')"
    echo " Status        : $status"
    echo "========================================"

    if [ "$total_issues" -gt 0 ]; then
      echo ""
      echo "Issues:"
      echo "$ISSUES_JSON" | jq -r '.[] | "  [\(.severity)] \(.location)\n    \(.issue)\n    Expected: \(.expected)\n    Actual:   \(.actual)\n"'
    fi
  fi

  if [ "$status" = "fail" ]; then
    exit 1
  fi
  exit 0
}

main "$@"
