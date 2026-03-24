#!/bin/bash
# Admiral Control Plane — Dependency License Audit (C-08)
# Checks npm dependencies for GPL/copyleft licenses.
# Usage: bash scripts/audit-licenses.sh [--ci]
# Exit: 0=clean, 1=copyleft found
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

CI_MODE=false
[ "${1:-}" = "--ci" ] && CI_MODE=true

BLOCKED_PATTERNS="GPL|AGPL|LGPL|SSPL|EUPL|OSL|CPL|EPL|MPL"
PASS=()
WARN=()
FAIL=()

echo "=== Dependency License Audit ==="
echo ""

cd "$CP_DIR"

# Get all production + dev dependencies with licenses
while IFS= read -r line; do
  line="${line%$'\r'}"
  [ -z "$line" ] && continue

  pkg=$(echo "$line" | cut -d'|' -f1)
  license=$(echo "$line" | cut -d'|' -f2)

  if [ -z "$license" ] || [ "$license" = "null" ] || [ "$license" = "undefined" ]; then
    WARN+=("$pkg: unknown license")
  elif echo "$license" | grep -qEi "$BLOCKED_PATTERNS"; then
    FAIL+=("$pkg: $license (copyleft)")
  else
    PASS+=("$pkg: $license")
  fi
done < <(
  # Extract package name and license from node_modules
  for dir in node_modules/*/; do
    [ -d "$dir" ] || continue
    pkg_name=$(basename "$dir")
    pkg_json="$dir/package.json"
    if [ -f "$pkg_json" ]; then
      license=$(jq -r '.license // "unknown"' "$pkg_json" 2>/dev/null || echo "unknown")
      echo "${pkg_name}|${license}"
    fi
  done
  # Also check scoped packages
  for scope_dir in node_modules/@*/; do
    [ -d "$scope_dir" ] || continue
    for dir in "$scope_dir"*/; do
      [ -d "$dir" ] || continue
      pkg_name=$(echo "$dir" | sed "s|node_modules/||" | sed 's|/$||')
      pkg_json="$dir/package.json"
      if [ -f "$pkg_json" ]; then
        license=$(jq -r '.license // "unknown"' "$pkg_json" 2>/dev/null || echo "unknown")
        echo "${pkg_name}|${license}"
      fi
    done
  done
)

for item in "${PASS[@]}"; do
  echo "  [PASS] $item"
done
for item in "${WARN[@]}"; do
  echo "  [WARN] $item"
done
for item in "${FAIL[@]}"; do
  echo "  [FAIL] $item"
done

echo ""
echo "Approved: ${#PASS[@]}, Unknown: ${#WARN[@]}, Blocked: ${#FAIL[@]}"

if [ ${#FAIL[@]} -gt 0 ]; then
  echo ""
  echo "FAIL: Copyleft dependencies found. Remove or replace them."
  [ "$CI_MODE" = true ] && echo "CI check failed."
  exit 1
fi

if [ ${#WARN[@]} -gt 0 ]; then
  echo ""
  echo "WARNING: ${#WARN[@]} dependencies with unknown licenses. Review manually."
fi

echo ""
echo "PASS: No copyleft dependencies found."
exit 0
