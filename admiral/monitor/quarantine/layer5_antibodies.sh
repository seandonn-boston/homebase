#!/bin/bash
# Admiral Framework — Monitor Immune System Layer 5: Antibodies
# Converts rejected attacks into Brain FAILURE entries for defensive learning.
# Rate-limited (50/hour) and fingerprint-deduplicated to prevent write amplification.
# Deterministic conversion — no LLM involvement.
#
# Input: JSON on stdin with:
#   { "content": "...", "source": "...", "layer3_verdict": {...}, "layer4_verdict": {...} }
# Output: JSON with:
#   { "layer": 5, "action": "ANTIBODY_CREATED|RATE_LIMITED|DUPLICATE|SKIPPED", "entry": {...} }
#
# Only processes content that was REJECTED by Layer 3 or Layer 4.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANTIBODY_DIR="${SCRIPT_DIR}/antibodies"
ANTIBODY_STATE="${SCRIPT_DIR}/antibody_state.json"

# Ensure directories exist
mkdir -p "$ANTIBODY_DIR"

# Read input
INPUT=$(cat)
CONTENT=$(echo "$INPUT" | jq -r '.content // ""')
SOURCE=$(echo "$INPUT" | jq -r '.source // "unknown"')
L3_DECISION=$(echo "$INPUT" | jq -r '.layer3_verdict.decision // "UNKNOWN"')
L4_DECISION=$(echo "$INPUT" | jq -r '.layer4_verdict.decision // "UNKNOWN"')
L3_MATCHES=$(echo "$INPUT" | jq '.layer3_verdict.matches // []')
L4_REASONING=$(echo "$INPUT" | jq -r '.layer4_verdict.reasoning // ""')

# Only create antibodies for rejected content
if [ "$L3_DECISION" != "REJECT" ] && [ "$L4_DECISION" != "REJECT" ]; then
  jq -n '{"layer": 5, "action": "SKIPPED", "reason": "Content was not rejected — no antibody needed"}'
  exit 0
fi

# --- Fingerprint: SHA-256 of normalized content (for deduplication) ---
FINGERPRINT=$(echo "$CONTENT" | tr '[:upper:]' '[:lower:]' | tr -s '[:space:]' ' ' | sha256sum | cut -c1-16)

# --- Rate limiting: max 50 antibodies per hour ---
# Initialize state if missing
if [ ! -f "$ANTIBODY_STATE" ]; then
  jq -n '{"antibodies_this_hour": 0, "hour_start": 0, "fingerprints": []}' > "$ANTIBODY_STATE"
fi

STATE=$(cat "$ANTIBODY_STATE" 2>/dev/null) || STATE='{"antibodies_this_hour": 0, "hour_start": 0, "fingerprints": []}'
# Validate JSON
if ! echo "$STATE" | jq empty 2>/dev/null; then
  STATE='{"antibodies_this_hour": 0, "hour_start": 0, "fingerprints": []}'
fi

CURRENT_EPOCH=$(date +%s)
HOUR_START=$(echo "$STATE" | jq -r '.hour_start // 0')
HOUR_COUNT=$(echo "$STATE" | jq -r '.antibodies_this_hour // 0')

# Reset counter if hour has elapsed
ELAPSED=$((CURRENT_EPOCH - HOUR_START))
if [ "$ELAPSED" -ge 3600 ]; then
  HOUR_START=$CURRENT_EPOCH
  HOUR_COUNT=0
  STATE=$(echo "$STATE" | jq --argjson start "$HOUR_START" '.hour_start = $start | .antibodies_this_hour = 0')
fi

# Check rate limit
if [ "$HOUR_COUNT" -ge 50 ]; then
  jq -n --arg fp "$FINGERPRINT" '{"layer": 5, "action": "RATE_LIMITED", "fingerprint": $fp, "reason": "Rate limit reached (50/hour) — antibody not created to prevent write amplification"}'
  exit 0
fi

# --- Deduplication: check fingerprint ---
EXISTING=$(echo "$STATE" | jq -r --arg fp "$FINGERPRINT" '.fingerprints | index($fp) // empty')
if [ -n "$EXISTING" ]; then
  jq -n --arg fp "$FINGERPRINT" '{"layer": 5, "action": "DUPLICATE", "fingerprint": $fp, "reason": "Attack fingerprint already recorded — duplicate antibody suppressed"}'
  exit 0
fi

# --- Generate FAILURE Brain entry (defanged) ---
TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
REJECTED_BY="layer3"
REJECTION_REASON="Layer 3 semantic analysis"
if [ "$L3_DECISION" != "REJECT" ]; then
  REJECTED_BY="layer4"
  REJECTION_REASON="Layer 4 LLM advisory: $L4_REASONING"
fi

# Defang content: truncate to 500 chars, escape dangerous patterns
DEFANGED=$(echo "$CONTENT" | jq -Rs '.[0:500]')

# Build Brain FAILURE entry
ENTRY_SLUG="attack-${FINGERPRINT}"
ENTRY_FILE="${ANTIBODY_DIR}/${TIMESTAMP}-failure-${ENTRY_SLUG}.json"

ENTRY=$(jq -n \
  --arg ts "$TIMESTAMP" \
  --arg fp "$FINGERPRINT" \
  --arg src "$SOURCE" \
  --arg rejected_by "$REJECTED_BY" \
  --arg reason "$REJECTION_REASON" \
  --argjson defanged "$DEFANGED" \
  --argjson matches "$L3_MATCHES" \
  --arg l4_reasoning "$L4_REASONING" \
  '{
    "type": "FAILURE",
    "category": "security",
    "subcategory": "adversarial_attack",
    "timestamp": $ts,
    "fingerprint": $fp,
    "source": $src,
    "rejected_by": $rejected_by,
    "rejection_reason": $reason,
    "defanged_content_preview": $defanged,
    "attack_patterns": {
      "layer3_matches": $matches,
      "layer4_reasoning": $l4_reasoning
    },
    "antibody_metadata": {
      "purpose": "Defensive learning — future agents can recognize similar attack patterns",
      "defanged": true,
      "original_content_destroyed": true
    }
  }')

# Write antibody entry (atomic write)
echo "$ENTRY" > "${ENTRY_FILE}.tmp" && mv "${ENTRY_FILE}.tmp" "$ENTRY_FILE"

# Update state: increment counter, record fingerprint
HOUR_COUNT=$((HOUR_COUNT + 1))
STATE=$(echo "$STATE" | jq \
  --argjson count "$HOUR_COUNT" \
  --arg fp "$FINGERPRINT" \
  '.antibodies_this_hour = $count | .fingerprints += [$fp]')
echo "$STATE" > "${ANTIBODY_STATE}.tmp" && mv "${ANTIBODY_STATE}.tmp" "$ANTIBODY_STATE"

# Output result
jq -n \
  --arg fp "$FINGERPRINT" \
  --arg file "$ENTRY_FILE" \
  --argjson entry "$ENTRY" \
  '{
    "layer": 5,
    "action": "ANTIBODY_CREATED",
    "fingerprint": $fp,
    "entry_file": $file,
    "entry": $entry
  }'

exit 0
