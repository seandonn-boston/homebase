#!/bin/bash
# Admiral Framework — Injection Detection Patterns (S1)
# Detects prompt injection, command injection, and authority-spoofing patterns.
# Usage: source this file, then call detect_injection "$text"
# Returns: 0 = clean, 1 = injection detected (pattern name on stdout)

# Prompt injection patterns
INJECTION_PATTERNS=(
  # Prompt injection — role override attempts
  'ignore (all |any )?(previous|prior|above|earlier) (instructions|directives|rules|prompts)'
  'you are now [a-z]+'
  'new instructions:'
  'system prompt:'
  'forget (all |your )?(previous|prior) (context|instructions)'
  'disregard (all |any )?(previous|prior|above) (instructions|rules)'
  # Authority spoofing
  'i am (the |your )?(admin|administrator|root|system|owner|admiral)'
  'speaking as (the |your )?(admin|system|root|admiral)'
  'override authority'
  'bypass (all |any )?(security|safety|enforcement|hooks|restrictions)'
  # Command injection
  '\$\([^)]+\)'
  '`[^`]+`'
  '\|\|.*&&'
  '; *(rm|chmod|chown|wget|curl.*\|.*sh|eval|exec) '
  # Data exfiltration
  'send (this|the|all) (data|content|file|information) to'
  'upload .* to (http|ftp|ssh)'
  # Context manipulation
  'the real instructions are'
  'actually,? (ignore|disregard|forget)'
)

# Check text for injection patterns
detect_injection() {
  local text="$1"
  local lower_text
  lower_text=$(echo "$text" | tr '[:upper:]' '[:lower:]')

  for pattern in "${INJECTION_PATTERNS[@]}"; do
    if echo "$lower_text" | grep -qEi "$pattern" 2>/dev/null; then
      echo "Injection detected: pattern='$pattern'"
      return 1
    fi
  done

  return 0
}

# Validate a hook manifest against the schema
validate_manifest() {
  local manifest_file="$1"
  local schema_file="${2:-${CLAUDE_PROJECT_DIR:-}/aiStrat/hooks/manifest.schema.json}"

  if [ ! -f "$manifest_file" ]; then
    echo "Manifest not found: $manifest_file" >&2
    return 1
  fi

  # Basic structural validation (jq-based, no jsonschema dependency)
  local name version events
  name=$(jq -r '.name // empty' "$manifest_file" 2>/dev/null)
  version=$(jq -r '.version // empty' "$manifest_file" 2>/dev/null)
  events=$(jq -r '.events // empty' "$manifest_file" 2>/dev/null)

  if [ -z "$name" ]; then
    echo "Manifest missing required field: name" >&2
    return 1
  fi

  # Validate name pattern: ^[a-z][a-z0-9_]*$
  if ! echo "$name" | grep -qE '^[a-z][a-z0-9_]*$'; then
    echo "Invalid hook name: '$name' (must match ^[a-z][a-z0-9_]*$)" >&2
    return 1
  fi

  if [ -z "$version" ]; then
    echo "Manifest missing required field: version" >&2
    return 1
  fi

  # Validate version pattern: ^\d+\.\d+\.\d+$
  if ! echo "$version" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
    echo "Invalid version: '$version' (must match X.Y.Z)" >&2
    return 1
  fi

  if [ -z "$events" ] || [ "$events" = "null" ]; then
    echo "Manifest missing required field: events" >&2
    return 1
  fi

  echo "Manifest valid: $name v$version"
  return 0
}
