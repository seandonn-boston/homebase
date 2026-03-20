#!/bin/bash
# Admiral Framework — Scope Boundary Guard (PreToolUse)
# Enforces SO-03: Scope Boundaries
# Checks file operations against allowed directory boundaries.
# ENFORCEMENT: Hard-blocks (exit 2) write operations to protected paths.
# ADVISORY: Read operations to protected paths are allowed with no warning.
# SESSION OVERRIDE: If ADMIRAL_SCOPE_OVERRIDE contains the protected path prefix,
#   writes are allowed with an advisory note instead of blocking.
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

# Only check file-modifying tools
# shellcheck disable=SC2034  # IS_WRITE tracks tool type for readability
IS_WRITE=false
case "$TOOL_NAME" in
  Write|Edit|NotebookEdit) IS_WRITE=true ;;
  Bash)
    # Check if bash command modifies protected paths
    COMMAND=$(echo "$PAYLOAD" | jq -r '.tool_input.command // ""')
    # Skip non-modifying commands
    case "$COMMAND" in
      git\ status*|git\ log*|git\ diff*|git\ add*|git\ commit*|git\ push*|ls*|cat*|head*|tail*|echo*|pwd*)
        exit 0 ;;
    esac
    # shellcheck disable=SC2034
    IS_WRITE=true
    ;;
  *) exit 0 ;;
esac

# Protected directories that require explicit approval.
# aiStrat/ — frozen spec, changes require human review (Decision Authority: Escalate)
# .github/workflows/ — CI pipelines affect all contributors (Decision Authority: Escalate)
# .claude/settings — agent permissions, must not be self-modified (security boundary)
PROTECTED_DIRS=(
  "aiStrat/"
  ".github/workflows/"
  ".claude/settings"
)

# Extract target path from tool input
TARGET_PATH=""
case "$TOOL_NAME" in
  Write|Edit)
    TARGET_PATH=$(echo "$PAYLOAD" | jq -r '.tool_input.file_path // ""')
    ;;
  NotebookEdit)
    TARGET_PATH=$(echo "$PAYLOAD" | jq -r '.tool_input.notebook_path // ""')
    ;;
  Bash)
    TARGET_PATH="$COMMAND"
    ;;
esac

# Normalize path relative to project
REL_PATH="${TARGET_PATH#$PROJECT_DIR/}"

MATCHED_DIR=""
for PROTECTED in "${PROTECTED_DIRS[@]}"; do
  # Match both prefix ("aiStrat/foo") and substring ("/full/path/to/aiStrat/foo")
  # to catch absolute paths, relative paths, and paths embedded in commands.
  case "$REL_PATH" in
    "$PROTECTED"*|*"$PROTECTED"*)
      MATCHED_DIR="$PROTECTED"
      break
      ;;
  esac
done

# For Bash commands, check for dangerous patterns against protected paths.
# Strip heredoc content before checking — heredoc bodies contain data (documentation,
# plan text), not commands. Scanning them causes false positives when content references
# protected paths like aiStrat/ or .hooks/. See part3-enforcement.md § Command Content
# Scanning for the full design rationale.
if [ "$TOOL_NAME" = "Bash" ] && [ -z "$MATCHED_DIR" ]; then
  COMMAND_TO_CHECK="$COMMAND"
  if printf '%s\n' "$COMMAND" | grep -qE '<<[-~]?\s*\\?['"'"'"]?[A-Za-z_]'; then
    COMMAND_TO_CHECK=$(printf '%s\n' "$COMMAND" | head -n1)
  fi
  for PROTECTED in "${PROTECTED_DIRS[@]}"; do
    if echo "$COMMAND_TO_CHECK" | grep -q "$PROTECTED"; then
      # Detect write operations in Bash commands. Trailing spaces prevent substring
      # false positives (e.g., "rmdir" won't match "rm "). Covers: file deletion (rm),
      # moves (mv), copies (cp), in-place edits (sed -i), permission changes (chmod/chown),
      # and output redirection (>, >>, tee).
      if echo "$COMMAND_TO_CHECK" | grep -qE '(rm |mv |cp |sed -i|chmod |chown |>|>>|tee )'; then
        MATCHED_DIR="$PROTECTED"
        break
      fi
    fi
  done
fi

# No protected path matched — allow
if [ -z "$MATCHED_DIR" ]; then
  exit 0
fi

# Protected path matched and this is a write operation — check for session override
# Check env var first, then session state file (allows in-session override via state)
OVERRIDE="${ADMIRAL_SCOPE_OVERRIDE:-}"
if [ -z "$OVERRIDE" ]; then
  STATE_FILE="${PROJECT_DIR}/.admiral/session_state.json"
  if [ -f "$STATE_FILE" ]; then
    STATE_OVERRIDE=$(jq -r '.scope_override // empty' "$STATE_FILE" 2>/dev/null) || true
    if [ -n "$STATE_OVERRIDE" ]; then
      OVERRIDE="$STATE_OVERRIDE"
    fi
  fi
fi
OVERRIDE_MATCH=false
if [ -n "$OVERRIDE" ]; then
  # Support comma-separated override list (e.g., ADMIRAL_SCOPE_OVERRIDE=aiStrat,.github/workflows)
  IFS=',' read -ra OVERRIDE_PARTS <<< "$OVERRIDE"
  for PART in "${OVERRIDE_PARTS[@]}"; do
    TRIMMED=$(echo "$PART" | xargs)  # trim whitespace
    if [ -n "$TRIMMED" ] && [[ "$MATCHED_DIR" == *"$TRIMMED"* ]]; then
      OVERRIDE_MATCH=true
      break
    fi
  done
fi

if [ "$OVERRIDE_MATCH" = true ]; then
  # Override granted — allow with advisory note
  ALERT="SCOPE BOUNDARY (SO-03): Write to protected path '${MATCHED_DIR}' allowed via ADMIRAL_SCOPE_OVERRIDE. Override is session-scoped."
  jq -n --arg ctx "$ALERT" '{
    "hookSpecificOutput": {
      "hookEventName": "PreToolUse",
      "permissionDecision": "allow",
      "additionalContext": $ctx
    }
  }'
  exit 0
fi

# No override — hard-block the write
# Auto-record to Brain (B-01: brain_writer integration)
if command -v brain_record_scope_block &>/dev/null; then
  brain_record_scope_block "$MATCHED_DIR" "Tool: $TOOL_NAME, Path: $REL_PATH" 2>/dev/null || true
fi
BLOCK_MSG="SCOPE BOUNDARY (SO-03): Write to protected path '${MATCHED_DIR}' is BLOCKED. This path requires Admiral approval. Options: (1) Ask the Admiral to set ADMIRAL_SCOPE_OVERRIDE=${MATCHED_DIR%/} for this session, (2) Escalate with justification, (3) Work on non-protected paths instead."
jq -n --arg ctx "$BLOCK_MSG" '{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "additionalContext": $ctx
  }
}'
exit 2
