#!/usr/bin/env bash
# Admiral AI Landscape Monitor — Scanner
# Scans the AI ecosystem for releases, trending repos, and notable changes.
# Designed to run in GitHub Actions with gh CLI available.
#
# Usage: ./scanner.sh [scan_type] [--dry-run]
#   scan_type: full | models | patterns | releases | discover (default: full)
#   --dry-run: preview without writing state or creating issues

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MONITOR_DIR="$SCRIPT_DIR"
STATE_FILE="$MONITOR_DIR/state.json"
DIGESTS_DIR="$MONITOR_DIR/digests"

SCAN_TYPE="${1:-full}"
DRY_RUN=false
if [[ "${2:-}" == "--dry-run" ]] || [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  if [[ "${1:-}" == "--dry-run" ]]; then SCAN_TYPE="full"; fi
fi

TODAY=$(date -u +%Y-%m-%d)
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
SCAN_START=$(date -u +%s)

# Digest file path
if [[ "$SCAN_TYPE" == "discover" ]]; then
  DIGEST_FILE="$DIGESTS_DIR/${TODAY}-weekly.md"
else
  DIGEST_FILE="$DIGESTS_DIR/${TODAY}.md"
fi

# Temporary workspace
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# Findings accumulators
FINDINGS_HIGH="$WORK_DIR/findings_high.md"
FINDINGS_MEDIUM="$WORK_DIR/findings_medium.md"
FINDINGS_LOW="$WORK_DIR/findings_low.md"
FINDINGS_TRENDING="$WORK_DIR/findings_trending.md"
SCAN_ERRORS="$WORK_DIR/errors.log"
touch "$FINDINGS_HIGH" "$FINDINGS_MEDIUM" "$FINDINGS_LOW" "$FINDINGS_TRENDING" "$SCAN_ERRORS"

TOTAL_FINDINGS=0
HIGH_COUNT=0
SOURCES_SCANNED=0
SOURCES_TOTAL=0

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log() { echo "[scanner] $*" >&2; }

jq_state() {
  python3 -c "
import json, sys
with open('$STATE_FILE') as f:
    data = json.load(f)
result = data
for key in sys.argv[1:]:
    if isinstance(result, dict):
        result = result.get(key, '')
    elif isinstance(result, list):
        result = result[int(key)] if key.isdigit() and int(key) < len(result) else ''
    else:
        result = ''
print(json.dumps(result) if isinstance(result, (dict, list)) else str(result))
" "$@"
}

update_state_source() {
  # update_state_source <source_name> <known_version>
  local source="$1"
  local version="$2"
  python3 -c "
import json, sys
with open('$STATE_FILE') as f:
    data = json.load(f)
if sys.argv[1] in data.get('sources', {}):
    data['sources'][sys.argv[1]]['last_scanned'] = sys.argv[3]
    if sys.argv[2]:
        data['sources'][sys.argv[1]]['known_version'] = sys.argv[2]
with open('$STATE_FILE', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
" "$source" "$version" "$NOW"
}

finalize_state() {
  python3 -c "
import json
with open('$STATE_FILE') as f:
    data = json.load(f)
data['last_updated'] = '$NOW'
# Prepend scan history entry, cap at 100
entry = {
    'timestamp': '$NOW',
    'scan_type': '$SCAN_TYPE',
    'status': '$1',
    'findings_count': $TOTAL_FINDINGS,
    'high_priority_count': $HIGH_COUNT,
    'digest_file': 'monitor/digests/$(basename "$DIGEST_FILE")'
}
data.setdefault('scan_history', [])
data['scan_history'].insert(0, entry)
data['scan_history'] = data['scan_history'][:100]
with open('$STATE_FILE', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
"
}

# ---------------------------------------------------------------------------
# Scanners
# ---------------------------------------------------------------------------

scan_github_releases() {
  # Check tracked repos for new releases
  local repos
  repos=$(python3 -c "
import json
with open('$STATE_FILE') as f:
    data = json.load(f)
for r in data.get('watchlist', {}).get('repos', []):
    print(r)
")

  while IFS= read -r repo; do
    [[ -z "$repo" ]] && continue
    SOURCES_TOTAL=$((SOURCES_TOTAL + 1))
    log "Checking releases: $repo"

    local known_version
    # Map repo to source name for state tracking
    local source_key
    source_key=$(echo "$repo" | tr '/' '-' | tr '[:upper:]' '[:lower:]')

    # Fetch latest release via gh CLI
    local release_json
    if ! release_json=$(gh api "repos/$repo/releases/latest" 2>>"$SCAN_ERRORS"); then
      # No releases or API error — try tags instead
      if ! release_json=$(gh api "repos/$repo/tags?per_page=1" 2>>"$SCAN_ERRORS"); then
        echo "WARN: Could not fetch releases or tags for $repo" >> "$SCAN_ERRORS"
        continue
      fi
      # Tags endpoint returns an array
      local tag_name
      tag_name=$(echo "$release_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['name'] if d else '')" 2>/dev/null || echo "")
      if [[ -z "$tag_name" ]]; then continue; fi
      release_json="{\"tag_name\": \"$tag_name\", \"name\": \"$tag_name\", \"published_at\": \"$NOW\", \"html_url\": \"https://github.com/$repo/releases/tag/$tag_name\"}"
    fi

    local tag_name release_name published_at html_url
    tag_name=$(echo "$release_json" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tag_name',''))" 2>/dev/null || echo "")
    release_name=$(echo "$release_json" | python3 -c "import json,sys; print(json.load(sys.stdin).get('name',''))" 2>/dev/null || echo "")
    published_at=$(echo "$release_json" | python3 -c "import json,sys; print(json.load(sys.stdin).get('published_at',''))" 2>/dev/null || echo "")
    html_url=$(echo "$release_json" | python3 -c "import json,sys; print(json.load(sys.stdin).get('html_url',''))" 2>/dev/null || echo "")

    [[ -z "$tag_name" ]] && continue
    SOURCES_SCANNED=$((SOURCES_SCANNED + 1))

    # Check if this is a new version
    known_version=$(jq_state sources "$source_key" known_version 2>/dev/null || echo "")
    # Also check the org-level source if repo-level key isn't tracked
    local org_key
    org_key=$(echo "$repo" | cut -d'/' -f1 | tr '[:upper:]' '[:lower:]')
    if [[ -z "$known_version" ]]; then
      known_version=$(jq_state sources "$org_key" known_version 2>/dev/null || echo "")
    fi

    if [[ "$tag_name" != "$known_version" ]] && [[ -n "$tag_name" ]]; then
      log "  NEW: $repo $tag_name (was: $known_version)"
      TOTAL_FINDINGS=$((TOTAL_FINDINGS + 1))

      # Classify priority based on repo importance
      case "$repo" in
        anthropics/*|openai/*|google-deepmind/*|meta-llama/*|QwenLM/*|THUDM/*|01-ai/*|cohere-ai/*|AI21Labs/*|tiiuae/*|google/*|baichuan-inc/*)
          HIGH_COUNT=$((HIGH_COUNT + 1))
          echo "### $repo $tag_name" >> "$FINDINGS_HIGH"
          echo "- **Source:** GitHub Releases" >> "$FINDINGS_HIGH"
          echo "- **Category:** model_release" >> "$FINDINGS_HIGH"
          echo "- **Release:** ${release_name:-$tag_name} (${published_at:-unknown date})" >> "$FINDINGS_HIGH"
          echo "- **URL:** $html_url" >> "$FINDINGS_HIGH"
          echo "- **Impact:** Major provider release — review for capability shifts, breaking changes, and tier reassessment" >> "$FINDINGS_HIGH"
          echo "- **Action:** Evaluate against current model tier assignments (Section 13)" >> "$FINDINGS_HIGH"
          echo "" >> "$FINDINGS_HIGH"
          ;;
        *)
          echo "- **[$repo]** $tag_name — ${release_name:-$tag_name} ([release]($html_url))" >> "$FINDINGS_MEDIUM"
          ;;
      esac

      # Update state with new version (unless dry run)
      if [[ "$DRY_RUN" == "false" ]]; then
        update_state_source "$source_key" "$tag_name"
        # Also update org-level source if it exists in state
        update_state_source "$org_key" "$tag_name" 2>/dev/null || true
      fi
    else
      log "  OK: $repo at $tag_name (unchanged)"
    fi

  done <<< "$repos"
}

scan_trending() {
  # Search GitHub for trending repos matching watchlist topics
  local topics
  topics=$(python3 -c "
import json
with open('$STATE_FILE') as f:
    data = json.load(f)
for t in data.get('watchlist', {}).get('topics', []):
    print(t)
")

  local week_ago
  week_ago=$(date -u -d "7 days ago" +%Y-%m-%d 2>/dev/null || date -u -v-7d +%Y-%m-%d 2>/dev/null || echo "2026-03-06")

  while IFS= read -r topic; do
    [[ -z "$topic" ]] && continue
    SOURCES_TOTAL=$((SOURCES_TOTAL + 1))
    log "Trending search: $topic"

    local search_results
    if ! search_results=$(gh api "search/repositories?q=${topic}+created:>=${week_ago}&sort=stars&order=desc&per_page=5" 2>>"$SCAN_ERRORS"); then
      echo "WARN: Trending search failed for topic '$topic'" >> "$SCAN_ERRORS"
      continue
    fi
    SOURCES_SCANNED=$((SOURCES_SCANNED + 1))

    # Parse results
    python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data.get('items', [])[:5]:
    name = item.get('full_name', '')
    stars = item.get('stargazers_count', 0)
    desc = item.get('description', 'No description')
    url = item.get('html_url', '')
    if stars >= 50:
        print(f'- **[{name}]({url})** stars: {stars} — {desc}')
" <<< "$search_results" >> "$FINDINGS_TRENDING" 2>/dev/null || true

  done <<< "$topics"

  # Count trending findings
  if [[ -s "$FINDINGS_TRENDING" ]]; then
    local tc
    tc=$(wc -l < "$FINDINGS_TRENDING")
    TOTAL_FINDINGS=$((TOTAL_FINDINGS + tc))
  fi
}

# ---------------------------------------------------------------------------
# Digest Generation
# ---------------------------------------------------------------------------

generate_digest() {
  local scan_end scan_duration
  scan_end=$(date -u +%s)
  scan_duration=$(( scan_end - SCAN_START ))
  local minutes=$(( scan_duration / 60 ))
  local seconds=$(( scan_duration % 60 ))

  mkdir -p "$DIGESTS_DIR"

  cat > "$DIGEST_FILE" <<DIGEST_HEADER
# AI Landscape Monitor — $TODAY

**Scan type:** $SCAN_TYPE
**Scan time:** $NOW
**Sources scanned:** $SOURCES_SCANNED of $SOURCES_TOTAL configured sources
**Duration:** ${minutes}m ${seconds}s

DIGEST_HEADER

  # High Priority
  if [[ -s "$FINDINGS_HIGH" ]]; then
    cat >> "$DIGEST_FILE" <<'EOF'
## High Priority

> Items requiring immediate attention. These trigger GitHub issue creation.

EOF
    cat "$FINDINGS_HIGH" >> "$DIGEST_FILE"
  fi

  # Medium Priority — Releases
  if [[ -s "$FINDINGS_MEDIUM" ]]; then
    cat >> "$DIGEST_FILE" <<'EOF'
## Model & SDK Releases

> New releases detected across tracked repositories.

EOF
    cat "$FINDINGS_MEDIUM" >> "$DIGEST_FILE"
    echo "" >> "$DIGEST_FILE"
  fi

  # Trending
  if [[ -s "$FINDINGS_TRENDING" ]]; then
    cat >> "$DIGEST_FILE" <<'EOF'
## Trending Repositories

> New repositories with notable traction in the past week.

EOF
    cat "$FINDINGS_TRENDING" >> "$DIGEST_FILE"
    echo "" >> "$DIGEST_FILE"
  fi

  # Low Priority
  if [[ -s "$FINDINGS_LOW" ]]; then
    cat >> "$DIGEST_FILE" <<'EOF'
## Low Priority

> Informational items. No action required.

EOF
    cat "$FINDINGS_LOW" >> "$DIGEST_FILE"
    echo "" >> "$DIGEST_FILE"
  fi

  # No findings case
  if [[ $TOTAL_FINDINGS -eq 0 ]]; then
    echo "## No New Findings" >> "$DIGEST_FILE"
    echo "" >> "$DIGEST_FILE"
    echo "All tracked sources are at their known versions. No notable trending repositories found." >> "$DIGEST_FILE"
    echo "" >> "$DIGEST_FILE"
  fi

  # Scan errors
  if [[ -s "$SCAN_ERRORS" ]]; then
    echo "## Scan Errors" >> "$DIGEST_FILE"
    echo "" >> "$DIGEST_FILE"
    echo '```' >> "$DIGEST_FILE"
    cat "$SCAN_ERRORS" >> "$DIGEST_FILE"
    echo '```' >> "$DIGEST_FILE"
    echo "" >> "$DIGEST_FILE"
  fi

  # Metadata
  cat >> "$DIGEST_FILE" <<DIGEST_FOOTER
## Scan Metadata

- **Total findings:** $TOTAL_FINDINGS
- **High priority:** $HIGH_COUNT
- **Sources scanned:** $SOURCES_SCANNED / $SOURCES_TOTAL
- **Errors:** $(wc -l < "$SCAN_ERRORS" | tr -d ' ')
- **Duration:** ${minutes}m ${seconds}s
DIGEST_FOOTER

  log "Digest written: $DIGEST_FILE"
}

# ---------------------------------------------------------------------------
# Issue Creation (high-priority findings)
# ---------------------------------------------------------------------------

create_issues() {
  if [[ ! -s "$FINDINGS_HIGH" ]] || [[ "$DRY_RUN" == "true" ]]; then
    return
  fi

  log "Creating GitHub issues for high-priority findings..."

  # Create one consolidated issue for the scan
  local issue_title="[Monitor] High-priority findings — $TODAY"
  local issue_body_file="$WORK_DIR/issue_body.md"

  cat > "$issue_body_file" <<ISSUE_HEADER
## AI Landscape Monitor — High Priority Findings

**Scan date:** $TODAY
**Scan type:** $SCAN_TYPE
**High-priority findings:** $HIGH_COUNT

---

ISSUE_HEADER

  cat "$FINDINGS_HIGH" >> "$issue_body_file"

  cat >> "$issue_body_file" <<ISSUE_FOOTER

---

*Generated by the AI Landscape Monitor. See \`monitor/digests/${TODAY}.md\` for the full digest.*
ISSUE_FOOTER

  if gh issue create --title "$issue_title" --body-file "$issue_body_file" --label "monitor,high-priority" 2>>"$SCAN_ERRORS"; then
    log "Issue created: $issue_title"
  else
    # Labels might not exist — retry without labels
    gh issue create --title "$issue_title" --body-file "$issue_body_file" 2>>"$SCAN_ERRORS" || {
      echo "WARN: Failed to create GitHub issue" >> "$SCAN_ERRORS"
    }
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  log "Starting $SCAN_TYPE scan at $NOW"
  log "Dry run: $DRY_RUN"

  if [[ ! -f "$STATE_FILE" ]]; then
    echo "ERROR: State file not found: $STATE_FILE" >&2
    exit 1
  fi

  # Validate state file
  if ! python3 -m json.tool "$STATE_FILE" > /dev/null 2>&1; then
    echo "ERROR: State file is not valid JSON: $STATE_FILE" >&2
    exit 1
  fi

  # Run scanners based on scan type
  case "$SCAN_TYPE" in
    full)
      scan_github_releases
      scan_trending
      ;;
    models)
      scan_github_releases
      ;;
    releases)
      scan_github_releases
      ;;
    patterns)
      scan_trending
      ;;
    discover)
      scan_github_releases
      scan_trending
      ;;
    *)
      echo "ERROR: Unknown scan type: $SCAN_TYPE" >&2
      echo "Valid types: full, models, patterns, releases, discover" >&2
      exit 1
      ;;
  esac

  # Generate digest
  generate_digest

  # Determine scan status
  local status="success"
  if [[ -s "$SCAN_ERRORS" ]]; then
    if [[ $SOURCES_SCANNED -eq 0 ]]; then
      status="failed"
    else
      status="partial"
    fi
  fi

  # Update state
  if [[ "$DRY_RUN" == "false" ]]; then
    finalize_state "$status"
    create_issues
  fi

  log "Scan complete: $TOTAL_FINDINGS findings ($HIGH_COUNT high priority), status: $status"

  # Exit non-zero only on total failure
  if [[ "$status" == "failed" ]]; then
    exit 1
  fi
}

main "$@"
