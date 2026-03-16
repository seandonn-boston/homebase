#!/bin/bash
# Admiral Framework — Scope Boundary Guard (PreToolUse)
# Enforces SO-03: Scope Boundaries
# Checks file operations against allowed directory boundaries.
# Advisory only — emits warnings but NEVER hard-blocks (always exit 0).
# Timeout: 5s
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Read payload from stdin
PAYLOAD=$(cat)

TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // "unknown"')

# Only check file-modifying tools
case "$TOOL_NAME" in
  Write|Edit|NotebookEdit) ;;
  Bash)
    # Check if bash command modifies protected paths
    COMMAND=$(echo "$PAYLOAD" | jq -r '.tool_input.command // ""')
    # Skip non-modifying commands
    case "$COMMAND" in
      git\ status*|git\ log*|git\ diff*|ls*|cat*|head*|tail*|echo*|pwd*)
        exit 0 ;;
    esac
    ;;
  *) exit 0 ;;
esac

# Protected directories that require explicit approval
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

ALERT=""
for PROTECTED in "${PROTECTED_DIRS[@]}"; do
  case "$REL_PATH" in
    "$PROTECTED"*|*"$PROTECTED"*)
      ALERT="SCOPE BOUNDARY (SO-03): Operation targets protected path '${PROTECTED}'. Per AGENTS.md, modifications to this path require explicit approval. Confirm with the user before proceeding."
      break
      ;;
  esac
done

# For Bash commands, check for dangerous patterns against protected paths
if [ "$TOOL_NAME" = "Bash" ] && [ -z "$ALERT" ]; then
  for PROTECTED in "${PROTECTED_DIRS[@]}"; do
    if echo "$COMMAND" | grep -q "$PROTECTED"; then
      # Check if it's a write operation
      if echo "$COMMAND" | grep -qE '(rm |mv |cp |sed -i|chmod |chown |>|>>|tee )'; then
        ALERT="SCOPE BOUNDARY (SO-03): Bash command may modify protected path '${PROTECTED}'. Verify this operation has explicit approval."
        break
      fi
    fi
  done
fi

if [ -n "$ALERT" ]; then
  jq -n --arg ctx "$ALERT" '{
    "hookSpecificOutput": {
      "hookEventName": "PreToolUse",
      "permissionDecision": "allow",
      "additionalContext": $ctx
    }
  }'
fi

exit 0
