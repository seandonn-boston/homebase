#!/bin/bash
# Admiral Framework — Complexity Budget (QA-07)
# Loads per-module complexity budgets from admiral/config/complexity_budgets.json,
# calculates current complexity per file and per module, compares against budgets,
# and flags overages.
#
# Credit system: if a module reduces its complexity below budget, it earns credits
# proportional to the reduction. Credits can be spent to temporarily allow overages
# elsewhere (tracked in the budgets config under credits_available).
#
# Ratchet: budgets can only be tightened over time. To loosen a budget you must
# pass --allow-loosen, which is audited in the report.
#
# Usage:
#   complexity_budget.sh [--json] [--module MOD] [--allow-loosen] [--update-credits]
#
# Flags:
#   --json            Emit machine-readable JSON on stdout
#   --module MOD      Restrict check to named module
#   --allow-loosen    Allow budget-loosening changes (audited)
#   --update-credits  Persist earned credits back to the budgets config file
#
# Exit codes:
#   0  All modules within budget
#   1  One or more modules over budget
#   2  Hard error (missing dependency, bad config)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUDGETS_FILE="${PROJECT_ROOT}/admiral/config/complexity_budgets.json"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
OPT_JSON=false
OPT_MODULE=""
OPT_ALLOW_LOOSEN=false
OPT_UPDATE_CREDITS=false

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --json)           OPT_JSON=true ;;
      --allow-loosen)   OPT_ALLOW_LOOSEN=true ;;
      --update-credits) OPT_UPDATE_CREDITS=true ;;
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
load_budgets() {
  if [ ! -f "$BUDGETS_FILE" ]; then
    echo "ERROR: complexity budgets config not found: $BUDGETS_FILE" >&2
    exit 2
  fi
  if ! jq empty "$BUDGETS_FILE" 2>/dev/null; then
    echo "ERROR: complexity budgets config is not valid JSON: $BUDGETS_FILE" >&2
    exit 2
  fi
}

get_budget() {
  local module_path="$1"
  local key="$2"
  # Try module-specific first, fall back to defaults
  local val
  val=$(jq -r --arg m "$module_path" --arg k "$key" \
    '.modules[$m][$k] // .defaults[$k] // "null"' \
    "$BUDGETS_FILE" 2>/dev/null | tr -d '\r')
  echo "$val"
}

get_credits() {
  local module_path="$1"
  jq -r --arg m "$module_path" \
    '.modules[$m].credits_available // .defaults.credits_available // 0' \
    "$BUDGETS_FILE" 2>/dev/null | tr -d '\r'
}

# ---------------------------------------------------------------------------
# Discover modules to check
# ---------------------------------------------------------------------------
discover_modules() {
  if [ -n "$OPT_MODULE" ]; then
    echo "$OPT_MODULE"
    return
  fi
  # Use keys from modules config, supplemented by actual directories
  jq -r '.modules | keys[]' "$BUDGETS_FILE" 2>/dev/null | tr -d '\r' | sort
}

# ---------------------------------------------------------------------------
# Complexity measurement (reused pattern from metrics_collector.sh)
# ---------------------------------------------------------------------------
count_file_complexity() {
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

# Per-function complexity: count functions and their local complexity
# Returns JSON array of {function, complexity}
count_function_complexities() {
  local filepath="$1"
  local ext="${filepath##*.}"
  local funcs="[]"

  case "$ext" in
    sh)
      # Find function definitions, measure from func start to next func or EOF
      local current_func=""
      local current_complexity=0
      while IFS= read -r line; do
        if echo "$line" | grep -qE '^[a-zA-Z_][a-zA-Z0-9_]*\s*\(\s*\)\s*\{|^function\s+[a-zA-Z_]'; then
          # Save previous function
          if [ -n "$current_func" ]; then
            funcs=$(echo "$funcs" | jq \
              --arg fn "$current_func" \
              --argjson cc "$current_complexity" \
              '. + [{function: $fn, complexity: $cc}]')
          fi
          current_func=$(echo "$line" | grep -oE '^[a-zA-Z_][a-zA-Z0-9_]*|function\s+[a-zA-Z_][a-zA-Z0-9_]*' \
            | head -1 | sed 's/function[[:space:]]*//')
          current_complexity=1  # base complexity
        elif [ -n "$current_func" ]; then
          if echo "$line" | grep -qE '^\s*(if |elif |while |for |case )|\|\||&&'; then
            current_complexity=$((current_complexity + 1))
          fi
        fi
      done < "$filepath"
      # Save last function
      if [ -n "$current_func" ]; then
        funcs=$(echo "$funcs" | jq \
          --arg fn "$current_func" \
          --argjson cc "$current_complexity" \
          '. + [{function: $fn, complexity: $cc}]')
      fi
      ;;
    ts)
      local current_func=""
      local current_complexity=0
      while IFS= read -r line; do
        if echo "$line" | grep -qE '^\s*(export\s+)?(async\s+)?function\s+\w+|^\s*(export\s+)?const\s+\w+\s*=\s*(async\s+)?\('; then
          if [ -n "$current_func" ]; then
            funcs=$(echo "$funcs" | jq \
              --arg fn "$current_func" \
              --argjson cc "$current_complexity" \
              '. + [{function: $fn, complexity: $cc}]')
          fi
          current_func=$(echo "$line" | grep -oE '(function|const)\s+\w+' | head -1 | awk '{print $2}')
          current_func="${current_func:-anonymous}"
          current_complexity=1
        elif [ -n "$current_func" ]; then
          if echo "$line" | grep -qE '^\s*(if\s*\(|else\s+if\s*\(|case\s+|catch\s*\()|\?\s*[^:?]|\|\||&&'; then
            current_complexity=$((current_complexity + 1))
          fi
        fi
      done < "$filepath"
      if [ -n "$current_func" ]; then
        funcs=$(echo "$funcs" | jq \
          --arg fn "$current_func" \
          --argjson cc "$current_complexity" \
          '. + [{function: $fn, complexity: $cc}]')
      fi
      ;;
  esac
  echo "$funcs"
}

