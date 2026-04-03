#!/bin/bash
# Admiral Framework — Security Audit Trail (S-22)
# Append-only JSONL log of all security-relevant events.
#
# Events logged:
# - Blocked tool uses (scope boundary violations)
# - Injection attempt detections
# - Privilege escalation attempts
# - PII/secret detection events
# - Zero-trust validation failures
# - Standing order enforcement actions
#
# Each entry: timestamp, event_type, agent_id, action, severity, details

ADMIRAL_DIR="${ADMIRAL_DIR:-${CLAUDE_PROJECT_DIR:-.}/.admiral}"
SECURITY_AUDIT_LOG="${ADMIRAL_DIR}/security_audit.jsonl"

# Emit a security audit event
# Usage: audit_security_event <event_type> <action> <severity> [details_json] [agent_id]
audit_security_event() {
  local event_type="$1"
  local action="$2"
  local severity="${3:-medium}"
  local details="${4:-"{}"}"
  local agent_id="${5:-unknown}"

  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)

  # Validate details is JSON
  if ! printf '%s' "$details" | jq empty 2>/dev/null; then
    details=$(jq -cn --arg d "$details" '{raw: $d}')
  fi

  local entry
  entry=$(jq -cn \
    --arg ts "$ts" \
    --arg event "$event_type" \
    --arg action "$action" \
    --arg severity "$severity" \
    --argjson details "$details" \
    --arg agent "$agent_id" \
    '{timestamp: $ts, event_type: $event, action: $action, severity: $severity, agent_id: $agent, details: $details}')

  # Append to audit log (create directory if needed)
  mkdir -p "$ADMIRAL_DIR" 2>/dev/null || true
  echo "$entry" >> "$SECURITY_AUDIT_LOG" 2>/dev/null || true
}

# Convenience functions for common security events
audit_scope_violation() {
  local tool="$1" path="$2" agent="${3:-unknown}"
  audit_security_event "scope_violation" "blocked" "high" \
    "$(jq -cn --arg t "$tool" --arg p "$path" '{tool: $t, path: $p}')" "$agent"
}

audit_injection_detected() {
  local source="$1" severity="$2" details_json="$3"
  audit_security_event "injection_detected" "flagged" "$severity" "$details_json" "system"
}

audit_privilege_escalation() {
  local agent="$1" attempted_action="$2"
  audit_security_event "privilege_escalation" "blocked" "critical" \
    "$(jq -cn --arg a "$attempted_action" '{attempted: $a}')" "$agent"
}

audit_secret_detected() {
  local _source="$1" details_json="$2"
  audit_security_event "secret_detected" "quarantined" "critical" "$details_json" "system"
}

audit_zero_trust_failure() {
  local tool="$1" details="$2"
  audit_security_event "zero_trust_failure" "flagged" "high" \
    "$(jq -cn --arg t "$tool" --arg d "$details" '{tool: $t, detail: $d}')" "system"
}

audit_so_enforcement() {
  local so_id="$1" action="$2" severity="$3" agent="${4:-unknown}"
  audit_security_event "standing_order_enforcement" "$action" "$severity" \
    "$(jq -cn --arg so "$so_id" '{standing_order: $so}')" "$agent"
}

# Query audit log for recent events
# Usage: query_audit_log [event_type] [last_n]
query_audit_log() {
  local event_type="${1:-}"
  local last_n="${2:-50}"

  if [ ! -f "$SECURITY_AUDIT_LOG" ]; then
    echo "[]"
    return
  fi

  if [ -n "$event_type" ]; then
    tail -n "$last_n" "$SECURITY_AUDIT_LOG" | jq -cs --arg t "$event_type" \
      '[.[] | select(.event_type == $t)]'
  else
    tail -n "$last_n" "$SECURITY_AUDIT_LOG" | jq -cs '.'
  fi
}

# Count events by type
audit_event_counts() {
  if [ ! -f "$SECURITY_AUDIT_LOG" ]; then
    echo '{}'
    return
  fi

  jq -cs 'group_by(.event_type) | map({(.[0].event_type): length}) | add // {}' \
    "$SECURITY_AUDIT_LOG"
}
