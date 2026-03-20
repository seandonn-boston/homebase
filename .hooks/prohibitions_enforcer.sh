#!/bin/bash
# Admiral Framework — Prohibitions Enforcer (PreToolUse)
# Enforces SO-10: What You Must Never Do
# Detects violations of prohibition rules beyond budget (handled by token_budget_tracker).
# Hard-blocks (exit 2) on bypass and irreversible patterns.
# Advisory (exit 0) on secrets detection (false-positive risk too high to block).
# Timeout: 5s
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Source brain_writer for auto-recording enforcement events (B-01)
if [ -f "$PROJECT_DIR/admiral/lib/brain_writer.sh" ]; then
  source "$PROJECT_DIR/admiral/lib/brain_writer.sh"
fi

# Read payload from stdin
PAYLOAD=$(cat)

TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // "unknown"')
ALERTS=""
HARD_BLOCK=false

# --- Rule: Never bypass or disable enforcement mechanisms ---
if [ "$TOOL_NAME" = "Bash" ]; then
  COMMAND=$(echo "$PAYLOAD" | jq -r '.tool_input.command // ""')

  # Strip heredoc/here-string content before pattern matching to prevent false
  # positives when documentation or plan text references paths like .hooks/.
  # Only the actual command line is checked, not the heredoc body.
  COMMAND_TO_CHECK="$COMMAND"
  if printf '%s\n' "$COMMAND" | grep -qE '<<[-~]?\s*\\?['"'"'"]?[A-Za-z_]'; then
    COMMAND_TO_CHECK=$(printf '%s\n' "$COMMAND" | head -n1)
  fi

  # Detect hook/linter/CI bypass patterns → HARD BLOCK
  # Why hard-block: bypassing enforcement undermines the core thesis of the Admiral
  # Framework. An agent that can disable its own guardrails has no guardrails.
  BYPASS_PATTERNS=(
    "--no-verify"
    "--no-gpg-sign"
    "eslint.*--fix.*--quiet"
    "chmod.*\.hooks/"
    "rm.*\.hooks/"
    "disable.*hook"
    "\[skip ci\]"
    "\[ci skip\]"
    "SKIP=.*pre-commit"
  )
  for PATTERN in "${BYPASS_PATTERNS[@]}"; do
    if echo "$COMMAND_TO_CHECK" | grep -qiE -- "$PATTERN"; then
      ALERTS+="PROHIBITION (SO-10): Command matches bypass pattern '${PATTERN}'. Never bypass or disable enforcement mechanisms. "
      HARD_BLOCK=true
      break
    fi
  done

  # --- Rule: Never store secrets, credentials, or PII → ADVISORY ONLY ---
  # Why advisory-only: these patterns have high false-positive rates (e.g., "token="
  # appears in legitimate code). Hard-blocking would disrupt legitimate work.
  # NOTE: Scans full $COMMAND (including heredoc content), NOT $COMMAND_TO_CHECK.
  # Secrets in heredoc bodies ARE worth flagging — a heredoc writing a config file
  # with embedded credentials is exactly the scenario this detects. False positives
  # are acceptable here because the pattern is advisory-only (never blocks).
  SECRET_PATTERNS=(
    'password\s*='
    'api_key\s*='
    'secret\s*='
    'token\s*='
    'AWS_ACCESS_KEY'
    'PRIVATE_KEY'
    'BEGIN RSA'
    'BEGIN OPENSSH'
    'BEGIN PGP'
  )
  for PATTERN in "${SECRET_PATTERNS[@]}"; do
    if echo "$COMMAND" | grep -qiE -- "$PATTERN"; then
      ALERTS+="PROHIBITION (SO-10): Command may contain or create secrets/credentials. Never store secrets in code or configuration. "
      break
    fi
  done

  # --- Rule: Never escalate privileges without approval (SO-12 enforcement) → HARD BLOCK ---
  PRIVILEGE_PATTERNS=(
    "^sudo "
    " sudo "
    "su -[[:space:]]"
    "su root"
    "chmod [0-7]*7[0-7]*"
    "chmod a\+"
    "chmod 777"
    "chown root"
    "setuid"
  )
  for PATTERN in "${PRIVILEGE_PATTERNS[@]}"; do
    if echo "$COMMAND_TO_CHECK" | grep -qE -- "$PATTERN"; then
      ALERTS+="PROHIBITION (SO-12/SO-10): Command involves privilege escalation ('${PATTERN}'). Privilege escalation requires Admiral approval. Escalate with justification or use non-privileged alternatives. "
      HARD_BLOCK=true
      break
    fi
  done

  # --- Rule: Never make irreversible changes → HARD BLOCK ---
  IRREVERSIBLE_PATTERNS=(
    "rm -rf"
    "git reset --hard"
    "git commit.*--amend"
    "git push.*--force"
    "git push.* -f( |$)"
    "git branch -D"
    "drop table"
    "DROP TABLE"
    "truncate"
    "TRUNCATE"
  )
  for PATTERN in "${IRREVERSIBLE_PATTERNS[@]}"; do
    if echo "$COMMAND_TO_CHECK" | grep -qiE -- "$PATTERN"; then
      ALERTS+="PROHIBITION (SO-10): Command is potentially irreversible ('${PATTERN}'). This action has been blocked. "
      HARD_BLOCK=true
      break
    fi
  done
fi

# --- Rule: Never store secrets in files → ADVISORY ONLY ---
if [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "Edit" ]; then
  FILE_PATH=$(echo "$PAYLOAD" | jq -r '.tool_input.file_path // ""')
  CONTENT=""
  if [ "$TOOL_NAME" = "Write" ]; then
    CONTENT=$(echo "$PAYLOAD" | jq -r '.tool_input.content // ""')
  else
    CONTENT=$(echo "$PAYLOAD" | jq -r '.tool_input.new_string // ""')
  fi

  # Check for secrets in file content
  if echo "$CONTENT" | grep -qiE '(password|api_key|secret_key|private_key|AWS_ACCESS_KEY|BEGIN RSA|BEGIN OPENSSH)\s*[:=]'; then
    ALERTS+="PROHIBITION (SO-10): File write may contain secrets or credentials. Never store secrets in code or configuration files. "
  fi

  # Check for writes to sensitive file types
  case "$FILE_PATH" in
    *.env|*credentials*|*secret*|*.pem|*.key)
      ALERTS+="PROHIBITION (SO-10): Writing to sensitive file type '${FILE_PATH##*/}'. Verify this does not contain secrets. "
      ;;
  esac
fi

# Emit output based on severity
if [ "$HARD_BLOCK" = "true" ]; then
  # Auto-record to Brain (B-01: brain_writer integration)
  if command -v brain_record_prohibition &>/dev/null; then
    brain_record_prohibition "$TOOL_NAME" "$ALERTS" 2>/dev/null || true
  fi
  jq -n --arg ctx "$ALERTS" '{
    "hookSpecificOutput": {
      "hookEventName": "PreToolUse",
      "permissionDecision": "deny",
      "additionalContext": $ctx
    }
  }'
  exit 2
fi

if [ -n "$ALERTS" ]; then
  jq -n --arg ctx "$ALERTS" '{
    "hookSpecificOutput": {
      "hookEventName": "PreToolUse",
      "permissionDecision": "allow",
      "additionalContext": $ctx
    }
  }'
fi

exit 0
