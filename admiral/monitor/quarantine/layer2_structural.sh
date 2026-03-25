#!/bin/bash
# Admiral Framework — Injection Detection Layer 2: Structural Validation (SEC-03)
# JSON schema validation preventing malformed input from reaching processing layers.
# Validates external inputs against expected schemas. Handles encoding normalization.
#
# Usage:
#   source admiral/monitor/quarantine/layer2_structural.sh
#   validate_structural "$input" "handoff"  # Returns: 0=valid, 1=invalid

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SCHEMA_DIR="$PROJECT_ROOT/admiral/schemas"

# Normalize encoding — detect and decode base64, URL encoding, Unicode escapes
# Returns normalized text on stdout
normalize_encoding() {
  local input="$1"
  local normalized="$input"

  # Detect and decode base64 content (ATK-0012 defense)
  # Only decode if the entire input looks like base64
  if printf '%s' "$normalized" | grep -qE '^[A-Za-z0-9+/=]{20,}$'; then
    local decoded
    decoded=$(printf '%s' "$normalized" | base64 -d 2>/dev/null || echo "")
    if [ -n "$decoded" ]; then
      normalized="$decoded"
    fi
  fi

  # Decode URL-encoded content (%XX patterns)
  if printf '%s' "$normalized" | grep -qE '%[0-9A-Fa-f]{2}'; then
    normalized=$(printf '%s' "$normalized" | sed 's/%20/ /g; s/%22/"/g; s/%27/'"'"'/g; s/%3C/</g; s/%3E/>/g; s/%3D/=/g; s/%26/\&/g; s/%2F/\//g')
  fi

  # Detect Unicode escape sequences (\uXXXX)
  if printf '%s' "$normalized" | grep -qE '\\u[0-9A-Fa-f]{4}'; then
    # Flag but don't transform — unicode escapes in unexpected places are suspicious
    echo "UNICODE_ESCAPES_PRESENT" >&2
  fi

  printf '%s' "$normalized"
}

# Validate JSON structure against expected schema type
# Types: handoff, brain_entry, hook_payload, event_entry
# Returns: 0=valid, 1=invalid (JSON error on stdout)
validate_structural() {
  local input="$1"
  local schema_type="${2:-generic}"
  local errors="[]"

  # Step 1: Normalize encoding
  local normalized
  normalized=$(normalize_encoding "$input" 2>/dev/null)

  # Step 2: Validate JSON syntax
  if ! printf '%s' "$normalized" | jq empty 2>/dev/null; then
    errors=$(printf '%s' "$errors" | jq -c '. + ["Input is not valid JSON"]')
    jq -cn --argjson errors "$errors" --arg type "$schema_type" \
      '{valid: false, schema_type: $type, errors: $errors}'
    return 1
  fi

  # Step 3: Type-specific validation
  case "$schema_type" in
    handoff)
      # Handoff documents must have required fields
      for field in source_agent target_agent context; do
        if ! printf '%s' "$normalized" | jq -e "has(\"$field\")" >/dev/null 2>&1; then
          errors=$(printf '%s' "$errors" | jq -c --arg f "$field" '. + ["Missing required handoff field: " + $f]')
        fi
      done
      ;;
    brain_entry)
      # Brain entries must have category and content
      for field in category content; do
        if ! printf '%s' "$normalized" | jq -e "has(\"$field\")" >/dev/null 2>&1; then
          errors=$(printf '%s' "$errors" | jq -c --arg f "$field" '. + ["Missing required brain entry field: " + $f]')
        fi
      done
      ;;
    hook_payload)
      # Hook payloads must have tool_name
      if ! printf '%s' "$normalized" | jq -e 'has("tool_name")' >/dev/null 2>&1; then
        errors=$(printf '%s' "$errors" | jq -c '. + ["Missing required hook payload field: tool_name"]')
      fi
      ;;
    event_entry)
      # Event entries must have event type and timestamp
      for field in event timestamp; do
        if ! printf '%s' "$normalized" | jq -e "has(\"$field\")" >/dev/null 2>&1; then
          errors=$(printf '%s' "$errors" | jq -c --arg f "$field" '. + ["Missing required event field: " + $f]')
        fi
      done
      ;;
  esac

  # Step 4: Check for injection patterns in structural context
  # Look for injection attempts hidden in JSON field names or nested structures
  local suspicious_keys
  suspicious_keys=$(printf '%s' "$normalized" | jq -r '[paths(scalars) | join(".")] | .[]' 2>/dev/null | \
    grep -iE '(system_prompt|admin_override|ignore_rules|bypass_auth)' || true)
  if [ -n "$suspicious_keys" ]; then
    errors=$(printf '%s' "$errors" | jq -c --arg k "$suspicious_keys" \
      '. + ["Suspicious JSON field names detected: " + $k]')
  fi

  # Step 5: Check for excessively deep nesting (DoS prevention)
  local depth
  depth=$(printf '%s' "$normalized" | jq '[path(..)] | map(length) | max // 0' 2>/dev/null || echo "0")
  if [ "$depth" -gt 20 ]; then
    errors=$(printf '%s' "$errors" | jq -c --arg d "$depth" \
      '. + ["Excessive JSON nesting depth: " + $d + " (max 20)"]')
  fi

  local error_count
  error_count=$(printf '%s' "$errors" | jq 'length')
  if [ "$error_count" -gt 0 ]; then
    jq -cn --argjson errors "$errors" --arg type "$schema_type" \
      '{valid: false, schema_type: $type, errors: $errors}'
    return 1
  fi

  jq -cn --arg type "$schema_type" '{valid: true, schema_type: $type, errors: []}'
  return 0
}
