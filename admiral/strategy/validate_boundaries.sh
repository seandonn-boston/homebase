#!/bin/bash
# validate_boundaries.sh — Validate that all Boundary categories are addressed.
#
# Usage: validate_boundaries.sh <ground-truth.yaml>
#
# Checks every Boundary category from Part 1:
#   Non-Goals: functional, quality, architectural
#   Hard Constraints: tech_stack, deadlines, compatibility, regulatory, protocol_scope
#   Resource Budgets: token_budget, time_budget, tool_call_limits, scope_boundary, quality_floor
#   LLM-Last: deterministic, llm_judgment
#
# Each category is reported as: present, intentionally N/A, or missing.
# "Intentionally N/A" = array containing a single item starting with "N/A:".
#
# Exit codes: 0=all categories addressed, 1=missing categories, 2=file error
# Spec ref: Part 1 — Boundaries ("the single most effective tool against agent drift")
# SO ref: SO-15 (Pre-Work Validation)

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: validate_boundaries.sh <ground-truth.yaml>" >&2
  exit 2
fi

GT_FILE="$1"

if [[ ! -f "${GT_FILE}" ]]; then
  echo "ERROR: File not found: ${GT_FILE}" >&2
  exit 2
fi

if ! python3 -c "import yaml" 2>/dev/null; then
  echo "ERROR: python3 with PyYAML required." >&2
  exit 2
fi

# Use python to do the full analysis in one pass
python3 << PYEOF
import yaml
import sys

with open("${GT_FILE}") as f:
    doc = yaml.safe_load(f)

boundaries = doc.get("boundaries", {})
if not boundaries:
    print("ERROR: No 'boundaries' section found in document.")
    sys.exit(2)

# Category definitions: (path_parts, label, required)
categories = [
    # Non-Goals
    (["non_goals", "functional"], "Non-Goals / Functional", True),
    (["non_goals", "quality"], "Non-Goals / Quality", False),
    (["non_goals", "architectural"], "Non-Goals / Architectural", False),
    # Hard Constraints
    (["hard_constraints", "tech_stack"], "Hard Constraints / Tech Stack", True),
    (["hard_constraints", "deadlines"], "Hard Constraints / Deadlines", False),
    (["hard_constraints", "compatibility"], "Hard Constraints / Compatibility", False),
    (["hard_constraints", "regulatory"], "Hard Constraints / Regulatory", False),
    (["hard_constraints", "protocol_scope"], "Hard Constraints / Protocol Scope", False),
    # Resource Budgets
    (["resource_budgets", "token_budget"], "Resource Budgets / Token Budget", True),
    (["resource_budgets", "time_budget"], "Resource Budgets / Time Budget", False),
    (["resource_budgets", "tool_call_limits"], "Resource Budgets / Tool Call Limits", False),
    (["resource_budgets", "scope_boundary"], "Resource Budgets / Scope Boundary", True),
    (["resource_budgets", "quality_floor"], "Resource Budgets / Quality Floor", True),
    # LLM-Last
    (["llm_last", "deterministic"], "LLM-Last / Deterministic", False),
    (["llm_last", "llm_judgment"], "LLM-Last / LLM Judgment", False),
]

present = 0
na = 0
missing_required = 0
missing_optional = 0

print("=== Boundaries Checklist ===")
print()

for path_parts, label, required in categories:
    val = boundaries
    for p in path_parts:
        if isinstance(val, dict):
            val = val.get(p)
        else:
            val = None
            break

    if val is None or val == "" or val == []:
        if required:
            print(f"  MISSING (required): {label}")
            missing_required += 1
        else:
            print(f"  MISSING (optional): {label}")
            missing_optional += 1
    elif isinstance(val, list) and len(val) == 1 and isinstance(val[0], str) and val[0].startswith("N/A:"):
        print(f"  N/A:     {label} — {val[0]}")
        na += 1
    elif isinstance(val, list):
        non_empty = [x for x in val if x and str(x).strip()]
        if non_empty:
            print(f"  PRESENT: {label} ({len(non_empty)} item(s))")
            present += 1
        elif required:
            print(f"  MISSING (required): {label}")
            missing_required += 1
        else:
            print(f"  MISSING (optional): {label}")
            missing_optional += 1
    elif isinstance(val, str) and val.strip():
        print(f"  PRESENT: {label}")
        present += 1
    elif required:
        print(f"  MISSING (required): {label}")
        missing_required += 1
    else:
        print(f"  MISSING (optional): {label}")
        missing_optional += 1

print()
print("=== Summary ===")
print(f"Present: {present}  Intentionally N/A: {na}  Missing required: {missing_required}  Missing optional: {missing_optional}")

if missing_required > 0:
    print()
    print(f"RESULT: INCOMPLETE — {missing_required} required boundary category(ies) not addressed.")
    print("A project with missing required boundary categories cannot be Ready.")
    sys.exit(1)
else:
    print()
    print("RESULT: COMPLETE — All required boundary categories are addressed.")
    if missing_optional > 0:
        print(f"NOTE: {missing_optional} optional category(ies) not addressed. Consider filling them in or marking N/A.")
    sys.exit(0)
PYEOF
