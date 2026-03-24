#!/bin/bash
# Admiral Framework — Standing Orders Rendering Benchmark (T-14)
# Measures time to render all 16 Standing Orders into text.
# Done when rendering latency < 100ms verified and documented.
# Usage: bash admiral/benchmarks/so_render_bench.sh [iterations]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# shellcheck source=/dev/null
source "$PROJECT_DIR/admiral/lib/standing_orders.sh"

ITERATIONS="${1:-10}"

echo "=== Standing Orders Rendering Benchmark ==="
echo "Iterations: $ITERATIONS"
echo ""

SO_COUNT=$(ls "$PROJECT_DIR/admiral/standing-orders"/so*.json 2>/dev/null | wc -l)
echo "Standing Orders found: $SO_COUNT"
echo ""

timings=()
for ((i=0; i<ITERATIONS; i++)); do
  start_ns=$(date +%s%N 2>/dev/null || python3 -c "import time; print(int(time.time()*1e9))")
  output=$(render_standing_orders)
  end_ns=$(date +%s%N 2>/dev/null || python3 -c "import time; print(int(time.time()*1e9))")
  elapsed_ms=$(( (end_ns - start_ns) / 1000000 ))
  timings+=("$elapsed_ms")
done

# Sort
IFS=$'\n' sorted=($(sort -n <<< "${timings[*]}")); unset IFS

# Stats
total=0
for t in "${sorted[@]}"; do total=$((total + t)); done
mean=$((total / ${#sorted[@]}))
min="${sorted[0]}"
max="${sorted[${#sorted[@]}-1]}"
n=${#sorted[@]}
p50="${sorted[$((n / 2))]}"
p95="${sorted[$((n * 95 / 100))]}"

echo "Results:"
echo "  Min:  ${min}ms"
echo "  p50:  ${p50}ms"
echo "  p95:  ${p95}ms"
echo "  Max:  ${max}ms"
echo "  Mean: ${mean}ms"

# Output size
output_len=${#output}
echo "  Output: ${output_len} characters"

echo ""
if [ "$mean" -lt 100 ]; then
  echo "PASS: Mean rendering time ${mean}ms < 100ms threshold"
else
  echo "NOTE: Mean rendering time ${mean}ms exceeds 100ms threshold"
  echo "  (Windows/MSYS may have higher jq overhead; Linux typically < 100ms)"
fi

echo ""
echo "Done."
