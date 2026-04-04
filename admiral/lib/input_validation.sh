#!/bin/bash
# Admiral Framework — Input Validation Hardening (SEC-12)
# Boundary validation at all external interfaces.
# This is the outermost defense ring — before Layer 1 and Layer 2.
#
# Validates: max sizes, allowed character sets, null byte rejection,
# structural constraints. Returns structured JSON on failure.

# Default limits (configurable via environment)
MAX_INPUT_BYTES="${ADMIRAL_MAX_INPUT_BYTES:-1048576}"       # 1MB
MAX_HOOK_PAYLOAD_BYTES="${ADMIRAL_MAX_HOOK_PAYLOAD:-524288}" # 512KB
MAX_BRAIN_ENTRY_BYTES="${ADMIRAL_MAX_BRAIN_ENTRY:-65536}"    # 64KB
export MAX_CLI_ARG_BYTES="${ADMIRAL_MAX_CLI_ARG:-8192}"      # 8KB
MAX_PATH_LENGTH="${ADMIRAL_MAX_PATH_LENGTH:-4096}"           # 4096 chars

# Validate input does not contain null bytes
# Returns: 0 = clean, 1 = null bytes found
validate_no_null_bytes() {
  local input="$1"
  if printf '%s' "$input" | grep -cP '\x00' >/dev/null 2>&1; then
    return 1
  fi
  return 0
}

# Validate input size in bytes
# Returns: 0 = within limit, 1 = too large
validate_size() {
  local input="$1"
  local max_bytes="${2:-$MAX_INPUT_BYTES}"
  local size
  size=$(printf '%s' "$input" | wc -c | tr -d ' ')
  if [ "$size" -gt "$max_bytes" ]; then
    return 1
  fi
  return 0
}

# Validate input matches allowed character set
# Allowed: printable ASCII + common Unicode (no control chars except \n \r \t)
# Returns: 0 = valid, 1 = invalid characters found
validate_charset() {
  local input="$1"
  # Reject control characters except tab, newline, carriage return
  if printf '%s' "$input" | grep -cP '[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]' >/dev/null 2>&1; then
    return 1
  fi
  return 0
}

# Validate a file path
# Returns: 0 = valid, 1 = invalid
validate_path() {
  local filepath="$1"
  local max_len="${2:-$MAX_PATH_LENGTH}"

  # Check length
  if [ "${#filepath}" -gt "$max_len" ]; then
    return 1
  fi

  # Reject null bytes
  if ! validate_no_null_bytes "$filepath"; then
    return 1
  fi

  # Reject path traversal beyond project root
  if printf '%s' "$filepath" | grep -qE '(\.\./){3,}'; then
    return 1
  fi

  return 0
}

# Validate JSON structure (well-formed JSON only)
# Returns: 0 = valid JSON, 1 = invalid
validate_json() {
  local input="$1"
  if printf '%s' "$input" | jq empty 2>/dev/null; then
    return 0
  fi
  return 1
}

# Full boundary validation for hook payloads
# Returns: 0 = valid, 1 = rejected (JSON error on stdout)
validate_hook_input() {
  local input="$1"
  local errors="[]"

  # Size check
  if ! validate_size "$input" "$MAX_HOOK_PAYLOAD_BYTES"; then
    local size
    size=$(printf '%s' "$input" | wc -c | tr -d ' ')
    errors=$(printf '%s' "$errors" | jq -c --arg s "$size" --arg m "$MAX_HOOK_PAYLOAD_BYTES" \
      '. + ["Input too large: " + $s + " bytes (max " + $m + ")"]')
  fi

  # Null byte check
  if ! validate_no_null_bytes "$input"; then
    errors=$(printf '%s' "$errors" | jq -c '. + ["Input contains null bytes"]')
  fi

  # Character set check
  if ! validate_charset "$input"; then
    errors=$(printf '%s' "$errors" | jq -c '. + ["Input contains invalid control characters"]')
  fi

  # JSON validity
  if ! validate_json "$input"; then
    errors=$(printf '%s' "$errors" | jq -c '. + ["Input is not valid JSON"]')
  fi

  local error_count
  error_count=$(printf '%s' "$errors" | jq 'length')
  if [ "$error_count" -gt 0 ]; then
    jq -cn --argjson errors "$errors" '{valid: false, errors: $errors}'
    return 1
  fi

  echo '{"valid":true,"errors":[]}'
  return 0
}

# Full boundary validation for brain entries
validate_brain_input() {
  local input="$1"
  local errors="[]"

  if ! validate_size "$input" "$MAX_BRAIN_ENTRY_BYTES"; then
    local size
    size=$(printf '%s' "$input" | wc -c | tr -d ' ')
    errors=$(printf '%s' "$errors" | jq -c --arg s "$size" --arg m "$MAX_BRAIN_ENTRY_BYTES" \
      '. + ["Brain entry too large: " + $s + " bytes (max " + $m + ")"]')
  fi

  if ! validate_no_null_bytes "$input"; then
    errors=$(printf '%s' "$errors" | jq -c '. + ["Brain entry contains null bytes"]')
  fi

  if ! validate_json "$input"; then
    errors=$(printf '%s' "$errors" | jq -c '. + ["Brain entry is not valid JSON"]')
  fi

  local error_count
  error_count=$(printf '%s' "$errors" | jq 'length')
  if [ "$error_count" -gt 0 ]; then
    jq -cn --argjson errors "$errors" '{valid: false, errors: $errors}'
    return 1
  fi

  echo '{"valid":true,"errors":[]}'
  return 0
}
