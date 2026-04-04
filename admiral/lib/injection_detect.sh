#!/bin/bash
# Admiral Framework — Injection Detection Patterns (SEC-02, Layer 1)
# Detects prompt injection, command injection, authority-spoofing, and
# adversarial patterns. 70+ regex patterns organized by category.
#
# Usage:
#   source admiral/lib/injection_detect.sh
#   detect_injection "$text"          # Returns: 0=clean, 1=detected
#   detect_injection_json "$text"     # Returns: JSON result on stdout
#
# Performance target: < 10ms per input. False positive rate: < 1%.

# ============================================================
# Pattern categories with severity levels
# Severity: critical, high, medium, low
# ============================================================

# Category 1: Prompt Injection — Role Override (CRITICAL)
PATTERNS_ROLE_OVERRIDE=(
  'ignore (all |any )?(previous|prior|above|earlier) (instructions|directives|rules|prompts|context)'
  'you are now [a-z]+'
  'new instructions:'
  'system prompt:'
  'forget (all |your )?(previous|prior) (context|instructions|rules|identity)'
  'disregard (all |any )?(previous|prior|above) (instructions|rules|directives)'
  'from now on,? (you |your |ignore|always|never)'
  'you must (always|never|now|only)'
  'your (new|real|true|actual) (role|identity|purpose|instructions) (is|are)'
  'act as (if|though)? (you are|an?|the) '
  'pretend (to be|you are|that)'
  'switch to [a-z]+ mode'
  'enter [a-z]+ mode'
  'reset (your|all) (instructions|context|rules|identity)'
)

# Category 2: Authority Spoofing (CRITICAL)
PATTERNS_AUTHORITY_SPOOF=(
  'i am (the |your )?(admin|administrator|root|system|owner|admiral|operator|supervisor)'
  'speaking as (the |your )?(admin|system|root|admiral|operator)'
  'override authority'
  'bypass (all |any )?(security|safety|enforcement|hooks|restrictions|standing orders)'
  'admiral (has )?(approved|authorized|permitted|granted)'
  'fleet-wide directive'
  'system-level permission'
  'override standing order'
  'suspend standing order'
  'emergency override'
  'maintenance mode: (all |full )?access'
  'elevated (privileges|permissions|access)'
  'with admin (rights|permissions|access|privileges)'
)

# Category 3: Standing Order Manipulation (HIGH)
PATTERNS_SO_MANIPULATION=(
  'modify standing order'
  'change standing order'
  'disable (so|standing order)'
  'standing order.*(exception|override|bypass|suspend|ignore)'
  'ignore (so|standing order)[- ]?\d+'
  'so-\d+ (does not|doesn.t) apply'
  'exempt from (so|standing order)'
  'standing orders? (are|is) (not|no longer) (in |)effect'
)

# Category 4: Role Reassignment (HIGH)
PATTERNS_ROLE_REASSIGN=(
  'you are (a|an|the) (senior|lead|chief|principal)'
  'your (authority|decision|permission) (tier|level) is (now |)(autonomous|full|unrestricted)'
  'promote yourself to'
  'grant yourself'
  'assign yourself (the |)(role|permission|authority|access)'
  'change your (role|identity|permissions) to'
  'escalate your own (authority|permissions|tier)'
)

# Category 5: Command Injection (CRITICAL)
PATTERNS_COMMAND_INJECT=(
  '\$\([^)]+\)'
  '`[^`]+`'
  '\|\|.*&&'
  '; *(rm|chmod|chown|wget|curl.*\|.*sh|eval|exec) '
  '\| *(bash|sh|zsh|dash|ksh) '
  'eval\s*\('
  'exec\s*\('
  '\bsource\s+/dev/(tcp|udp)/'
  'python[23]?\s+-c\s+'
  'node\s+-e\s+'
  'perl\s+-e\s+'
)

# Category 6: Data Exfiltration (HIGH)
PATTERNS_EXFILTRATION=(
  'send (this|the|all) (data|content|file|information|secrets?|keys?|tokens?) to'
  'upload .* to (http|ftp|ssh|s3|cloud|remote)'
  'copy .* to (external|remote|public|my )'
  'forward (all |this |the )?(data|content|output|results?) to'
  'exfiltrate'
  'base64 encode .* (and |then )?(send|post|upload|transmit)'
  'post (to|at) https?://'
  'curl.*-d.*\$'
  'wget.*--post-(data|file)'
)

# Category 7: Context Manipulation (MEDIUM)
PATTERNS_CONTEXT_MANIP=(
  'the real instructions are'
  'actually,? (ignore|disregard|forget)'
  'the (above|previous|prior) (was|were|is) (a |just )?(test|example|placeholder)'
  'begin (real|actual|true) (task|instructions|prompt)'
  'end of (system|initial) (prompt|instructions|context)'
  'hidden (instruction|directive|command)'
  '\[system\]'
  '\[admin\]'
  '\[override\]'
  '<system>'
  '</?(system|admin|override|root)>'
)

# Category 8: Token/Identity Manipulation (HIGH)
PATTERNS_TOKEN_MANIP=(
  'set (my |your |the )?(token|identity|session|agent.?id) to'
  'change (my |your |the )?(identity|agent.?id|session) to'
  'forge[d]? (token|identity|credential)'
  'spoof (identity|token|session)'
  'impersonate (agent|user|admin|operator)'
  'use (this|the following) (token|identity|credential)'
)

