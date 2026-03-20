#!/bin/bash
# validate_llm_last.sh — Verify the LLM-Last boundary is defined.
#
# Usage: validate_llm_last.sh <ground-truth.yaml>
#
# Checks that the boundaries.llm_last section exists and has at least one
# entry in both deterministic and llm_judgment lists. Part 1 calls this
# "the single highest-impact cost and reliability lever in fleet operations."
#
# Exit codes: 0=LLM-Last defined, 1=missing or incomplete, 2=file error
# Spec ref: Part 1 — Boundaries (LLM-Last Boundary)

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: validate_llm_last.sh <ground-truth.yaml>" >&2
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

python3 << PYEOF
import yaml
import sys

with open("${GT_FILE}") as f:
    doc = yaml.safe_load(f)

boundaries = doc.get("boundaries", {})
llm_last = boundaries.get("llm_last", {})

if not llm_last:
    print("=== LLM-Last Boundary Check ===")
    print("  MISSING: No llm_last section in boundaries.")
    print()
    print("RESULT: WARNING — LLM-Last boundary not defined.")
    print("Part 1: 'If a static tool can do it, the LLM should not.'")
    print()
    print("Reference patterns:")
    print("  Deterministic: formatting, linting, import sorting, dead code detection, test execution")
    print("  LLM judgment: architecture decisions, code review for logic, complex refactors, debugging")
    sys.exit(1)

det = llm_last.get("deterministic", [])
llm = llm_last.get("llm_judgment", [])

det_items = [x for x in (det or []) if x and str(x).strip()]
llm_items = [x for x in (llm or []) if x and str(x).strip()]

print("=== LLM-Last Boundary Check ===")

issues = []
if not det_items:
    print("  MISSING: deterministic list (what static tools handle)")
    issues.append("deterministic")
else:
    print(f"  PRESENT: deterministic ({len(det_items)} item(s))")
    for item in det_items:
        print(f"    - {item}")

if not llm_items:
    print("  MISSING: llm_judgment list (what requires LLM)")
    issues.append("llm_judgment")
else:
    print(f"  PRESENT: llm_judgment ({len(llm_items)} item(s))")
    for item in llm_items:
        print(f"    - {item}")

print()
if issues:
    print(f"RESULT: INCOMPLETE — {len(issues)} LLM-Last category(ies) missing.")
    sys.exit(1)
else:
    print("RESULT: DEFINED — LLM-Last boundary is documented.")
    sys.exit(0)
PYEOF
