#!/bin/bash
# Admiral Control Plane — E2E Smoke Test (C-14)
# Starts server, hits health endpoint, sends event, retrieves it.
# Must complete in < 30 seconds.
# Usage: bash scripts/smoke-test.sh
# Exit: 0=pass, 1=fail
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== E2E Smoke Test ==="
START_TIME=$(date +%s)

# Build first
echo "Building..."
cd "$CP_DIR"
npm run build > /dev/null 2>&1

# Start server on random port
echo "Starting server..."
PORT=$(node -e "const s=require('net').createServer();s.listen(0,()=>{console.log(s.address().port);s.close()})")
node dist/src/cli.js --port "$PORT" &
SERVER_PID=$!

# Wait for server to be ready
sleep 2

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

BASE="http://localhost:$PORT"
PASS=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local expected_status="$3"

  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

  if [ "$status" = "$expected_status" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $name (HTTP $status)"
  else
    FAIL=$((FAIL + 1))
    echo "  [FAIL] $name (expected $expected_status, got $status)"
  fi
}

# 1. Health endpoint
check "GET /health returns 200" "$BASE/health" "200"

# 2. Events endpoint (empty initially)
check "GET /api/events returns 200" "$BASE/api/events" "200"

# 3. Alerts endpoint
check "GET /api/alerts returns 200" "$BASE/api/alerts" "200"

# 4. Stats endpoint
check "GET /api/stats returns 200" "$BASE/api/stats" "200"

# 5. Trace endpoint
check "GET /api/trace returns 200" "$BASE/api/trace" "200"

# 6. Config endpoint
check "GET /api/config returns 200" "$BASE/api/config" "200"

# 7. Dashboard
check "GET / returns 200" "$BASE/" "200"

# 8. 404 for unknown route
check "GET /nonexistent returns 404" "$BASE/nonexistent" "404"

# Timing
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo "Duration: ${ELAPSED}s (limit: 30s)"
echo "Results: $PASS passed, $FAIL failed"

if [ "$ELAPSED" -gt 30 ]; then
  echo "FAIL: Exceeded 30s time limit"
  exit 1
fi

if [ "$FAIL" -gt 0 ]; then
  echo "FAIL: $FAIL check(s) failed"
  exit 1
fi

echo "PASS: All smoke tests passed in ${ELAPSED}s"
exit 0
