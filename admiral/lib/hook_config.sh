#!/bin/bash
# Admiral Framework — Hook Configuration Library (Q-04)
# Single source of truth for loading admiral/config.json values.
# Eliminates duplicated config loading across hooks and libraries.
#
# All config access goes through this library. Hooks should never
# load admiral/config.json directly — use these functions instead.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source jq helpers if available
if [ -f "$SCRIPT_DIR/jq_helpers.sh" ]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/jq_helpers.sh"
fi

# ─── Config Loading ─────────────────────────────────────────────────

# Cached config content (loaded once per session)
_ADMIRAL_CONFIG=""
_ADMIRAL_CONFIG_LOADED=false

# Get the config file path
_config_path() {
  local project_dir="${CLAUDE_PROJECT_DIR:-${PROJECT_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}}"
  printf '%s/admiral/config.json' "$project_dir"
}

# Load config into cache. Idempotent — only reads file once.
# Usage: _load_config
_load_config() {
  if [ "$_ADMIRAL_CONFIG_LOADED" = "true" ]; then
    return 0
  fi

  local config_path
  config_path=$(_config_path)

  if [ -f "$config_path" ]; then
    _ADMIRAL_CONFIG=$(cat "$config_path" 2>/dev/null) || _ADMIRAL_CONFIG='{}'
    # Validate JSON
    if ! printf '%s' "$_ADMIRAL_CONFIG" | jq empty 2>/dev/null; then
      _ADMIRAL_CONFIG='{}'
    fi
  else
    _ADMIRAL_CONFIG='{}'
  fi

  _ADMIRAL_CONFIG_LOADED=true
}

# Force reload config (for testing or after config changes).
# Usage: config_reload
config_reload() {
  _ADMIRAL_CONFIG_LOADED=false
  _ADMIRAL_CONFIG=""
  _load_config
}

# ─── Config Access ───────────────────────────────────────────────────

# Get a config value by jq path with a default.
# Usage: config_get '.hooks.maxSameError' '3'
# Returns: the config value, or default if missing/null.
config_get() {
  local path="$1"
  local default="${2:-}"
  _load_config
  jq_get "$_ADMIRAL_CONFIG" "$path" "$default"
}

# Get a numeric config value (ensures integer output).
# Usage: config_get_int '.hooks.maxTotalErrors' '10'
config_get_int() {
  local path="$1"
  local default="${2:-0}"
  local val
  val=$(config_get "$path" "$default")
  # Ensure it's a number
  if printf '%s' "$val" | grep -qE '^-?[0-9]+$'; then
    printf '%s' "$val"
  else
    printf '%s' "$default"
  fi
}

# Get a boolean config value.
# Usage: config_get_bool '.detector.spcEnabled' 'true'
config_get_bool() {
  local path="$1"
  local default="${2:-false}"
  local val
  val=$(config_get "$path" "$default")
  case "$val" in
    true|True|TRUE|1) printf 'true' ;;
    false|False|FALSE|0) printf 'false' ;;
    *) printf '%s' "$default" ;;
  esac
}

# ─── Hook-Specific Config Shortcuts ─────────────────────────────────

# Loop detector thresholds
config_max_same_error() { config_get_int '.hooks.maxSameError' '3'; }
config_max_total_errors() { config_get_int '.hooks.maxTotalErrors' '10'; }
config_success_decay() { config_get_int '.hooks.successDecay' '1'; }
config_budget_warning_pct() { config_get_int '.hooks.budgetWarningPct' '90'; }

# Token estimates
config_token_estimate() {
  local tool_name="$1"
  config_get_int ".tokenEstimates.${tool_name}" "$(config_get_int '.tokenEstimates.default' '500')"
}

# Detector settings
config_max_repeated_tool_calls() { config_get_int '.detector.maxRepeatedToolCalls' '5'; }
config_repeat_window_ms() { config_get_int '.detector.repeatWindowMs' '30000'; }
config_spc_enabled() { config_get_bool '.detector.spcEnabled' 'true'; }

# ─── Secret Detection Patterns ──────────────────────────────────────

# Centralized secret detection patterns used by prohibitions_enforcer
# and compliance_ethics_advisor. Defined here so they stay in sync.

# Patterns that indicate secrets in command/content (advisory only)
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

# Patterns that indicate secrets in file content
# shellcheck disable=SC2034
SECRET_CONTENT_PATTERNS='(password|api_key|secret_key|private_key|AWS_ACCESS_KEY|BEGIN RSA|BEGIN OPENSSH)\s*[:=]'

# Sensitive file extensions/names
# shellcheck disable=SC2034
SENSITIVE_FILE_PATTERN='*.env|*credentials*|*secret*|*.pem|*.key'

# Check if content contains potential secrets.
# Usage: if config_has_secrets "$content"; then ...
# Returns: 0 if secrets detected, 1 if clean
config_has_secrets() {
  local content="$1"
  for pattern in "${SECRET_PATTERNS[@]}"; do
    if printf '%s' "$content" | grep -qiE -- "$pattern"; then
      return 0
    fi
  done
  return 1
}

# Check if a file path is a sensitive file type.
# Usage: if config_is_sensitive_path "$filepath"; then ...
# Returns: 0 if sensitive, 1 if not
config_is_sensitive_path() {
  local filepath="$1"
  case "$filepath" in
    *.env|*credentials*|*secret*|*.pem|*.key) return 0 ;;
    *) return 1 ;;
  esac
}
