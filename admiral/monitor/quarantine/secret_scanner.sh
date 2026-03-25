#!/bin/bash
# Admiral Framework — Secret Scanner (SEC-05)
# Pre-write scan detecting API keys, tokens, passwords, private keys,
# and connection strings before they are stored in the Brain.
#
# Usage: source this file, then call scan_secrets "$text"
# Returns: 0 = clean, 1 = secrets detected (JSON result on stdout)
# Target: < 2% false positive rate on legitimate technical content.

# Secret patterns with descriptions
# Format: pattern|description|severity
SECRET_PATTERNS=(
  # API keys
  'sk-[a-zA-Z0-9]{20,}|OpenAI API key|critical'
  'ghp_[a-zA-Z0-9]{36}|GitHub personal access token|critical'
  'gho_[a-zA-Z0-9]{36}|GitHub OAuth token|critical'
  'ghu_[a-zA-Z0-9]{36}|GitHub user token|critical'
  'ghs_[a-zA-Z0-9]{36}|GitHub server token|critical'
  'github_pat_[a-zA-Z0-9_]{82}|GitHub fine-grained PAT|critical'
  'AKIA[0-9A-Z]{16}|AWS access key ID|critical'
  'AIza[0-9A-Za-z_-]{35}|Google API key|critical'
  'xox[bpors]-[0-9a-zA-Z-]{10,}|Slack token|critical'
  'sk_live_[0-9a-zA-Z]{24,}|Stripe live key|critical'
  'rk_live_[0-9a-zA-Z]{24,}|Stripe restricted key|critical'
  'sq0atp-[0-9A-Za-z_-]{22}|Square access token|critical'
  'SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}|SendGrid API key|critical'
  'key-[a-zA-Z0-9]{32}|Generic API key (key- prefix)|high'
  # JWT tokens
  'eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}|JWT token|high'
  # PEM private keys
  '-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----|PEM private key|critical'
  '-----BEGIN CERTIFICATE-----|PEM certificate|medium'
  # Passwords in key-value pairs
  '(password|passwd|pwd|secret|token|api_key|apikey|api-key|access_token|auth_token|private_key)\s*[:=]\s*["\x27][^"\x27]{8,}["\x27]|Password/secret in key-value pair|high'
  # Connection strings with credentials
  '(mysql|postgres|postgresql|mongodb|redis|amqp)://[^:]+:[^@]+@|Database connection string with credentials|critical'
  '(Server|Data Source)=[^;]+;.*(Password|Pwd)=[^;]+|.NET connection string with password|critical'
  # Bearer tokens
  'Bearer\s+[a-zA-Z0-9_-]{20,}|Bearer token|high'
  # SSH keys
  'ssh-(rsa|dss|ed25519|ecdsa)\s+AAAA[a-zA-Z0-9+/=]{40,}|SSH public key (may be intentional)|low'
)

# Scan text for secrets
# Returns: 0 = clean, 1 = secrets found (JSON on stdout)
scan_secrets() {
  local text="$1"
  local matches="[]"
  local found=0

  for entry in "${SECRET_PATTERNS[@]}"; do
    local pattern="${entry%%|*}"
    local rest="${entry#*|}"
    local description="${rest%%|*}"
    local severity="${rest##*|}"

    if printf '%s' "$text" | grep -qE "$pattern" 2>/dev/null; then
      found=1
      matches=$(printf '%s' "$matches" | jq -c \
        --arg pat "$pattern" --arg desc "$description" --arg sev "$severity" \
        '. + [{"pattern": $pat, "description": $desc, "severity": $sev}]')
    fi
  done

  if [ "$found" -eq 1 ]; then
    local match_count
    match_count=$(printf '%s' "$matches" | jq 'length')
    jq -cn \
      --argjson detected true \
      --argjson matches "$matches" \
      --argjson count "$match_count" \
      '{detected: $detected, matches: $matches, match_count: $count, action: "quarantine"}'
    return 1
  fi

  echo '{"detected":false,"matches":[],"match_count":0,"action":"allow"}'
  return 0
}

# Scan a brain entry file before write
# Expects JSON brain entry on stdin or as $1
# Returns: 0 = safe to write, 1 = quarantine required
scan_brain_entry() {
  local content="${1:-$(cat)}"

  # Extract text content from brain entry JSON
  local text
  text=$(printf '%s' "$content" | jq -r '
    [.content, .summary, .title, .description, (.data | tostring)] |
    map(select(. != null and . != "null")) | join("\n")
  ' 2>/dev/null || printf '%s' "$content")

  scan_secrets "$text"
}
