#!/bin/bash
# Admiral Framework — Handoff Validation (MON-10)
# Validates agent handoffs against aiStrat/handoff/v1.schema.json.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SCHEMA_FILE="$PROJECT_ROOT/aiStrat/handoff/v1.schema.json"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'

validate_handoff() {
  local handoff_file="$1"

  if [ ! -f "$handoff_file" ]; then
    printf "${RED}FAIL:${NC} File not found: %s\n" "$handoff_file"
    return 1
  fi

  if ! jq -e '.' "$handoff_file" > /dev/null 2>&1; then
    printf "${RED}FAIL:${NC} Invalid JSON: %s\n" "$handoff_file"
    return 1
  fi

  local errors=0

  # Check required fields
  for field in from_agent to_agent task deliverable; do
    if ! jq -e ".$field" "$handoff_file" > /dev/null 2>&1; then
      printf "${RED}FAIL:${NC} Missing required field '%s' in %s\n" "$field" "$handoff_file"
      errors=$((errors + 1))
    fi
  done

  # Check from_agent != to_agent
  local from_agent to_agent
  from_agent=$(jq -r '.from_agent // ""' "$handoff_file" 2>/dev/null | tr -d '\r')
  to_agent=$(jq -r '.to_agent // ""' "$handoff_file" 2>/dev/null | tr -d '\r')
  if [ "$from_agent" = "$to_agent" ] && [ -n "$from_agent" ]; then
    printf "${RED}FAIL:${NC} from_agent and to_agent must be different in %s\n" "$handoff_file"
    errors=$((errors + 1))
  fi

  if [ "$errors" -eq 0 ]; then
    printf "${GREEN}PASS:${NC} %s\n" "$handoff_file"
    return 0
  fi

  return 1
}

# CLI: validate a file or all handoff files in a directory
case "${1:-help}" in
  validate)
    if [ -f "${2:-}" ]; then
      validate_handoff "$2"
    elif [ -d "${2:-}" ]; then
      pass=0
      fail=0
      for f in "${2}"/*.json; do
        [ -f "$f" ] || continue
        if validate_handoff "$f"; then
          pass=$((pass + 1))
        else
          fail=$((fail + 1))
        fi
      done
      printf "\n%d passed, %d failed\n" "$pass" "$fail"
      [ "$fail" -gt 0 ] && exit 1
    else
      echo "Usage: handoff-validator.sh validate <file-or-directory>"
      exit 1
    fi
    ;;
  help|--help|-h)
    echo "Handoff Validator (MON-10)"
    echo "Usage: handoff-validator.sh validate <file-or-directory>"
    ;;
esac
