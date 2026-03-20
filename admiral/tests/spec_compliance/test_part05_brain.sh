#!/bin/bash
# Spec Compliance: Part 5 — Brain Knowledge System
# Tests: Brain B1 tools, query defaults, brain context router
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$SCRIPT_DIR/test_helpers.sh"
source "$PROJECT_DIR/admiral/config/reference_constants.sh"

echo "--- Part 5: Brain Knowledge System ---"

# B1 tools exist
assert_file_exists "brain_query exists" "$PROJECT_DIR/admiral/bin/brain_query"
assert_file_exists "brain_record exists" "$PROJECT_DIR/admiral/bin/brain_record"
assert_file_exists "brain_retrieve exists" "$PROJECT_DIR/admiral/bin/brain_retrieve"
assert_file_exists "brain_audit exists" "$PROJECT_DIR/admiral/bin/brain_audit"

# Brain context router hook exists
assert_file_exists "brain_context_router exists" "$PROJECT_DIR/.hooks/brain_context_router.sh"

# Brain query default constants match spec
assert_eq "default result limit is 10" "10" "$RC_BRAIN_DEFAULT_RESULT_LIMIT"
assert_eq "max result limit is 50" "50" "$RC_BRAIN_MAX_RESULT_LIMIT"
assert_eq "cosine similarity min score is 0.7" "0.7" "$RC_BRAIN_COSINE_MIN_SCORE"

# Brain token lifecycle constants match spec
assert_eq "default token lifetime is 3600s (1 hour)" "3600" "$RC_BRAIN_TOKEN_LIFETIME_SEC"
assert_eq "max token lifetime is 14400s (4 hours)" "14400" "$RC_BRAIN_TOKEN_MAX_LIFETIME_SEC"

# Brain decay window matches spec
assert_eq "decay awareness window is 90 days" "90" "$RC_BRAIN_DECAY_WINDOW_DAYS"

# B1->B2 graduation threshold
assert_eq "B1->B2 missed retrieval rate is 30%" "30" "$RC_BRAIN_B1_B2_MISSED_RATE"

# B2/B3 not yet implemented
skip_test "B2 vector store" "Not started"
skip_test "B3 HNSW index" "Not started"

report_results "Part 5: Brain Knowledge System"
