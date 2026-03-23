#!/usr/bin/env bash
# admiral/lib/hook_config.sh — Shared hook configuration loading
#
# Consolidates config file access, project dir detection, secret
# detection, and standard path resolution used across all hooks.
#
# Functions:
#   init_project_dir    — Detect and export PROJECT_DIR
#   get_admiral_path    — Resolve standard .admiral/ paths
#   load_hook_config    — Read config value with fallback
#   detect_secrets      — Check string for secret/credential patterns
#   get_config_file     — Return path to admiral/config.json

set -euo pipefail

# Detect PROJECT_DIR from environment or script location.
# Usage: init_project_dir [optional_payload_json]
#   If payload contains .session_state.project_dir, uses that.
#   Otherwise falls back to CLAUDE_PROJECT_DIR env or script-relative path.
init_project_dir() {
  local payload="${1:-}"
  local dir=""

  # Try extracting from payload first
  if [ -n "$payload" ]; then
    dir=$(echo "$payload" | jq -r '.session_state.project_dir // ""' 2>/dev/null) || true
  fi

  # Fall back to env or script-relative path
  if [ -z "$dir" ]; then
    if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
      dir="$CLAUDE_PROJECT_DIR"
    elif [ -n "${BASH_SOURCE[1]:-}" ]; then
      dir="$(cd "$(dirname "${BASH_SOURCE[1]}")/.." && pwd)"
    else
      dir="$(pwd)"
    fi
  fi

  PROJECT_DIR="$dir"
  export PROJECT_DIR
  export CLAUDE_PROJECT_DIR="$PROJECT_DIR"
}

# Return a standard path under .admiral/ directory.
# Usage: get_admiral_path "event_log.jsonl"
# Known paths: event_log.jsonl, session_state.json, hook_errors.log
get_admiral_path() {
  local filename="$1"
  echo "${PROJECT_DIR:-.}/.admiral/$filename"
}

# Return path to the central config file.
get_config_file() {
  echo "${PROJECT_DIR:-.}/admiral/config.json"
}

# Read a config value from admiral/config.json with fallback.
# Usage: load_hook_config '.hooks.maxSameError' '3'
load_hook_config() {
  local field="$1"
  local default="${2:-}"
  local config_file
  config_file=$(get_config_file)

  if [ -f "$config_file" ]; then
    local val
    val=$(jq -r "${field} // \"${default}\"" "$config_file" 2>/dev/null) || val="$default"
    if [ -z "$val" ] || [ "$val" = "null" ]; then
      echo "$default"
    else
      echo "$val"
    fi
  else
    echo "$default"
  fi
}

# Secret/credential patterns used for detection.
SECRET_PATTERNS=(
  'password\s*='
  'api_key\s*='
  'secret\s*='
  'token\s*='
  'AWS_ACCESS_KEY'
  'PRIVATE_KEY'
  'BEGIN RSA'
  'BEGIN OPENSSH'
  'BEGIN PGP'
)

# Check if a string contains secret/credential patterns.
# Returns 0 if secrets detected, 1 if clean.
# Usage: if detect_secrets "$text"; then echo "found secrets"; fi
detect_secrets() {
  local text="$1"
  for pattern in "${SECRET_PATTERNS[@]}"; do
    if echo "$text" | grep -qiE -- "$pattern" 2>/dev/null; then
      return 0
    fi
  done
  return 1
}
