#!/bin/bash
# Admiral Framework — Hook Latency Benchmark (T-11)
# Measures wall-clock time for each hook with typical payload.
# Outputs p50/p95/p99 latency table.
# Usage: bash admiral/benchmarks/hook_latency.sh [iterations]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOKS_DIR="$PROJECT_DIR/.hooks"
ITERATIONS="${1:-10}"

export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Typical payloads
PAYLOAD_PRE='{"tool_name":"Bash","tool_input":{"command":"echo hello world"}}'
PAYLOAD_POST='{"tool_name":"Bash","tool_input":{"command":"echo hello"},"tool_response":"hello world"}'
PAYLOAD_SESSION='{"session_id":"bench-session","event":"session_start"}'

# Hooks to benchmark with their payloads
declare -A HOOK_PAYLOADS
HOOK_PAYLOADS["pre_tool_use_adapter.sh"]="$PAYLOAD_PRE"
HOOK_PAYLOADS["post_tool_use_adapter.sh"]="$PAYLOAD_POST"
HOOK_PAYLOADS["scope_boundary_guard.sh"]="$PAYLOAD_PRE"
HOOK_PAYLOADS["prohibitions_enforcer.sh"]="$PAYLOAD_PRE"
HOOK_PAYLOADS["zero_trust_validator.sh"]="$PAYLOAD_PRE"
HOOK_PAYLOADS["pre_work_validator.sh"]="$PAYLOAD_PRE"
HOOK_PAYLOADS["loop_detector.sh"]="$PAYLOAD_POST"
HOOK_PAYLOADS["token_budget_tracker.sh"]="$PAYLOAD_POST"
HOOK_PAYLOADS["context_health_check.sh"]="$PAYLOAD_POST"
HOOK_PAYLOADS["compliance_ethics_advisor.sh"]="$PAYLOAD_POST"
HOOK_PAYLOADS["brain_context_router.sh"]="$PAYLOAD_POST"

# Percentile calculation (sorted array, 0-indexed)
percentile() {
  local -n arr=$1
  local pct=$2
  local n=${#arr[@]}
  if [ "$n" -eq 0 ]; then echo "0"; return; fi
  local idx=$(( (pct * n / 100) ))
  if [ "$idx" -ge "$n" ]; then idx=$((n - 1)); fi
  echo "${arr[$idx]}"
}

echo "=== Admiral Hook Latency Benchmark ==="
echo "Iterations: $ITERATIONS per hook"
echo ""
printf "%-35s %8s %8s %8s %8s\n" "Hook" "p50 (ms)" "p95 (ms)" "p99 (ms)" "Mean"
printf "%-35s %8s %8s %8s %8s\n" "---" "---" "---" "---" "---"

for hook in "${!HOOK_PAYLOADS[@]}"; do
  payload="${HOOK_PAYLOADS[$hook]}"
  hook_path="$HOOKS_DIR/$hook"

  if [ ! -f "$hook_path" ]; then
    printf "%-35s %8s\n" "$hook" "MISSING"
    continue
  fi

  timings=()
  for ((i=0; i<ITERATIONS; i++)); do
    start_ns=$(date +%s%N 2>/dev/null || python3 -c "import time; print(int(time.time()*1e9))")
    echo "$payload" | bash "$hook_path" >/dev/null 2>&1 || true
    end_ns=$(date +%s%N 2>/dev/null || python3 -c "import time; print(int(time.time()*1e9))")
    elapsed_ms=$(( (end_ns - start_ns) / 1000000 ))
    timings+=("$elapsed_ms")
  done

  # Sort timings
  IFS=$'\n' sorted=($(sort -n <<< "${timings[*]}")); unset IFS

  p50=$(percentile sorted 50)
  p95=$(percentile sorted 95)
  p99=$(percentile sorted 99)

  # Mean
  total=0
  for t in "${sorted[@]}"; do total=$((total + t)); done
  mean=$((total / ${#sorted[@]}))

  printf "%-35s %8d %8d %8d %8d\n" "$hook" "$p50" "$p95" "$p99" "$mean"
done

echo ""
echo "Done."
