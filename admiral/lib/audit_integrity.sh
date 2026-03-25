#!/bin/bash
# Admiral Framework — Audit Trail Tamper Detection (SEC-06)
# SHA-256 hash chain on the security audit log.
# Each entry includes a prev_hash field linking to the previous entry.
# Chain breaks indicate tampering.
#
# Usage:
#   source admiral/lib/audit_integrity.sh
#   audit_append '{"event_type":"test","action":"blocked"}'
#   audit_verify_chain  # exits 0 if intact, 1 if broken

ADMIRAL_DIR="${ADMIRAL_DIR:-${CLAUDE_PROJECT_DIR:-.}/.admiral}"
INTEGRITY_AUDIT_LOG="${ADMIRAL_DIR}/security_audit_chained.jsonl"
CHAIN_STATE_FILE="${ADMIRAL_DIR}/audit_chain_state.json"

# Get the current chain head hash
_get_chain_head() {
  if [ -f "$CHAIN_STATE_FILE" ]; then
    jq -r '.last_hash // "genesis"' "$CHAIN_STATE_FILE" 2>/dev/null || echo "genesis"
  else
    echo "genesis"
  fi
}

# Compute SHA-256 of a string
_sha256() {
  printf '%s' "$1" | sha256sum 2>/dev/null | cut -d' ' -f1 || \
    printf '%s' "$1" | shasum -a 256 2>/dev/null | cut -d' ' -f1 || \
    echo "hash_unavailable"
}

# Append an entry to the tamper-proof audit log
# Usage: audit_append '<json_entry>'
audit_append() {
  local entry="$1"
  local prev_hash
  prev_hash=$(_get_chain_head)

  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)

  # Add prev_hash and sequence to the entry
  local chained_entry
  chained_entry=$(printf '%s' "$entry" | jq -c \
    --arg prev "$prev_hash" --arg ts "$ts" \
    '. + {prev_hash: $prev, chain_timestamp: $ts}')

  # Compute hash of this entry
  local entry_hash
  entry_hash=$(_sha256 "$chained_entry")

  # Add the hash to the entry
  chained_entry=$(printf '%s' "$chained_entry" | jq -c --arg h "$entry_hash" '. + {entry_hash: $h}')

  # Write to log
  mkdir -p "$ADMIRAL_DIR" 2>/dev/null || true
  echo "$chained_entry" >> "$INTEGRITY_AUDIT_LOG" 2>/dev/null || true

  # Update chain state
  jq -cn --arg h "$entry_hash" --arg ts "$ts" \
    '{last_hash: $h, last_updated: $ts}' > "$CHAIN_STATE_FILE" 2>/dev/null || true
}

# Verify the hash chain integrity
# Returns: 0 = intact, 1 = broken
# Outputs: JSON report on stdout
audit_verify_chain() {
  if [ ! -f "$INTEGRITY_AUDIT_LOG" ]; then
    echo '{"valid":true,"entries":0,"message":"No audit log exists"}'
    return 0
  fi

  local expected_prev="genesis"
  local line_num=0
  local valid=true
  local break_at=0

  while IFS= read -r line; do
    line_num=$((line_num + 1))

    # Extract fields
    local prev_hash
    prev_hash=$(printf '%s' "$line" | jq -r '.prev_hash // ""')
    local entry_hash
    entry_hash=$(printf '%s' "$line" | jq -r '.entry_hash // ""')

    # Check prev_hash links correctly
    if [ "$prev_hash" != "$expected_prev" ]; then
      valid=false
      break_at=$line_num
      break
    fi

    # Verify entry hash
    local entry_without_hash
    entry_without_hash=$(printf '%s' "$line" | jq -c 'del(.entry_hash)')
    local computed_hash
    computed_hash=$(_sha256 "$entry_without_hash")

    if [ "$computed_hash" != "$entry_hash" ]; then
      valid=false
      break_at=$line_num
      break
    fi

    expected_prev="$entry_hash"
  done < "$INTEGRITY_AUDIT_LOG"

  if [ "$valid" = "true" ]; then
    jq -cn --argjson n "$line_num" '{valid: true, entries: $n, message: "Chain integrity verified"}'
    return 0
  else
    jq -cn --argjson n "$line_num" --argjson at "$break_at" \
      '{valid: false, entries: $n, break_at: $at, message: "CHAIN BREAK DETECTED — possible tampering"}' >&2
    return 1
  fi
}
