#!/usr/bin/env bash
# admiral/lib/hook_config.sh — Hook project directory and path resolution
#
# Provides project directory detection and standard path resolution
# for all hooks. Config value reading is handled by jq_helpers.sh.
#
# Functions:
#   init_project_dir    — Detect and export PROJECT_DIR
#   get_admiral_path    — Resolve standard .admiral/ paths
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
