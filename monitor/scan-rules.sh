#!/bin/bash
# Admiral Framework — Custom Scan Rules Runner (MON-05)
# Runs custom scan rules defined as JSON in monitor/rules/.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RULES_DIR="$SCRIPT_DIR/rules"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; NC='\033[0m'

pass=0
fail=0

for rule_file in "$RULES_DIR"/*.json; do
  [ -f "$rule_file" ] || continue

  id=$(jq -r '.id' "$rule_file" 2>/dev/null | tr -d '\r')
  desc=$(jq -r '.description' "$rule_file" 2>/dev/null | tr -d '\r')
  cmd=$(jq -r '.check_command' "$rule_file" 2>/dev/null | tr -d '\r')
  severity=$(jq -r '.severity' "$rule_file" 2>/dev/null | tr -d '\r')

  result=$(bash -c "$cmd" 2>/dev/null | tr -d '\r' || echo "ERROR")

  printf "[%s] %-40s %s → %s\n" "$severity" "$desc" "$id" "$result"
done
