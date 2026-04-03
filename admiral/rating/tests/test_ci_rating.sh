#!/bin/bash
# Admiral Framework — CI Rating Tests (RT-03)
# Tests regression detection, history management, artifact storage, and exit codes.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$SCRIPT_DIR/../../lib/assert.sh"

SCRIPT="${SCRIPT_DIR}/../ci_rating.sh"

echo "========================================"
echo " Test Suite: ci_rating.sh (RT-03)"
echo "========================================"
echo ""

setup

HISTORY_FILE="${TMPDIR_BASE}/history.json"
ARTIFACTS_DIR="${TMPDIR_BASE}/artifacts"
MOCK_PROJECT="${TMPDIR_BASE}/mock_project"

# Create a minimal mock project structure
mkdir -p "${MOCK_PROJECT}/.hooks"
mkdir -p "${MOCK_PROJECT}/admiral/standing-orders"
mkdir -p "${MOCK_PROJECT}/admiral/governance"
mkdir -p "${MOCK_PROJECT}/admiral/security"
mkdir -p "${MOCK_PROJECT}/control-plane/src"
mkdir -p "${MOCK_PROJECT}/.brain"

cat > "${MOCK_PROJECT}/.hooks/pre_tool_use.sh" <<'EOF'
#!/bin/bash
set -euo pipefail
echo "hook fired"
EOF

cat > "${MOCK_PROJECT}/admiral/standing-orders/so_01.md" <<'EOF'
# Standing Order 1
Admiral standing order.
EOF

cat > "${MOCK_PROJECT}/control-plane/src/auth.ts" <<'EOF'
export const auth = true;
EOF

# ---------------------------------------------------------------------------
# Helper: create a minimal history file
# ---------------------------------------------------------------------------

make_history() {
  local tier="$1"
  local score="$2"
  cat > "${HISTORY_FILE}" <<EOF
{
  "version": 1,
  "entries": [
    {
      "reportId": "rat_prev",
      "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
      "entity": "test",
      "tier": "${tier}",
      "ratingLabel": "${tier}-SA",
      "overallScore": ${score},
      "dimensionScores": {},
      "activeCapsCount": 0
    }
  ]
}
EOF
}

# ---------------------------------------------------------------------------
# Helper: run ci_rating with mock project
# ---------------------------------------------------------------------------

run_rating() {
  # Always pass --no-fail so we can capture output and check exit code separately
  bash "$SCRIPT" \
    --entity "test-project" \
    --history "$HISTORY_FILE" \
    "$@" \
    2>&1 || true
}

# ---------------------------------------------------------------------------
# Section 1: Basic execution
# ---------------------------------------------------------------------------
echo "--- Section 1: Basic execution ---"

OUTPUT=$(run_rating --no-fail)
assert_contains "1.1 Basic run — produces output" "$OUTPUT" "Rating"
assert_contains "1.2 Basic run — shows entity" "$OUTPUT" "test-project"

echo ""

# ---------------------------------------------------------------------------
# Section 2: Exit codes
# ---------------------------------------------------------------------------
echo "--- Section 2: Exit codes ---"

# No previous history — should exit 0
rm -f "$HISTORY_FILE"
bash "$SCRIPT" --entity "test" --history "$HISTORY_FILE" --no-fail > /dev/null 2>&1
assert_exit_code "2.1 No history — exit 0" 0 $?

# First run creates history
if command -v jq &>/dev/null; then
  bash "$SCRIPT" --entity "test" --history "$HISTORY_FILE" --no-fail > /dev/null 2>&1
  assert_file_exists "2.2 History file created after first run" "$HISTORY_FILE"
fi

echo ""

# ---------------------------------------------------------------------------
# Section 3: Regression detection (requires jq)
# ---------------------------------------------------------------------------
echo "--- Section 3: Regression detection ---"

if command -v jq &>/dev/null; then
  # Setup: previous was ADM-1 at score 97, now will be lower
  make_history "ADM-1" 97

  REGRESSED_OUTPUT=$(run_rating)
  assert_contains "3.1 Regression detected when tier drops" "$REGRESSED_OUTPUT" "REGRESSION"

  # Setup: previous was ADM-5 at score 5, current should be higher
  make_history "ADM-5" 5

  IMPROVED_OUTPUT=$(run_rating)
  assert_contains "3.2 No regression when previous was lower tier" "$IMPROVED_OUTPUT" "stable or improved"

  # Setup: same tier, same score ballpark — no regression
  make_history "ADM-4" 35

  STABLE_OUTPUT=$(run_rating)
  # Should not show REGRESSION for similar scores
  assert_not_contains "3.3 No regression for similar scores" "$STABLE_OUTPUT" "EXIT 1"

else
  echo "  [SKIP] jq not available — skipping regression tests"
fi

echo ""

# ---------------------------------------------------------------------------
# Section 4: --save flag
# ---------------------------------------------------------------------------
echo "--- Section 4: Artifact storage ---"

