#!/usr/bin/env bash
# T-14: Standing Orders rendering benchmark
# Measures time to render all 16 Standing Orders into text.
# Done when rendering latency < 100ms verified.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export CLAUDE_PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../lib/standing_orders.sh"

ITERATIONS="${1:-10}"

echo "Standing Orders Rendering Benchmark"
echo "===================================="

timings=()

for ((i = 0; i < ITERATIONS; i++)); do
  start_ns=$(date +%s%N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1e9))')
  output=$(render_standing_orders 2>/dev/null)
  end_ns=$(date +%s%N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1e9))')
  elapsed_ms=$(( (end_ns - start_ns) / 1000000 ))
  timings+=("$elapsed_ms")
done

# Sort
IFS=$'\n' sorted=($(sort -n <<<"${timings[*]}")); unset IFS

# Calculate stats
n=${#sorted[@]}
total=0
for t in "${sorted[@]}"; do total=$((total + t)); done
avg=$((total / n))
p50_idx=$(( (n * 50 + 99) / 100 - 1 ))
p99_idx=$((n - 1))
[ $p50_idx -lt 0 ] && p50_idx=0

echo ""
echo "Results (${ITERATIONS} iterations):"
echo "  p50:  ${sorted[$p50_idx]}ms"
echo "  p99:  ${sorted[$p99_idx]}ms"
echo "  avg:  ${avg}ms"
echo "  min:  ${sorted[0]}ms"
echo "  max:  ${sorted[$((n-1))]}ms"

# Count SO files rendered
so_count=$(ls "$SCRIPT_DIR/../standing-orders"/so*.json 2>/dev/null | wc -l)
output_lines=$(echo "$output" | wc -l)
echo ""
echo "  Standing Orders rendered: $so_count"
echo "  Output lines: $output_lines"

# Verify < 100ms
if [ "${sorted[$p99_idx]}" -lt 100 ]; then
  echo ""
  echo "PASS: p99 (${sorted[$p99_idx]}ms) < 100ms threshold"
else
  echo ""
  echo "WARN: p99 (${sorted[$p99_idx]}ms) >= 100ms threshold"
fi
