#!/bin/bash
# validate_task_criteria.sh — Validate task acceptance criteria before dispatch.
#
# Usage: validate_task_criteria.sh <task-criteria.yaml>
#
# Rejects tasks missing required fields: task, functional, verification.
#
# Exit codes: 0=valid, 1=invalid, 2=file error
# Spec ref: Part 1 — Success Criteria (Task Acceptance Criteria template)

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: validate_task_criteria.sh <task-criteria.yaml>" >&2
  exit 2
fi

CRITERIA_FILE="$1"

if [[ ! -f "${CRITERIA_FILE}" ]]; then
  echo "ERROR: File not found: ${CRITERIA_FILE}" >&2
  exit 2
fi

if ! python3 -c "import yaml" 2>/dev/null; then
  echo "ERROR: python3 with PyYAML required." >&2
  exit 2
fi

python3 << PYEOF
import yaml
import sys

with open("${CRITERIA_FILE}") as f:
    doc = yaml.safe_load(f)

if not doc or not isinstance(doc, dict):
    print("ERROR: Invalid task criteria document.")
    sys.exit(2)

errors = []
warnings = []

# Required fields
required = {
    "task": "Task identifier",
    "functional": "Functional criteria (testable behaviors)",
    "verification": "Verification level (Self-Check | Peer Review | Admiral Review)",
}

for field, label in required.items():
    val = doc.get(field)
    if val is None or val == "" or val == []:
        errors.append(f"MISSING (required): {label} [{field}]")
    elif isinstance(val, list):
        non_empty = [x for x in val if x and str(x).strip()]
        if not non_empty:
            errors.append(f"EMPTY (required): {label} [{field}]")

# Verify verification level is valid
ver = doc.get("verification", "")
if ver and ver not in ("Self-Check", "Peer Review", "Admiral Review", ""):
    warnings.append(f"UNKNOWN verification level: '{ver}'. Expected: Self-Check | Peer Review | Admiral Review")

# Optional fields
optional = {
    "quality": "Quality criteria",
    "completeness": "Completeness criteria",
    "negative": "Negative criteria",
    "failure_guidance": "Failure guidance",
    "judgment_boundaries": "Judgment boundaries",
}

for field, label in optional.items():
    val = doc.get(field)
    if val is None or val == "" or val == []:
        warnings.append(f"EMPTY (optional): {label} [{field}]")
    elif isinstance(val, list):
        non_empty = [x for x in val if x and str(x).strip()]
        if not non_empty:
            warnings.append(f"EMPTY (optional): {label} [{field}]")

print("=== Task Criteria Validation ===")
print(f"File: ${CRITERIA_FILE}")
print()

for e in errors:
    print(f"  {e}")
for w in warnings:
    print(f"  {w}")

print()
if errors:
    print(f"RESULT: REJECTED — {len(errors)} required field(s) missing or empty.")
    print("Task cannot be dispatched without required criteria.")
    sys.exit(1)
else:
    print("RESULT: ACCEPTED — All required fields present.")
    if warnings:
        print(f"NOTE: {len(warnings)} optional field(s) empty.")
    sys.exit(0)
PYEOF
