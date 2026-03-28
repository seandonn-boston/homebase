#!/bin/bash
# Admiral Framework — SBOM Generator (SEC-09)
# Generates a Software Bill of Materials in CycloneDX JSON format.
# Covers npm dependencies (all workspace projects) and system dependencies.
# Exit codes: 0 = SBOM generated, 1 = error
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

OUTPUT_FILE="${SBOM_OUTPUT:-sbom.cdx.json}"
SBOM_FORMAT="${SBOM_FORMAT:-cyclonedx}"

# CycloneDX spec version
SPEC_VERSION="1.5"

echo "=== SBOM Generation (SEC-09) ==="
echo "Format: $SBOM_FORMAT"
echo "Output: $OUTPUT_FILE"
echo ""

# ─── Collect npm dependencies ──────────────────────────────────────

NPM_PROJECTS=("control-plane" "platform" "fleet" "mcp-server" "admiral")
COMPONENTS="[]"

for project in "${NPM_PROJECTS[@]}"; do
  PKG_FILE="$PROJECT_ROOT/$project/package.json"
  if [ ! -f "$PKG_FILE" ]; then
    echo "  [skip] $project — no package.json"
    continue
  fi

  echo "  [scan] $project"

  # Extract dependencies and devDependencies
  DEPS=$(jq -r '
    [
      (.dependencies // {} | to_entries[] | {name: .key, version: .value, scope: "required"}),
      (.devDependencies // {} | to_entries[] | {name: .key, version: .value, scope: "optional"})
    ]' "$PKG_FILE" 2>/dev/null) || DEPS="[]"

  # Convert to CycloneDX component format
  PROJECT_COMPONENTS=$(printf '%s' "$DEPS" | jq --arg group "$project" '[
    .[] | {
      type: "library",
      group: $group,
      name: .name,
      version: (.version | gsub("[^0-9.]"; "")),
      scope: .scope,
      purl: ("pkg:npm/" + .name + "@" + (.version | gsub("[^0-9.]"; ""))),
      "bom-ref": ($group + ":" + .name + "@" + (.version | gsub("[^0-9.]"; "")))
    }
  ]' 2>/dev/null) || PROJECT_COMPONENTS="[]"

  COMPONENTS=$(printf '%s\n%s' "$COMPONENTS" "$PROJECT_COMPONENTS" | jq -s 'add')
done

# ─── Collect transitive dependencies via npm ls ────────────────────

for project in "${NPM_PROJECTS[@]}"; do
  LOCK_FILE="$PROJECT_ROOT/$project/package-lock.json"
  if [ ! -f "$LOCK_FILE" ]; then
    continue
  fi

  echo "  [deep] $project — extracting transitive deps from lockfile"

  TRANSITIVE=$(jq '[
    .packages // {} | to_entries[] |
    select(.key != "" and .key != null) |
    (.key | split("node_modules/") | last) as $name |
    select($name != "") |
    {
      type: "library",
      group: "'"$project"'",
      name: $name,
      version: (.value.version // "unknown"),
      scope: (if .value.dev then "optional" else "required" end),
      purl: ("pkg:npm/" + $name + "@" + (.value.version // "unknown")),
      "bom-ref": ("'"$project"':transitive:" + $name + "@" + (.value.version // "unknown"))
    }
  ] | unique_by(.name)' "$LOCK_FILE" 2>/dev/null) || TRANSITIVE="[]"

  COMPONENTS=$(printf '%s\n%s' "$COMPONENTS" "$TRANSITIVE" | jq -s 'add | unique_by(."bom-ref")')
done

# ─── Collect system dependencies ───────────────────────────────────

echo "  [scan] system dependencies"

SYSTEM_DEPS=("bash" "jq" "curl" "git" "node" "npm" "shellcheck" "sqlite3")
SYSTEM_COMPONENTS="[]"

for dep in "${SYSTEM_DEPS[@]}"; do
  VERSION="unknown"
  if command -v "$dep" > /dev/null 2>&1; then
    case "$dep" in
      bash)      VERSION=$(bash --version 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1) || VERSION="unknown" ;;
      jq)        VERSION=$(jq --version 2>/dev/null | grep -oE '[0-9]+\.[0-9.]+' | head -1) || VERSION="unknown" ;;
      curl)      VERSION=$(curl --version 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1) || VERSION="unknown" ;;
      git)       VERSION=$(git --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1) || VERSION="unknown" ;;
      node)      VERSION=$(node --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1) || VERSION="unknown" ;;
      npm)       VERSION=$(npm --version 2>/dev/null | head -1) || VERSION="unknown" ;;
      shellcheck) VERSION=$(shellcheck --version 2>/dev/null | grep '^version:' | grep -oE '[0-9]+\.[0-9]+\.[0-9]+') || VERSION="unknown" ;;
      sqlite3)   VERSION=$(sqlite3 --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1) || VERSION="unknown" ;;
    esac
    STATUS="installed"
  else
    STATUS="not-found"
  fi

  SYSTEM_COMPONENTS=$(printf '%s' "$SYSTEM_COMPONENTS" | jq --arg name "$dep" --arg ver "$VERSION" --arg status "$STATUS" '. + [{
    type: "application",
    group: "system",
    name: $name,
    version: $ver,
    scope: "required",
    purl: ("pkg:generic/" + $name + "@" + $ver),
    "bom-ref": ("system:" + $name + "@" + $ver),
    properties: [{name: "install-status", value: $status}]
  }]')
