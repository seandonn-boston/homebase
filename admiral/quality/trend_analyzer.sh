#!/bin/bash
# Admiral Framework — Trend Analyzer (QA-05)
# Reads historical metric snapshots from admiral/quality/metrics/*.json,
# computes 7-day and 30-day moving averages per module per metric,
# detects declining trends (3+ consecutive declining measurements),
# and alerts when a metric drops below threshold or declines >10%.
#
# Usage:
#   trend_analyzer.sh [--json] [--module MOD] [--window 7|30]
#
# Flags:
#   --json          Emit machine-readable JSON on stdout
#   --module MOD    Analyse only the named module (default: all)
#   --window DAYS   Moving-average window to highlight in human output (default: 7)
#
# Exit codes:
#   0  No declining trends or alerts
#   1  One or more alerts detected
#   2  Hard error (missing dependency, bad arguments)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
METRICS_DIR="${SCRIPT_DIR}/metrics"

# ---------------------------------------------------------------------------
# Thresholds — metric values below these trigger an alert
# ---------------------------------------------------------------------------
THRESHOLD_COVERAGE=60        # test_coverage_pct minimum
THRESHOLD_COMPLEXITY_MAX=30  # complexity_max maximum (alert if above)
THRESHOLD_LINT=20            # lint_violations maximum
THRESHOLD_DEFECT=5           # defect_density_per_1k maximum

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
OPT_JSON=false
OPT_MODULE=""
OPT_WINDOW=7

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --json)    OPT_JSON=true ;;
      --module)
        shift
        if [ $# -eq 0 ]; then
          echo "ERROR: --module requires an argument" >&2
          exit 2
        fi
        OPT_MODULE="$1"
        ;;
      --window)
        shift
        if [ $# -eq 0 ]; then
          echo "ERROR: --window requires an argument" >&2
          exit 2
        fi
        OPT_WINDOW="$1"
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
# Load all snapshot files sorted by timestamp (oldest first)
# ---------------------------------------------------------------------------
load_snapshots() {
  find "$METRICS_DIR" -maxdepth 1 -name "*.json" -type f 2>/dev/null \
    | sort \
    | while IFS= read -r f; do
        if jq empty "$f" 2>/dev/null; then
          echo "$f"
        fi
      done
}

# ---------------------------------------------------------------------------
# Extract module names present across all snapshots
# ---------------------------------------------------------------------------
discover_module_names() {
  local snapshots_list="$1"
  local names="[]"
  while IFS= read -r snap; do
    local snap_names
    snap_names=$(jq -r '.metrics.modules[]?.name // empty' "$snap" 2>/dev/null || true)
    while IFS= read -r n; do
      if [ -n "$n" ]; then
        names=$(echo "$names" | jq --arg n "$n" 'if index($n) then . else . + [$n] end')
      fi
    done <<< "$snap_names"
  done <<< "$snapshots_list"
  echo "$names"
}

# ---------------------------------------------------------------------------
# Get the series of values for one metric for one module across snapshots
# Returns JSON array of {timestamp, value} objects (oldest first)
# ---------------------------------------------------------------------------
get_metric_series() {
  local module_name="$1"
  local metric_key="$2"
  local snapshots_list="$3"

  local series="[]"
  while IFS= read -r snap; do
    local ts
    ts=$(jq -r '.metrics.timestamp // empty' "$snap" 2>/dev/null || true)
    local val
    val=$(jq -r --arg m "$module_name" --arg k "$metric_key" \
      '.metrics.modules[]? | select(.name == $m) | .[$k] // empty' \
      "$snap" 2>/dev/null | head -1 | tr -d '\r' || true)
    if [ -n "$ts" ] && [ -n "$val" ] && [ "$val" != "null" ]; then
      series=$(echo "$series" | jq --arg ts "$ts" --arg v "$val" \
        '. + [{timestamp: $ts, value: ($v | tonumber? // 0)}]')
    fi
  done <<< "$snapshots_list"
  echo "$series"
}

# ---------------------------------------------------------------------------
# Compute moving average over last N points in a series
# Series is JSON array of {timestamp, value}
# Returns numeric average (awk) or "null" if insufficient data
# ---------------------------------------------------------------------------
moving_average() {
  local series_json="$1"
  local window="$2"

  local len
  len=$(echo "$series_json" | jq 'length')
  if [ "$len" -eq 0 ]; then
    echo "null"
    return
  fi

  # Take last $window items
  local slice
  slice=$(echo "$series_json" | jq --argjson w "$window" '.[-$w:]')
  local count
  count=$(echo "$slice" | jq 'length')
  if [ "$count" -eq 0 ]; then
    echo "null"
    return
  fi

  local sum
  sum=$(echo "$slice" | jq '[.[].value] | add')
  awk "BEGIN { printf \"%.2f\", ${sum} / ${count} }"
}

# ---------------------------------------------------------------------------
# Detect declining trend: 3+ consecutive strictly-decreasing values
# Returns "true" or "false"
# ---------------------------------------------------------------------------
detect_declining_trend() {
  local series_json="$1"
  local len
  len=$(echo "$series_json" | jq 'length')
  if [ "$len" -lt 3 ]; then
    echo "false"
    return
  fi

  # Walk the series looking for run of 3+ consecutive declines
  local consecutive=0
  local prev=""
  local found=false

  while IFS= read -r val; do
    if [ -z "$prev" ]; then
      prev="$val"
      continue
    fi
    # compare as floats via awk
    local is_lower
    is_lower=$(awk "BEGIN { print ($val < $prev) ? 1 : 0 }")
    if [ "$is_lower" -eq 1 ]; then
      consecutive=$((consecutive + 1))
      if [ "$consecutive" -ge 2 ]; then
        found=true
        break
      fi
    else
      consecutive=0
    fi
    prev="$val"
  done < <(echo "$series_json" | jq -r '.[].value')

  echo "$found"
}

# ---------------------------------------------------------------------------
# Detect >10% decline: compare latest value to peak in the series
# Returns "true" or "false"
# ---------------------------------------------------------------------------
detect_pct_decline() {
  local series_json="$1"
  local len
  len=$(echo "$series_json" | jq 'length')
  if [ "$len" -lt 2 ]; then
    echo "false"
    return
  fi

  local latest
  latest=$(echo "$series_json" | jq '.[-1].value')
  local peak
  peak=$(echo "$series_json" | jq '[.[].value] | max')

  if [ "$peak" = "null" ] || [ "$latest" = "null" ]; then
    echo "false"
    return
  fi

  # decline ratio
  local declined
  declined=$(awk "BEGIN {
    if ($peak == 0) { print 0 } else { print (($peak - $latest) / $peak) > 0.10 ? 1 : 0 }
  }")
  if [ "$declined" -eq 1 ]; then echo "true"; else echo "false"; fi
}

# ---------------------------------------------------------------------------
# Check threshold breach for latest value
# For coverage: alert if BELOW threshold; for complexity/lint/defect: alert if ABOVE
# Returns "true" or "false"
# ---------------------------------------------------------------------------
check_threshold_breach() {
  local metric_key="$1"
  local series_json="$2"
  local len
  len=$(echo "$series_json" | jq 'length')
  if [ "$len" -eq 0 ]; then
    echo "false"
    return
  fi

  local latest
  latest=$(echo "$series_json" | jq '.[-1].value')

  local breached="false"
  case "$metric_key" in
    test_coverage_pct)
      breached=$(awk "BEGIN { print ($latest < $THRESHOLD_COVERAGE) ? \"true\" : \"false\" }")
      ;;
    complexity_max)
      breached=$(awk "BEGIN { print ($latest > $THRESHOLD_COMPLEXITY_MAX) ? \"true\" : \"false\" }")
      ;;
    lint_violations)
      breached=$(awk "BEGIN { print ($latest > $THRESHOLD_LINT) ? \"true\" : \"false\" }")
      ;;
    defect_density_per_1k)
      breached=$(awk "BEGIN { print ($latest > $THRESHOLD_DEFECT) ? \"true\" : \"false\" }")
      ;;
  esac
  echo "$breached"
}