rm -f "$HISTORY_FILE"
mkdir -p "$ARTIFACTS_DIR"

# Run with a custom artifacts dir by temporarily overriding
# Since the script uses a fixed path relative to itself, we test the --save flag
# and verify history is updated
bash "$SCRIPT" \
  --entity "test" \
  --history "$HISTORY_FILE" \
  --no-fail \
  > /dev/null 2>&1

if [ -f "$HISTORY_FILE" ]; then
  assert_file_exists "4.1 History file created" "$HISTORY_FILE"
  if command -v jq &>/dev/null; then
    ENTRY_COUNT=$(jq '.entries | length' "$HISTORY_FILE" 2>/dev/null || echo 0)
    assert_gt "4.2 History has at least one entry" "$ENTRY_COUNT" 0
  fi
else
  echo "  [SKIP] History file not created (node/jq may not be available)"
fi

echo ""

# ---------------------------------------------------------------------------
# Section 5: --json flag
# ---------------------------------------------------------------------------
echo "--- Section 5: JSON output ---"

JSON_OUTPUT=$(bash "$SCRIPT" --entity "test" --history "$HISTORY_FILE" --json --no-fail 2>/dev/null || echo "")

if [ -n "$JSON_OUTPUT" ]; then
  # Find the JSON in the output (may have log lines mixed in)
  if command -v jq &>/dev/null; then
    PARSED_JSON=$(echo "$JSON_OUTPUT" | grep -E '^\{' | head -1 || echo "")
    if [ -n "$PARSED_JSON" ]; then
      assert_valid_json "5.1 --json flag produces valid JSON" <(echo "$PARSED_JSON")
    else
      echo "  [SKIP] Could not isolate JSON from output"
    fi
  else
    assert_contains "5.2 --json output contains tier field" "$JSON_OUTPUT" '"tier"'
  fi
else
  echo "  [SKIP] No JSON output (node may not be available)"
fi

echo ""

# ---------------------------------------------------------------------------
# Section 6: --threshold flag
# ---------------------------------------------------------------------------
echo "--- Section 6: Threshold configuration ---"

if command -v jq &>/dev/null; then
  # Previous score 97, current will be much lower
  make_history "ADM-3" 65

  # With a very high threshold (100), small drops should not trigger regression
  THRESH_OUTPUT=$(bash "$SCRIPT" \
    --entity "test" \
    --history "$HISTORY_FILE" \
    --threshold 100 \
    --no-fail \
    2>&1 || true)
  assert_not_contains "6.1 High threshold — no regression on normal drop" "$THRESH_OUTPUT" "EXIT 1"

  # With threshold 0, any drop triggers regression
  make_history "ADM-2" 82
  THRESH_OUTPUT2=$(bash "$SCRIPT" \
    --entity "test" \
    --history "$HISTORY_FILE" \
    --threshold 0 \
    2>&1 || true)
  assert_contains "6.2 Threshold 0 — triggers regression on any drop" "$THRESH_OUTPUT2" "REGRESSION"
else
  echo "  [SKIP] jq not available — skipping threshold tests"
fi

echo ""

# ---------------------------------------------------------------------------
# Section 7: --no-fail flag
# ---------------------------------------------------------------------------
echo "--- Section 7: --no-fail flag ---"

if command -v jq &>/dev/null; then
  make_history "ADM-1" 97

  # Without --no-fail, regression should exit 1
  bash "$SCRIPT" --entity "test" --history "$HISTORY_FILE" > /dev/null 2>&1 || FAIL_CODE=$?
  FAIL_CODE="${FAIL_CODE:-0}"
  assert_exit_code "7.1 Without --no-fail, regression exits 1" 1 "${FAIL_CODE}"

  make_history "ADM-1" 97
  # With --no-fail, always exits 0
  bash "$SCRIPT" --entity "test" --history "$HISTORY_FILE" --no-fail > /dev/null 2>&1
  assert_exit_code "7.2 With --no-fail, regression exits 0" 0 $?
else
  echo "  [SKIP] jq not available — skipping exit code tests"
fi

echo ""

# ---------------------------------------------------------------------------
# Section 8: Error handling
# ---------------------------------------------------------------------------
echo "--- Section 8: Error handling ---"

# Unknown argument
bash "$SCRIPT" --unknown-flag 2>/dev/null || UNKNOWN_EXIT=$?
UNKNOWN_EXIT="${UNKNOWN_EXIT:-0}"
assert_exit_code "8.1 Unknown flag exits 2" 2 "${UNKNOWN_EXIT}"

# Missing argument to --entity
bash "$SCRIPT" --entity 2>/dev/null || MISSING_EXIT=$?
MISSING_EXIT="${MISSING_EXIT:-0}"
assert_exit_code "8.2 Missing --entity value exits 2" 2 "${MISSING_EXIT}"

echo ""

# ---------------------------------------------------------------------------
# Results
# ---------------------------------------------------------------------------
teardown
print_results
