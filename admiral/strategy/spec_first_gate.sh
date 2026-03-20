#!/bin/bash
# spec_first_gate.sh — Enforce the Spec-First Pipeline from Part 1.
#
# Usage: spec_first_gate.sh <ground-truth.yaml> <pipeline_manifest.yaml>
#
# Reads the pipeline_entry field from Ground Truth and verifies that all
# upstream pipeline stage documents exist. The Spec-First Pipeline is:
#   Mission → Requirements → Design → Tasks → Implementation
#
# If pipeline_entry is "tasks", then Requirements and Design must exist.
# If pipeline_entry is "implementation", then Requirements, Design, and
# Task decomposition must exist.
#
# Exit codes: 0=pipeline satisfied, 1=missing upstream artifacts, 2=usage error
# Spec ref: Part 1 — Spec-First Pipeline

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: spec_first_gate.sh <ground-truth.yaml> <pipeline_manifest.yaml>" >&2
  exit 2
fi

GT_FILE="$1"
MANIFEST_FILE="$2"

for f in "${GT_FILE}" "${MANIFEST_FILE}"; do
  if [[ ! -f "${f}" ]]; then
    echo "ERROR: File not found: ${f}" >&2
    exit 2
  fi
done

if ! python3 -c "import yaml" 2>/dev/null; then
  echo "ERROR: python3 with PyYAML required." >&2
  exit 2
fi

python3 << PYEOF
import yaml
import sys
import os

with open("${GT_FILE}") as f:
    gt = yaml.safe_load(f)

with open("${MANIFEST_FILE}") as f:
    manifest = yaml.safe_load(f)

pipeline_entry = (gt.get("mission", {}).get("pipeline_entry") or "").lower()
if not pipeline_entry:
    print("WARNING: No pipeline_entry defined in Ground Truth. Skipping pipeline check.")
    sys.exit(0)

# Pipeline stages in order
stages = ["requirements", "design", "tasks", "implementation"]

if pipeline_entry not in stages:
    print(f"ERROR: Unknown pipeline_entry '{pipeline_entry}'. Expected one of: {', '.join(stages)}")
    sys.exit(2)

entry_idx = stages.index(pipeline_entry)
# All stages before the entry point must have artifacts
upstream_stages = stages[:entry_idx]

if not upstream_stages:
    print(f"Pipeline entry: {pipeline_entry} (first stage — no upstream artifacts required)")
    sys.exit(0)

print(f"Pipeline entry: {pipeline_entry}")
print(f"Required upstream stages: {', '.join(upstream_stages)}")
print()

# Resolve artifact paths relative to the ground truth file
gt_dir = os.path.dirname(os.path.abspath("${GT_FILE}"))
stage_artifacts = manifest.get("stages", {})

missing = []
for stage in upstream_stages:
    artifacts = stage_artifacts.get(stage, [])
    if not artifacts:
        print(f"  WARNING: No artifacts defined for stage '{stage}' in manifest.")
        missing.append(f"{stage} (no artifacts defined in manifest)")
        continue

    for artifact in artifacts:
        path = artifact if os.path.isabs(artifact) else os.path.join(gt_dir, artifact)
        if os.path.exists(path):
            print(f"  PRESENT: {stage} — {artifact}")
        else:
            print(f"  MISSING: {stage} — {artifact}")
            missing.append(f"{stage}: {artifact}")

print()
if missing:
    print(f"RESULT: BLOCKED — {len(missing)} upstream artifact(s) missing.")
    print(f"Pipeline entry is '{pipeline_entry}' but upstream stages are incomplete.")
    for m in missing:
        print(f"  - {m}")
    sys.exit(1)
else:
    print("RESULT: PASS — All upstream pipeline artifacts exist.")
    sys.exit(0)
PYEOF
