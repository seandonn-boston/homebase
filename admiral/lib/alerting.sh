#!/bin/bash
# Admiral Framework — Alerting Pipeline (S-15)
# Push alerts from control plane to external systems.
# Supports webhook, file, and structured log delivery.

ALERT_DIR="${CLAUDE_PROJECT_DIR:-.}/.admiral/alerts"
ALERT_LOG="${CLAUDE_PROJECT_DIR:-.}/.admiral/alerts.jsonl"

# Send an alert
# Usage: alert_send <severity> <source> <message> [delivery_method]
alert_send() {
  local severity="$1"
  local source="$2"
  local message="$3"
  local delivery="${4:-log}"

  mkdir -p "$ALERT_DIR"

  local alert_id
  alert_id="alert-$(date +%s)-$$"
  local timestamp
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  # Validate severity
  case "$severity" in
    critical|warning|info) ;;
    *) severity="info" ;;
  esac

  local alert_json
  alert_json=$(jq -cn --arg id "$alert_id" \
        --arg sev "$severity" \
        --arg src "$source" \
        --arg msg "$message" \
        --arg ts "$timestamp" \
        --arg del "$delivery" \
        '{
          alert_id: $id,
          severity: $sev,
          source: $src,
          message: $msg,
          timestamp: $ts,
          delivery: $del,
          delivered: false
        }')

  # Deliver based on method
  case "$delivery" in
    log)
      echo "$alert_json" >> "$ALERT_LOG" 2>/dev/null
      alert_json=$(echo "$alert_json" | jq '.delivered = true' | tr -d '\r')
      ;;
    file)
      echo "$alert_json" > "$ALERT_DIR/${alert_id}.json"
      alert_json=$(echo "$alert_json" | jq '.delivered = true' | tr -d '\r')
      ;;
    webhook)
      # Webhook delivery (placeholder — actual HTTP call would go here)
      alert_json=$(echo "$alert_json" | jq '.delivered = false | .delivery_note = "webhook delivery not configured"' | tr -d '\r')
      ;;
  esac

  echo "$alert_json"
}

# List recent alerts
# Usage: alert_list [severity_filter] [max_count]
alert_list() {
  local severity="${1:-}"
  local max_count="${2:-50}"

  if [ ! -f "$ALERT_LOG" ]; then
    echo "[]"
    return 0
  fi

  if [ -n "$severity" ]; then
    tail -n "$max_count" "$ALERT_LOG" 2>/dev/null | \
      jq -cs --arg sev "$severity" '[.[] | select(.severity == $sev)]' | tr -d '\r'
  else
    tail -n "$max_count" "$ALERT_LOG" 2>/dev/null | \
      jq -cs '.' | tr -d '\r'
  fi
}

# Count alerts by severity
alert_summary() {
  if [ ! -f "$ALERT_LOG" ]; then
    jq -n '{"critical": 0, "warning": 0, "info": 0, "total": 0}'
    return 0
  fi

  jq -cs '{
    critical: ([.[] | select(.severity == "critical")] | length),
    warning: ([.[] | select(.severity == "warning")] | length),
    info: ([.[] | select(.severity == "info")] | length),
    total: length
  }' "$ALERT_LOG" | tr -d '\r'
}