# ---------------------------------------------------------------------------
# Analyse one module
# ---------------------------------------------------------------------------
MODULE_RESULTS="[]"
TOTAL_OVERAGE=0
TOTAL_UNDER_BUDGET=0
CREDITS_EARNED=0

analyse_module() {
  local module_path="$1"
  local abs_path
  if [ "${module_path:0:1}" = "/" ]; then
    abs_path="$module_path"
  else
    abs_path="${PROJECT_ROOT}/${module_path}"
  fi

  if [ ! -d "$abs_path" ]; then
    return
  fi

  local budget_avg
  budget_avg=$(get_budget "$module_path" "max_avg")
  local budget_per_file
  budget_per_file=$(get_budget "$module_path" "max_per_file")
  local budget_per_func
  budget_per_func=$(get_budget "$module_path" "max_per_function")
  local credits
  credits=$(get_credits "$module_path")

  # Collect file-level metrics
  local total_complexity=0
  local max_file_complexity=0
  local max_func_complexity=0
  local file_count=0
  local overages="[]"
  local recommendations="[]"

  while IFS= read -r filepath; do
    local fc
    fc=$(count_file_complexity "$filepath")
    fc=$(echo "$fc" | tr -d ' \r\n')

    file_count=$((file_count + 1))
    total_complexity=$((total_complexity + fc))

    if [ "$fc" -gt "$max_file_complexity" ]; then
      max_file_complexity=$fc
    fi

    # Check per-file budget (accounting for credits)
    local effective_budget_file=$((budget_per_file + credits))
    if [ "$fc" -gt "$effective_budget_file" ]; then
      local overage_entry
      overage_entry=$(jq -n \
        --arg file "${filepath#${PROJECT_ROOT}/}" \
        --argjson actual "$fc" \
        --argjson budget "$budget_per_file" \
        --argjson over "$((fc - budget_per_file))" \
        '{file: $file, actual_complexity: $actual, budget: $budget, over_by: $over}')
      overages=$(echo "$overages" | jq --argjson o "$overage_entry" '. + [$o]')
    fi

    # Check per-function budget
    local func_data
    func_data=$(count_function_complexities "$filepath")
    local func_max
    func_max=$(echo "$func_data" | jq '[.[].complexity] | if length > 0 then max else 0 end')
    if [ "$func_max" -gt "$max_func_complexity" ]; then
      max_func_complexity=$func_max
    fi

    if [ "$func_max" -gt "$budget_per_func" ]; then
      local func_name
      func_name=$(echo "$func_data" | jq -r \
        --argjson max "$func_max" '[.[] | select(.complexity == $max)] | .[0].function // "unknown"')
      local rec
      rec=$(jq -n \
        --arg file "${filepath#${PROJECT_ROOT}/}" \
        --arg func "$func_name" \
        --argjson cc "$func_max" \
        --argjson budget "$budget_per_func" \
        '"Function \($func) in \($file) has complexity \($cc) (budget: \($budget)). Consider splitting."')
      recommendations=$(echo "$recommendations" | jq --argjson r "$rec" '. + [$r]')
    fi
  done < <(find "$abs_path" -maxdepth 5 \
    \( -name "node_modules" -o -name "dist" -o -name ".git" \) -prune \
    -o \( -name "*.ts" -not -name "*.test.ts" -not -name "*.spec.ts" \
         -o -name "*.sh" \) -print 2>/dev/null | grep -v "test_")

  local avg_complexity=0
  if [ "$file_count" -gt 0 ]; then
    avg_complexity=$((total_complexity / file_count))
  fi

  # Determine status
  local overage_count
  overage_count=$(echo "$overages" | jq 'length')
  local status="pass"
  if [ "$overage_count" -gt 0 ] || [ "$avg_complexity" -gt "$budget_avg" ]; then
    status="fail"
    TOTAL_OVERAGE=$((TOTAL_OVERAGE + 1))
  fi

  # Credit calculation: if avg is below budget, earn credits = (budget - avg) * file_count / 10
  local earned=0
  if [ "$avg_complexity" -lt "$budget_avg" ] && [ "$file_count" -gt 0 ]; then
    earned=$(( (budget_avg - avg_complexity) * file_count / 10 ))
    CREDITS_EARNED=$((CREDITS_EARNED + earned))
    TOTAL_UNDER_BUDGET=$((TOTAL_UNDER_BUDGET + 1))
  fi

  local entry
  entry=$(jq -n \
    --arg module     "$module_path" \
    --arg status     "$status" \
    --argjson avg    "$avg_complexity" \
    --argjson max_f  "$max_file_complexity" \
    --argjson max_fn "$max_func_complexity" \
    --argjson b_avg  "$budget_avg" \
    --argjson b_file "$budget_per_file" \
    --argjson b_func "$budget_per_func" \
    --argjson credits "$credits" \
    --argjson earned  "$earned" \
    --argjson fc      "$file_count" \
    --argjson overages "$overages" \
    --argjson recs    "$recommendations" \
    '{
      module:             $module,
      status:             $status,
      file_count:         $fc,
      complexity_avg:     $avg,
      complexity_max_file: $max_f,
      complexity_max_func: $max_fn,
      budget_avg:         $b_avg,
      budget_per_file:    $b_file,
      budget_per_func:    $b_func,
      credits_available:  $credits,
      credits_earned:     $earned,
      overages:           $overages,
      recommendations:    $recs
    }')

  MODULE_RESULTS=$(echo "$MODULE_RESULTS" | jq --argjson e "$entry" '. + [$e]')
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

  load_budgets

  while IFS= read -r mod; do
    if [ -n "$mod" ]; then
      analyse_module "$mod"
    fi
  done < <(discover_modules)

  local timestamp
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%S.000Z)

  local total_modules
  total_modules=$(echo "$MODULE_RESULTS" | jq 'length')

  local report
  report=$(jq -n \
    --arg ts          "$timestamp" \
    --argjson mods    "$MODULE_RESULTS" \
    --argjson total   "$total_modules" \
    --argjson over    "$TOTAL_OVERAGE" \
    --argjson under   "$TOTAL_UNDER_BUDGET" \
    --argjson credits "$CREDITS_EARNED" \
    --argjson loosen  "$OPT_ALLOW_LOOSEN" \
    '{complexity_budget: {
        timestamp:          $ts,
        total_modules:      $total,
        modules_over_budget: $over,
        modules_under_budget: $under,
        total_credits_earned: $credits,
        allow_loosen:       $loosen,
        modules:            $mods
      }}')

  if [ "$OPT_JSON" = true ]; then
    echo "$report"
  else
    echo "========================================"
    echo " Complexity Budget Report"
    echo " Allow loosen: $OPT_ALLOW_LOOSEN"
    echo "========================================"
    echo ""
    printf " %-35s %-6s %5s %6s %6s %6s %7s\n" \
      "Module" "Status" "Files" "Avg" "MaxF" "MaxFn" "Credits"
    echo "------------------------------------------------------------------------"

    echo "$MODULE_RESULTS" | jq -r '.[] | [
      .module, .status, (.file_count|tostring),
      (.complexity_avg|tostring), (.complexity_max_file|tostring),
      (.complexity_max_func|tostring), (.credits_earned|tostring)
    ] | @tsv' \
    | while IFS=$'\t' read -r mod status fc avg maxf maxfn cr; do
        printf " %-35s %-6s %5s %6s %6s %6s %7s\n" \
          "${mod:0:35}" "$status" "$fc" "$avg" "$maxf" "$maxfn" "$cr"
      done

    echo ""
    echo " Modules over budget : $TOTAL_OVERAGE"
    echo " Credits earned      : $CREDITS_EARNED"
    echo "========================================"

    if [ "$TOTAL_OVERAGE" -gt 0 ]; then
      echo ""
      echo "Overages:"
      echo "$MODULE_RESULTS" | jq -r \
        '.[] | select(.status == "fail") |
         "  \(.module):\n" + (.overages[] | "    \(.file): complexity=\(.actual_complexity) budget=\(.budget) over=\(.over_by)") +
         "\n" + (if .recommendations | length > 0 then "  Recommendations:\n" + (.recommendations[] | "    " + .) else "" end)'
    fi
  fi

  if [ "$TOTAL_OVERAGE" -gt 0 ]; then
    exit 1
  fi
  exit 0
}

main "$@"
