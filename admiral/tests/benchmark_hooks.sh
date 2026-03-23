#!/usr/bin/env bash
# T-11: Hook latency benchmark
# Measures wall-clock time for each hook with typical payload (cold/warm).
# Outputs p50/p95/p99 table.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$SCRIPT_DIR/../../.hooks"
ITERATIONS="${1:-10}"

# Typical payloads per hook type
SESSION_START_PAYLOAD='{"session_id":"bench-001","model":"claude-sonnet-4-20250514","event":"session_start"}'
PRE_TOOL_PAYLOAD='{"session_id":"bench-001","tool_name":"Read","tool_input":{"file_path":"/tmp/test.txt"}}'
POST_TOOL_PAYLOAD='{"session_id":"bench-001","tool_name":"Read","tool_input":{"file_path":"/tmp/test.txt"},"tool_output":"file contents"}'

# Detect available hooks
HOOKS=()
for hook in "$HOOKS_DIR"/*.sh; do
  [ -f "$hook" ] && HOOKS+=("$hook")
done

if [ ${#HOOKS[@]} -eq 0 ]; then
  echo "No hooks found in $HOOKS_DIR"
  exit 1
fi

# Run benchmark
declare -A RESULTS

percentile() {
  local -n arr=$1
  local p=$2
  local n=${#arr[@]}
  local idx=$(( (n * p + 99) / 100 - 1 ))
  [ $idx -lt 0 ] && idx=0
  [ $idx -ge $n ] && idx=$((n - 1))
  echo "${arr[$idx]}"
}

echo "Hook Latency Benchmark (${ITERATIONS} iterations per hook)"
echo "============================================================"
printf "%-35s %8s %8s %8s %8s\n" "Hook" "p50(ms)" "p95(ms)" "p99(ms)" "avg(ms)"
echo "------------------------------------------------------------"

# Set up minimal env for hooks
export CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
TMPSTATE=$(mktemp -d)
mkdir -p "$TMPSTATE/.admiral"
echo '{"session_id":"bench","tool_call_count":0,"tokens_used":0}' > "$TMPSTATE/.admiral/session_state.json"
export CLAUDE_PROJECT_DIR="$TMPSTATE"

for hook in "${HOOKS[@]}"; do
  hook_name=$(basename "$hook" .sh)
  timings=()

  # Select appropriate payload
  case "$hook_name" in
    session_start_adapter) PAYLOAD="$SESSION_START_PAYLOAD" ;;
    pre_tool_use_adapter|pre_work_validator|scope_boundary_guard) PAYLOAD="$PRE_TOOL_PAYLOAD" ;;
    *) PAYLOAD="$POST_TOOL_PAYLOAD" ;;
  esac

  for ((i = 0; i < ITERATIONS; i++)); do
    start_ns=$(date +%s%N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1e9))')
    echo "$PAYLOAD" | timeout 30 bash "$hook" >/dev/null 2>/dev/null || true
    end_ns=$(date +%s%N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1e9))')
    elapsed_ms=$(( (end_ns - start_ns) / 1000000 ))
    timings+=("$elapsed_ms")
  done

  # Sort timings
  IFS=$'\n' sorted=($(sort -n <<<"${timings[*]}")); unset IFS

  p50=$(percentile sorted 50)
  p95=$(percentile sorted 95)
  p99=$(percentile sorted 99)
  total=0
  for t in "${sorted[@]}"; do total=$((total + t)); done
  avg=$((total / ${#sorted[@]}))

  printf "%-35s %8d %8d %8d %8d\n" "$hook_name" "$p50" "$p95" "$p99" "$avg"
done

rm -rf "$TMPSTATE"

echo "============================================================"
echo "Done."
