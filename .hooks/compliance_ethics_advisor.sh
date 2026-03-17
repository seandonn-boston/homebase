#!/bin/bash
# Admiral Framework — Compliance & Ethics Advisor (PostToolUse)
# Enforces SO-14: Compliance, Ethics, and Legal Boundaries
# Advisory only — emits warnings but NEVER hard-blocks (always exit 0).
# Compliance determinations are inherently judgment-based; hard enforcement
# would create false positives. Advisory + escalation is the correct pattern.
# Expects session_state in payload (passed by post_tool_use_adapter).
# Returns hook_state and alerts via JSON output — never writes state directly.
# Timeout: 5s
set -euo pipefail

# Read payload from stdin (includes session_state from adapter)
PAYLOAD=$(cat)

TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // "unknown"')
PROJECT_DIR=$(echo "$PAYLOAD" | jq -r '.session_state.project_dir // ""' 2>/dev/null)
if [ -z "$PROJECT_DIR" ]; then
  PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
fi
ALERTS=""

# --- PII Detection in Write/Edit output ---
# "Handle personal data with minimum access, minimum retention, minimum exposure"
if [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "Edit" ]; then
  CONTENT=""
  if [ "$TOOL_NAME" = "Write" ]; then
    CONTENT=$(echo "$PAYLOAD" | jq -r '.tool_input.content // ""' 2>/dev/null)
  else
    CONTENT=$(echo "$PAYLOAD" | jq -r '.tool_input.new_string // ""' 2>/dev/null)
  fi

  if [ -n "$CONTENT" ]; then
    # Email pattern (basic — catches most common formats)
    if echo "$CONTENT" | grep -qE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'; then
      # Exclude obvious non-PII patterns (package names, config examples, placeholder emails)
      if ! echo "$CONTENT" | grep -qE '(example\.com|test\.com|localhost|noreply|no-reply|@types/|@anthropic|@claude)'; then
        ALERTS+="COMPLIANCE (SO-14): Content may contain email addresses (PII). Verify data minimization — is this personal data necessary for the task? If handling real user data, ensure minimum retention and exposure. "
      fi
    fi

    # SSN pattern (US format: XXX-XX-XXXX)
    if echo "$CONTENT" | grep -qE '[0-9]{3}-[0-9]{2}-[0-9]{4}'; then
      ALERTS+="COMPLIANCE (SO-14): Content may contain Social Security Numbers. Personal data like SSNs must NEVER be stored in code or configuration. Escalate immediately if this is real user data. "
    fi

    # Phone number pattern (US formats)
    if echo "$CONTENT" | grep -qE '\([0-9]{3}\)[[:space:]]*[0-9]{3}-[0-9]{4}|[0-9]{3}-[0-9]{3}-[0-9]{4}'; then
      # Exclude version numbers and other numeric patterns
      if ! echo "$CONTENT" | grep -qE '(version|v[0-9]|port|timeout|[0-9]+\.[0-9]+\.[0-9]+)'; then
        ALERTS+="COMPLIANCE (SO-14): Content may contain phone numbers (PII). Verify data minimization — is this personal data necessary? "
      fi
    fi

    # Credit card pattern (basic — 4 groups of 4 digits)
    if echo "$CONTENT" | grep -qE '[0-9]{4}[[:space:]-][0-9]{4}[[:space:]-][0-9]{4}[[:space:]-][0-9]{4}'; then
      ALERTS+="COMPLIANCE (SO-14): Content may contain credit card numbers. Financial data must NEVER be stored in code. Escalate immediately if this is real financial data. "
    fi
  fi

  # Check for writes to compliance-sensitive paths
  FILE_PATH=$(echo "$PAYLOAD" | jq -r '.tool_input.file_path // ""' 2>/dev/null)
  case "$FILE_PATH" in
    *privacy*|*gdpr*|*compliance*|*hipaa*|*pci*)
      ALERTS+="COMPLIANCE (SO-14): Modification to compliance-sensitive file '${FILE_PATH##*/}'. Ensure changes maintain regulatory compliance. Route compliance questions to a human expert if uncertain. "
      ;;
  esac
fi

# --- Track compliance flags from payload state ---
COMPLIANCE_FLAGS=$(echo "$PAYLOAD" | jq -r '.session_state.hook_state.compliance.flags_count // 0')

if [ -n "$ALERTS" ]; then
  COMPLIANCE_FLAGS=$((COMPLIANCE_FLAGS + 1))
fi

# Update hook state
HOOK_STATE=$(jq -n --argjson count "$COMPLIANCE_FLAGS" '{"flags_count": $count}')

# Output
if [ -n "$ALERTS" ]; then
  echo "{\"hook_state\": {\"compliance\": $HOOK_STATE}, \"alert\": $(echo "$ALERTS" | jq -Rs '.')}"
else
  echo "{\"hook_state\": {\"compliance\": $HOOK_STATE}}"
fi

exit 0
