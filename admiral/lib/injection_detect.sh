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
