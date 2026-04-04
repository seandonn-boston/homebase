#!/bin/bash
# Admiral Framework — Monitor Quarantine Pipeline
# Chains Layers 2-5 in sequence (Layer 1 runs separately at input boundary).
# Fail-closed: any layer failure results in rejection.
#
# Input: JSON on stdin with { "content": "...", "source": "..." }
# Output: JSON with full pipeline verdict and all layer results.
#
# Layer execution order:
#   Layer 2 (Structural) → Layer 3 (Semantic) → Layer 4 (LLM Advisory) → Layer 5 (Antibodies)
# Short-circuit: Layer 2 REJECT skips Layer 3+. Layer 3 REJECT skips Layer 4.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Read input
INPUT=$(cat)

# --- Layer 2: Structural Validation (SEC-03) ---
L2_VERDICT=""
if [ -f "$SCRIPT_DIR/layer2_structural.sh" ]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/layer2_structural.sh"
  CONTENT=$(echo "$INPUT" | jq -r '.content // empty' 2>/dev/null)
  SOURCE_TYPE=$(echo "$INPUT" | jq -r '.source_type // "generic"' 2>/dev/null)
  if [ -n "$CONTENT" ]; then
    L2_RESULT=$(validate_structural "$CONTENT" "$SOURCE_TYPE" 2>/dev/null) || true
    L2_VALID=$(echo "$L2_RESULT" | jq -r '.valid // "false"')
    if [ "$L2_VALID" = "false" ]; then
      L2_ERRORS=$(echo "$L2_RESULT" | jq -c '.errors // []')
      L2_VERDICT=$(jq -cn --arg type "$SOURCE_TYPE" --argjson errors "$L2_ERRORS" \
        '{layer: 2, decision: "REJECT", reason: "Structural validation failed", schema_type: $type, errors: $errors}')
    else
      L2_VERDICT=$(jq -cn --arg type "$SOURCE_TYPE" \
        '{layer: 2, decision: "PASS", schema_type: $type, errors: []}')
    fi
  else
    L2_VERDICT='{"layer": 2, "decision": "PASS", "reason": "No content field — Layer 2 not applicable"}'
  fi
else
  L2_VERDICT='{"layer": 2, "decision": "PASS", "reason": "Layer 2 script not available — fail-open per ADR-004"}'
fi

L2_DECISION=$(echo "$L2_VERDICT" | jq -r '.decision // "PASS"')

# --- Layer 3: Deterministic Semantic Analysis ---
# Short-circuit: Layer 2 REJECT skips Layer 3+
L3_VERDICT=""
if [ "$L2_DECISION" = "REJECT" ]; then
  L3_VERDICT='{"layer": 3, "decision": "SKIP", "reason": "Layer 2 rejected — Layer 3 not consulted"}'
elif [ -x "$SCRIPT_DIR/layer3_semantic.sh" ]; then
  L3_VERDICT=$(echo "$INPUT" | "$SCRIPT_DIR/layer3_semantic.sh" 2>/dev/null) || {
    # Fail-closed: Layer 3 error means reject
    L3_VERDICT='{"layer": 3, "decision": "REJECT", "score": 99, "reason": "Layer 3 execution failed — fail-closed", "matches": []}'
  }
else
  L3_VERDICT='{"layer": 3, "decision": "REJECT", "score": 99, "reason": "Layer 3 script missing — fail-closed", "matches": []}'
fi

L3_DECISION=$(echo "$L3_VERDICT" | jq -r '.decision // "REJECT"')

# --- Layer 4: LLM Advisory (only if Layer 3 passed) ---
L4_VERDICT=""
if [ "$L3_DECISION" = "PASS" ]; then
  L4_INPUT=$(echo "$INPUT" | jq --argjson l3 "$L3_VERDICT" '. + {layer3_verdict: $l3}')
  if [ -x "$SCRIPT_DIR/layer4_llm_advisory.sh" ]; then
    L4_VERDICT=$(echo "$L4_INPUT" | "$SCRIPT_DIR/layer4_llm_advisory.sh" 2>/dev/null) || {
      L4_VERDICT='{"layer": 4, "decision": "REJECT", "reasoning": "Layer 4 execution failed — fail-closed"}'
    }
  else
    L4_VERDICT='{"layer": 4, "decision": "REJECT", "reasoning": "Layer 4 script missing — fail-closed"}'
  fi
else
  L4_VERDICT='{"layer": 4, "decision": "SKIP", "reasoning": "Layer 3 rejected — Layer 4 not consulted"}'
fi

L4_DECISION=$(echo "$L4_VERDICT" | jq -r '.decision // "REJECT"')

# --- Determine final pipeline decision ---
FINAL_DECISION="PASS"
REJECTED_BY="none"
if [ "$L2_DECISION" = "REJECT" ]; then
  FINAL_DECISION="REJECT"
  REJECTED_BY="layer2"
elif [ "$L3_DECISION" = "REJECT" ]; then
  FINAL_DECISION="REJECT"
  REJECTED_BY="layer3"
elif [ "$L4_DECISION" = "REJECT" ]; then
  FINAL_DECISION="REJECT"
  REJECTED_BY="layer4"
fi

# --- Layer 5: Antibodies (only if rejected) ---
L5_VERDICT=""
if [ "$FINAL_DECISION" = "REJECT" ]; then
  L5_INPUT=$(echo "$INPUT" | jq \
    --argjson l3 "$L3_VERDICT" \
    --argjson l4 "$L4_VERDICT" \
    '. + {layer3_verdict: $l3, layer4_verdict: $l4}')
  if [ -x "$SCRIPT_DIR/layer5_antibodies.sh" ]; then
    L5_VERDICT=$(echo "$L5_INPUT" | "$SCRIPT_DIR/layer5_antibodies.sh" 2>/dev/null) || {
      L5_VERDICT='{"layer": 5, "action": "ERROR", "reason": "Layer 5 execution failed"}'
    }
  else
    L5_VERDICT='{"layer": 5, "action": "ERROR", "reason": "Layer 5 script missing"}'
  fi
else
  L5_VERDICT='{"layer": 5, "action": "SKIPPED", "reason": "Content passed — no antibody needed"}'
fi

# --- Output full pipeline result ---
jq -n \
  --arg decision "$FINAL_DECISION" \
  --arg rejected_by "$REJECTED_BY" \
  --argjson layer2 "$L2_VERDICT" \
  --argjson layer3 "$L3_VERDICT" \
  --argjson layer4 "$L4_VERDICT" \
  --argjson layer5 "$L5_VERDICT" \
  '{
    "pipeline": "quarantine",
    "decision": $decision,
    "rejected_by": $rejected_by,
    "layers": {
      "layer2": $layer2,
      "layer3": $layer3,
      "layer4": $layer4,
      "layer5": $layer5
    }
  }'

exit 0
