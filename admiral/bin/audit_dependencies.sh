#!/bin/bash
# Admiral Framework — Dependency Vulnerability Scanner (SEC-08)
# Runs npm audit, produces structured JSON report, blocks on critical/high.
# Exit codes: 0 = clean, 1 = vulnerabilities found at or above threshold
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUDIT_LEVEL="${AUDIT_LEVEL:-high}"
REPORT_FILE="${REPORT_FILE:-audit-report.json}"

echo "=== Dependency Security Audit ==="
echo "Threshold: $AUDIT_LEVEL"
echo ""

# Run npm audit in JSON format
AUDIT_JSON=""
AUDIT_EXIT=0
AUDIT_JSON=$(npm audit --json 2>/dev/null) || AUDIT_EXIT=$?

# Parse the audit results
TOTAL_VULNS=$(printf '%s' "$AUDIT_JSON" | jq '.metadata.vulnerabilities | to_entries | map(.value) | add // 0' 2>/dev/null) || TOTAL_VULNS=0
CRITICAL=$(printf '%s' "$AUDIT_JSON" | jq '.metadata.vulnerabilities.critical // 0' 2>/dev/null) || CRITICAL=0
HIGH=$(printf '%s' "$AUDIT_JSON" | jq '.metadata.vulnerabilities.high // 0' 2>/dev/null) || HIGH=0
MODERATE=$(printf '%s' "$AUDIT_JSON" | jq '.metadata.vulnerabilities.moderate // 0' 2>/dev/null) || MODERATE=0
LOW=$(printf '%s' "$AUDIT_JSON" | jq '.metadata.vulnerabilities.low // 0' 2>/dev/null) || LOW=0
INFO=$(printf '%s' "$AUDIT_JSON" | jq '.metadata.vulnerabilities.info // 0' 2>/dev/null) || INFO=0
TOTAL_DEPS=$(printf '%s' "$AUDIT_JSON" | jq '.metadata.totalDependencies // 0' 2>/dev/null) || TOTAL_DEPS=0

# Extract affected packages
AFFECTED_PACKAGES=$(printf '%s' "$AUDIT_JSON" | jq '[
  .vulnerabilities // {} | to_entries[] | {
    package: .key,
    severity: .value.severity,
    via: [.value.via[]? | if type == "string" then . else .title end],
    range: .value.range,
    fix_available: (.value.fixAvailable | if type == "boolean" then . elif type == "object" then true else false end)
  }
] | sort_by(.severity) | reverse' 2>/dev/null) || AFFECTED_PACKAGES="[]"

# Build structured report
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
REPORT=$(jq -cn \
  --arg ts "$TIMESTAMP" \
  --arg level "$AUDIT_LEVEL" \
  --argjson critical "$CRITICAL" \
  --argjson high "$HIGH" \
  --argjson moderate "$MODERATE" \
  --argjson low "$LOW" \
  --argjson info "$INFO" \
  --argjson total "$TOTAL_VULNS" \
  --argjson deps "$TOTAL_DEPS" \
  --argjson packages "$AFFECTED_PACKAGES" \
  '{
    timestamp: $ts,
    audit_level: $level,
    total_dependencies: $deps,
    vulnerabilities: {
      total: $total,
      critical: $critical,
      high: $high,
      moderate: $moderate,
      low: $low,
      info: $info
    },
    affected_packages: $packages,
    blocking: (
      if $level == "critical" then ($critical > 0)
      elif $level == "high" then ($critical > 0 or $high > 0)
      elif $level == "moderate" then ($critical > 0 or $high > 0 or $moderate > 0)
      else ($total > 0)
      end
    )
  }')

# Write report
printf '%s\n' "$REPORT" | jq '.' > "$REPORT_FILE"
echo "Report written to $REPORT_FILE"
echo ""

# Display summary
echo "--- Summary ---"
echo "  Total dependencies: $TOTAL_DEPS"
echo "  Critical: $CRITICAL"
echo "  High:     $HIGH"
echo "  Moderate: $MODERATE"
echo "  Low:      $LOW"
echo "  Info:     $INFO"
echo ""

# Determine if we should block
BLOCKING=$(printf '%s' "$REPORT" | jq -r '.blocking')

if [ "$BLOCKING" = "true" ]; then
  echo "BLOCKED: Vulnerabilities found at or above '$AUDIT_LEVEL' severity."
  echo ""
  echo "Affected packages:"
  printf '%s' "$AFFECTED_PACKAGES" | jq -r '.[] | select(.severity == "critical" or .severity == "high") | "  \(.severity | ascii_upcase): \(.package) — \(.via | join(", "))"'
  echo ""
  echo "Run 'npm audit fix' to attempt automatic fixes."
  exit 1
else
  echo "CLEAN: No vulnerabilities at or above '$AUDIT_LEVEL' severity."
  exit 0
fi