# Category 9: Brain Poisoning (HIGH)
PATTERNS_BRAIN_POISON=(
  'store (this |the following )?(as|in) (a |)(brain|knowledge|memory) (entry|record)'
  'add (to|into) (the |)(brain|knowledge base)'
  'record that .* is (true|correct|authorized|approved)'
  'remember that .* (can|should|must|is allowed to)'
  'brain entry:.*override'
  'inject .* into (brain|memory|knowledge)'
)

# Category 10: Multi-turn Attack Setup (MEDIUM)
PATTERNS_MULTITURN=(
  'in (the|your) next (response|message|turn),? (you |)(should|must|will|need to)'
  'when (i|someone) (say|says|type|types) .*, (you |)(should|must|will)'
  'set up a (trigger|hook|callback) (for|that|to)'
  'remember this (for|until) later'
  'on my (signal|command|mark)'
)

# All patterns with categories for structured output
declare -A PATTERN_CATEGORY
declare -A PATTERN_SEVERITY

_register_patterns() {
  local category="$1"
  local severity="$2"
  shift 2
  for p in "$@"; do
    PATTERN_CATEGORY["$p"]="$category"
    PATTERN_SEVERITY["$p"]="$severity"
  done
}

_register_patterns "role_override" "critical" "${PATTERNS_ROLE_OVERRIDE[@]}"
_register_patterns "authority_spoof" "critical" "${PATTERNS_AUTHORITY_SPOOF[@]}"
_register_patterns "so_manipulation" "high" "${PATTERNS_SO_MANIPULATION[@]}"
_register_patterns "role_reassign" "high" "${PATTERNS_ROLE_REASSIGN[@]}"
_register_patterns "command_injection" "critical" "${PATTERNS_COMMAND_INJECT[@]}"
_register_patterns "exfiltration" "high" "${PATTERNS_EXFILTRATION[@]}"
_register_patterns "context_manipulation" "medium" "${PATTERNS_CONTEXT_MANIP[@]}"
_register_patterns "token_manipulation" "high" "${PATTERNS_TOKEN_MANIP[@]}"
_register_patterns "brain_poisoning" "high" "${PATTERNS_BRAIN_POISON[@]}"
_register_patterns "multi_turn" "medium" "${PATTERNS_MULTITURN[@]}"

# All patterns in a single flat array for fast iteration
ALL_PATTERNS=(
  "${PATTERNS_ROLE_OVERRIDE[@]}"
  "${PATTERNS_AUTHORITY_SPOOF[@]}"
  "${PATTERNS_SO_MANIPULATION[@]}"
  "${PATTERNS_ROLE_REASSIGN[@]}"
  "${PATTERNS_COMMAND_INJECT[@]}"
  "${PATTERNS_EXFILTRATION[@]}"
  "${PATTERNS_CONTEXT_MANIP[@]}"
  "${PATTERNS_TOKEN_MANIP[@]}"
  "${PATTERNS_BRAIN_POISON[@]}"
  "${PATTERNS_MULTITURN[@]}"
)

# Legacy API: simple detection
# Returns: 0 = clean, 1 = injection detected (pattern on stdout)
detect_injection() {
  local text="$1"
  local lower_text
  lower_text=$(printf '%s' "$text" | tr '[:upper:]' '[:lower:]')

  for pattern in "${ALL_PATTERNS[@]}"; do
    if printf '%s' "$lower_text" | grep -qEi "$pattern" 2>/dev/null; then
      echo "Injection detected: pattern='$pattern'"
      return 1
    fi
  done

  return 0
}

# Enhanced API: structured JSON detection result (SEC-02)
# Returns JSON on stdout: {"detected": bool, "matches": [...], "severity": "...", "scan_ms": N}
detect_injection_json() {
  local text="$1"
  local start_ms
  start_ms=$(($(date +%s%N 2>/dev/null || echo "0") / 1000000))

  local lower_text
  lower_text=$(printf '%s' "$text" | tr '[:upper:]' '[:lower:]')

  local matches="[]"
  local max_severity="none"
  local severity_order="none low medium high critical"

  for pattern in "${ALL_PATTERNS[@]}"; do
    if printf '%s' "$lower_text" | grep -qEi "$pattern" 2>/dev/null; then
      local cat="${PATTERN_CATEGORY[$pattern]:-unknown}"
      local sev="${PATTERN_SEVERITY[$pattern]:-medium}"

      matches=$(printf '%s' "$matches" | jq -c \
        --arg pat "$pattern" --arg cat "$cat" --arg sev "$sev" \
        '. + [{"pattern": $pat, "category": $cat, "severity": $sev}]')

      # Track highest severity
      local cur_idx=0 new_idx=0
      local i=0
      for s in $severity_order; do
        if [ "$s" = "$max_severity" ]; then cur_idx=$i; fi
        if [ "$s" = "$sev" ]; then new_idx=$i; fi
        i=$((i + 1))
      done
      if [ "$new_idx" -gt "$cur_idx" ]; then
        max_severity="$sev"
      fi
    fi
  done

  local end_ms
  end_ms=$(($(date +%s%N 2>/dev/null || echo "0") / 1000000))
  local elapsed=$((end_ms - start_ms))
  # Fallback if date +%N not available
  if [ "$elapsed" -lt 0 ] || [ "$elapsed" -gt 60000 ]; then
    elapsed=0
  fi

  local detected="false"
  local match_count
  match_count=$(printf '%s' "$matches" | jq 'length')
  if [ "$match_count" -gt 0 ]; then
    detected="true"
  fi

  jq -cn \
    --argjson detected "$detected" \
    --argjson matches "$matches" \
    --arg severity "$max_severity" \
    --argjson scan_ms "$elapsed" \
    '{detected: $detected, matches: $matches, severity: $severity, match_count: ($matches | length), scan_ms: $scan_ms}'
}
