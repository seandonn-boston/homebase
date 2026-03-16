#!/bin/bash
# Admiral Framework — Monitor Immune System Layer 3: Deterministic Semantic Analysis
# LLM-AIRGAPPED: This layer uses ZERO LLM involvement.
# Performs TF-IDF-weighted authority pattern scoring and behavior manipulation detection
# against a curated attack corpus.
#
# Input: JSON on stdin with { "content": "...", "source": "...", "metadata": {...} }
# Output: JSON verdict { "layer": 3, "decision": "PASS|REJECT", "score": N, "matches": [...] }
#
# Design: Fail-closed — ambiguous content resolves to rejection.
# Threshold: score >= 1.0 triggers rejection.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORPUS_FILE="$SCRIPT_DIR/attack_corpus.json"

# Validate corpus exists
if [ ! -f "$CORPUS_FILE" ]; then
  # Fail-closed: no corpus means we cannot validate — reject
  jq -n '{"layer": 3, "decision": "REJECT", "score": 99, "reason": "Attack corpus missing — fail-closed", "matches": []}'
  exit 0
fi

# Read input
INPUT=$(cat)
CONTENT=$(echo "$INPUT" | jq -r '.content // ""')

# Empty content passes (nothing to analyze)
if [ -z "$CONTENT" ]; then
  jq -n '{"layer": 3, "decision": "PASS", "score": 0, "matches": []}'
  exit 0
fi

# Normalize content: lowercase, collapse whitespace
NORMALIZED=$(echo "$CONTENT" | tr '[:upper:]' '[:lower:]' | tr -s '[:space:]' ' ')

# Score content against each category in the corpus
TOTAL_SCORE=0
MATCHES="[]"

# Process each category
for CATEGORY in authority_spoofing behavior_manipulation credential_fabrication dangerous_advice; do
  WEIGHT=$(jq -r ".${CATEGORY}.weight // 1" "$CORPUS_FILE")
  PHRASE_COUNT=$(jq -r ".${CATEGORY}.phrases | length" "$CORPUS_FILE")

  for i in $(seq 0 $((PHRASE_COUNT - 1))); do
    PHRASE=$(jq -r ".${CATEGORY}.phrases[$i]" "$CORPUS_FILE")

    # Check if normalized content contains this phrase
    if echo "$NORMALIZED" | grep -qF "$PHRASE"; then
      # TF-IDF-inspired scoring: weight * (1 / corpus_size_factor)
      # Longer phrases are more specific, so score higher
      WORD_COUNT=$(echo "$PHRASE" | wc -w)
      SPECIFICITY=$(echo "scale=2; $WORD_COUNT / 3" | bc 2>/dev/null || echo "1")
      PHRASE_SCORE=$(echo "scale=2; $WEIGHT * $SPECIFICITY" | bc 2>/dev/null || echo "$WEIGHT")

      TOTAL_SCORE=$(echo "scale=2; $TOTAL_SCORE + $PHRASE_SCORE" | bc 2>/dev/null || echo "99")

      # Record match
      MATCHES=$(echo "$MATCHES" | jq \
        --arg cat "$CATEGORY" \
        --arg phrase "$PHRASE" \
        --arg score "$PHRASE_SCORE" \
        '. + [{"category": $cat, "phrase": $phrase, "score": ($score | tonumber)}]')
    fi
  done
done

# Decision: score >= 1.0 triggers rejection (fail-closed)
DECISION="PASS"
SCORE_INT=$(echo "$TOTAL_SCORE" | cut -d. -f1)
SCORE_INT=${SCORE_INT:-0}
if [ "$SCORE_INT" -ge 1 ]; then
  DECISION="REJECT"
fi

# Output verdict
jq -n \
  --argjson score "$TOTAL_SCORE" \
  --arg decision "$DECISION" \
  --argjson matches "$MATCHES" \
  '{
    "layer": 3,
    "decision": $decision,
    "score": $score,
    "matches": $matches
  }'

exit 0
