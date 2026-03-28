#!/bin/bash
# Admiral Framework — EDD Visual Confirmation Protocol (EDD-05)
# Structured confirmation flow for probabilistic outcomes requiring
# visual inspection or human/agent review.
#
# Flow:
# 1. Agent produces evidence (screenshot, output sample, rendered view)
# 2. Reviewer (human or agent) inspects evidence
# 3. Confirmation is recorded with reviewer identity and timestamp
# 4. Confirmation is stored alongside the proof artifact

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

# Source jq helpers if available
if [ -f "$SCRIPT_DIR/jq_helpers.sh" ]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/jq_helpers.sh"
fi

CONFIRMATIONS_DIR="${PROJECT_DIR}/.admiral/confirmations"

_ensure_confirm_dir() {
  mkdir -p "$CONFIRMATIONS_DIR"
}

# Normalize a task ID: lowercase, hyphens to underscores
_normalize_task() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr '-' '_'
}

# Normalize a check name: lowercase, spaces/special chars to underscores, strip non-alnum
_normalize_check() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | tr -cd 'a-z0-9_'
}

# Build the confirmation file path for a task/check pair
_confirm_path() {
  printf '%s/%s_%s.confirm.json' "$CONFIRMATIONS_DIR" "$(_normalize_task "$1")" "$(_normalize_check "$2")"
}

# Record a visual confirmation for a probabilistic check.
# Usage: edd_confirm <task-id> <check-name> <reviewer> <verdict> [evidence-path]
# verdict: "confirmed" or "rejected"
# Returns: path to confirmation file
edd_confirm() {
  local task_id="$1"
  local check_name="$2"
  local reviewer="$3"
  local verdict="$4"
  local evidence_path="${5:-}"
  _ensure_confirm_dir

  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  local confirm_file
  confirm_file=$(_confirm_path "$task_id" "$check_name")

  jq -cn \
    --arg task_id "$task_id" \
    --arg check_name "$check_name" \
    --arg reviewer "$reviewer" \
    --arg verdict "$verdict" \
    --arg evidence "$evidence_path" \
    --arg ts "$ts" \
    '{
      task_id: $task_id,
      check_name: $check_name,
      reviewer: $reviewer,
      reviewer_type: (if ($reviewer | test("^(claude|agent|bot)"; "i")) then "agent" else "human" end),
      verdict: $verdict,
      evidence_path: $evidence,
      confirmed_at: $ts
    }' > "$confirm_file" 2>/dev/null

  printf '%s' "$confirm_file"
}

# Check if a probabilistic check has been confirmed.
# Usage: if edd_is_confirmed <task-id> <check-name>; then ...
edd_is_confirmed() {
  local task_id="$1"
  local check_name="$2"
  local confirm_file
  confirm_file=$(_confirm_path "$task_id" "$check_name")

  if [ -f "$confirm_file" ]; then
    local verdict
    verdict=$(jq -r '.verdict' "$confirm_file" 2>/dev/null) || verdict=""
    [ "$verdict" = "confirmed" ]
  else
    return 1
  fi
}

# Get all confirmations for a task.
# Usage: edd_get_confirmations <task-id>
# Returns: JSON array of confirmation records
edd_get_confirmations() {
  local task_id="$1"
  _ensure_confirm_dir

  local normalized_task
  normalized_task=$(_normalize_task "$task_id")
  local result="[]"

  for confirm_file in "$CONFIRMATIONS_DIR/${normalized_task}_"*.confirm.json; do
    [ -f "$confirm_file" ] || continue
    local entry
    entry=$(cat "$confirm_file" 2>/dev/null) || continue
    result=$(printf '%s' "$result" | jq -c --argjson e "$entry" '. + [$e]')
  done

  printf '%s' "$result"
}

# Produce evidence for a probabilistic check.
# Captures command output to a file for later review.
# Usage: edd_capture_evidence <task-id> <check-name> <command>
# Returns: path to evidence file
edd_capture_evidence() {
  local task_id="$1"
  local check_name="$2"
  local command="$3"
  _ensure_confirm_dir

  local evidence_file="$CONFIRMATIONS_DIR/$(_normalize_task "$task_id")_$(_normalize_check "$check_name").evidence.txt"

  bash -c "$command" > "$evidence_file" 2>&1 || true
  printf '%s' "$evidence_file"
}