# ---------------------------------------------------------------------------
# Analyse one module across all snapshots
# Returns JSON object with trend data and alerts for that module
# ---------------------------------------------------------------------------
analyse_module() {
  local module_name="$1"
  local snapshots_list="$2"

  local metrics_to_track=("test_coverage_pct" "complexity_avg" "complexity_max" "lint_violations" "defect_density_per_1k" "churn_lines_30d")

  local trend_data="{}"
  local alerts="[]"

  for metric in "${metrics_to_track[@]}"; do
    local series
    series=$(get_metric_series "$module_name" "$metric" "$snapshots_list")

    local avg7
    avg7=$(moving_average "$series" 7)
    local avg30
    avg30=$(moving_average "$series" 30)

    local declining
    declining=$(detect_declining_trend "$series")
    local pct_decline
    pct_decline=$(detect_declining_trend "$series")
    pct_decline=$(detect_pct_decline "$series")

    local threshold_breach
    threshold_breach=$(check_threshold_breach "$metric" "$series")

    local latest_val="null"
    local series_len
    series_len=$(echo "$series" | jq 'length')
    if [ "$series_len" -gt 0 ]; then
      latest_val=$(echo "$series" | jq '.[-1].value')
    fi

    # Build metric trend entry
    local metric_entry
    if [ "$avg7" = "null" ]; then
      metric_entry=$(jq -n \
        --arg metric "$metric" \
        --argjson latest "$latest_val" \
        --argjson declining "$declining" \
        --argjson pct_decline "$pct_decline" \
        --argjson threshold_breach "$threshold_breach" \
        --argjson data_points "$series_len" \
        '{
          metric: $metric,
          latest_value: $latest,
          avg_7d: null,
          avg_30d: null,
          declining_trend: $declining,
          pct_decline_from_peak: $pct_decline,
          threshold_breach: $threshold_breach,
          data_points: $data_points
        }')
    else
      metric_entry=$(jq -n \
        --arg metric "$metric" \
        --argjson latest "$latest_val" \
        --arg avg7 "$avg7" \
        --arg avg30 "$avg30" \
        --argjson declining "$declining" \
        --argjson pct_decline "$pct_decline" \
        --argjson threshold_breach "$threshold_breach" \
        --argjson data_points "$series_len" \
        '{
          metric: $metric,
          latest_value: $latest,
          avg_7d: ($avg7 | tonumber),
          avg_30d: ($avg30 | tonumber),
          declining_trend: $declining,
          pct_decline_from_peak: $pct_decline,
          threshold_breach: $threshold_breach,
          data_points: $data_points
        }')
    fi

    trend_data=$(echo "$trend_data" | jq --arg k "$metric" --argjson v "$metric_entry" '. + {($k): $v}')

    # Generate alerts
    if [ "$declining" = "true" ]; then
      local alert
      alert=$(jq -n \
        --arg module "$module_name" \
        --arg metric "$metric" \
        --argjson latest "$latest_val" \
        '{
          type: "declining_trend",
          module: $module,
          metric: $metric,
          latest_value: $latest,
          message: ("3+ consecutive declining measurements for " + $metric + " in " + $module)
        }')
      alerts=$(echo "$alerts" | jq --argjson a "$alert" '. + [$a]')
    fi

    if [ "$pct_decline" = "true" ]; then
      local alert
      alert=$(jq -n \
        --arg module "$module_name" \
        --arg metric "$metric" \
        --argjson latest "$latest_val" \
        '{
          type: "pct_decline",
          module: $module,
          metric: $metric,
          latest_value: $latest,
          message: ("Metric " + $metric + " has declined >10% from peak in " + $module)
        }')
      alerts=$(echo "$alerts" | jq --argjson a "$alert" '. + [$a]')
    fi

    if [ "$threshold_breach" = "true" ]; then
      local alert
      alert=$(jq -n \
        --arg module "$module_name" \
        --arg metric "$metric" \
        --argjson latest "$latest_val" \
        '{
          type: "threshold_breach",
          module: $module,
          metric: $metric,
          latest_value: $latest,
          message: ("Metric " + $metric + " has breached acceptable threshold in " + $module)
        }')
      alerts=$(echo "$alerts" | jq --argjson a "$alert" '. + [$a]')
    fi
  done

  jq -n \
    --arg name "$module_name" \
    --argjson trends "$trend_data" \
    --argjson alerts "$alerts" \
    '{module: $name, trends: $trends, alerts: $alerts}'
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

  if [ ! -d "$METRICS_DIR" ]; then
    echo "WARNING: metrics directory not found: $METRICS_DIR" >&2
    if [ "$OPT_JSON" = true ]; then
      jq -n '{trend_analysis: {timestamp: (now | todate), modules: [], alerts: [], snapshots_analysed: 0}}'
    fi
    exit 0
  fi

  local snapshots_list
  snapshots_list=$(load_snapshots)
  local snap_count=0
  if [ -n "$snapshots_list" ]; then
    snap_count=$(echo "$snapshots_list" | wc -l | tr -d ' ')
  fi

  if [ "$snap_count" -eq 0 ]; then
    echo "WARNING: No valid metric snapshots found in $METRICS_DIR" >&2
    if [ "$OPT_JSON" = true ]; then
      jq -n '{trend_analysis: {timestamp: (now | todate), modules: [], alerts: [], snapshots_analysed: 0}}'
    fi
    exit 0
  fi

  # Discover modules
  local module_names
  if [ -n "$OPT_MODULE" ]; then
    module_names=$(jq -n --arg m "$OPT_MODULE" '[$m]')
  else
    module_names=$(discover_module_names "$snapshots_list")
  fi

  local modules_json="[]"
  local all_alerts="[]"

  while IFS= read -r mod_name; do
    if [ -z "$mod_name" ]; then continue; fi
    local mod_result
    mod_result=$(analyse_module "$mod_name" "$snapshots_list")
    modules_json=$(echo "$modules_json" | jq --argjson m "$mod_result" '. + [$m]')

    local mod_alerts
    mod_alerts=$(echo "$mod_result" | jq '.alerts')
    all_alerts=$(echo "$all_alerts" | jq --argjson a "$mod_alerts" '. + $a')
  done < <(echo "$module_names" | jq -r '.[]')

  local timestamp
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%S.000Z)

  local alert_count
  alert_count=$(echo "$all_alerts" | jq 'length')

  local report
  report=$(jq -n \
    --arg ts "$timestamp" \
    --argjson mods "$modules_json" \
    --argjson alerts "$all_alerts" \
    --argjson snaps "$snap_count" \
    --argjson alert_count "$alert_count" \
    '{trend_analysis: {
        timestamp: $ts,
        snapshots_analysed: $snaps,
        alert_count: $alert_count,
        modules: $mods,
        alerts: $alerts
      }}')

  if [ "$OPT_JSON" = true ]; then
    echo "$report"
  else
    echo "========================================"
    echo " Trend Analysis Report"
    echo " Snapshots analysed: $snap_count"
    echo " Window: ${OPT_WINDOW}d moving average"
    echo "========================================"
    echo ""

    echo "$modules_json" | jq -r '.[] | "Module: \(.module)\n" +
      (.trends | to_entries[] | "  \(.key): latest=\(.value.latest_value // "N/A")  avg_7d=\(.value.avg_7d // "N/A")  declining=\(.value.declining_trend)  threshold_breach=\(.value.threshold_breach)") +
      "\n"' 2>/dev/null || true

    if [ "$alert_count" -gt 0 ]; then
      echo "ALERTS ($alert_count):"
      echo "$all_alerts" | jq -r '.[] | "  [\(.type | ascii_upcase)] \(.message)"'
    else
      echo "No alerts detected."
    fi

    echo ""
    echo "========================================"
  fi

  if [ "$alert_count" -gt 0 ]; then
    exit 1
  fi
  exit 0
}

main "$@"