done

COMPONENTS=$(printf '%s\n%s' "$COMPONENTS" "$SYSTEM_COMPONENTS" | jq -s 'add | unique_by(."bom-ref")')

# ─── Count statistics ──────────────────────────────────────────────

TOTAL_COMPONENTS=$(printf '%s' "$COMPONENTS" | jq 'length')
NPM_COUNT=$(printf '%s' "$COMPONENTS" | jq '[.[] | select(.type == "library")] | length')
SYSTEM_COUNT=$(printf '%s' "$COMPONENTS" | jq '[.[] | select(.type == "application")] | length')

# ─── Build CycloneDX SBOM document ────────────────────────────────

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
SERIAL="urn:uuid:$(cat /proc/sys/kernel/random/uuid 2>/dev/null || python3 -c 'import uuid; print(uuid.uuid4())' 2>/dev/null || echo "00000000-0000-0000-0000-000000000000")"

SBOM=$(jq -cn \
  --arg spec "$SPEC_VERSION" \
  --arg serial "$SERIAL" \
  --arg ts "$TIMESTAMP" \
  --argjson components "$COMPONENTS" \
  '{
    "$schema": "http://cyclonedx.org/schema/bom-1.5.schema.json",
    bomFormat: "CycloneDX",
    specVersion: $spec,
    serialNumber: $serial,
    version: 1,
    metadata: {
      timestamp: $ts,
      tools: [{
        vendor: "Admiral Framework",
        name: "generate_sbom.sh",
        version: "1.0.0"
      }],
      component: {
        type: "application",
        name: "helm",
        version: "0.0.0",
        description: "Admiral Framework — AI Agent Governance Platform"
      }
    },
    components: $components
  }')

# Write SBOM
printf '%s\n' "$SBOM" | jq '.' > "$OUTPUT_FILE"

echo ""
echo "--- Summary ---"
echo "  Total components: $TOTAL_COMPONENTS"
echo "  npm packages:     $NPM_COUNT"
echo "  System deps:      $SYSTEM_COUNT"
echo "  Format:           CycloneDX $SPEC_VERSION"
echo "  Output:           $OUTPUT_FILE"
echo ""

# Validate the output
if jq empty "$OUTPUT_FILE" 2>/dev/null; then
  echo "SBOM generated successfully."
  exit 0
else
  echo "ERROR: Generated SBOM is not valid JSON."
  exit 1
fi
