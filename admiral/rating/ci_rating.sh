#!/bin/bash
# Admiral Framework — Rating CI Integration (RT-03)
#
# Runs the rating calculator, compares against previous rating,
# alerts on regression, stores rating artifact.
#
# Exit codes:
#   0  Rating stable or improved
#   1  Rating regressed (tier drop or >5 point decline)
#   2  Hard error (missing dependency, bad arguments)
#
# Usage:
#   ci_rating.sh [--entity NAME] [--suffix SA|IA] [--threshold N] [--json] [--save]
#
# Options:
#   --entity NAME     Entity name for the rating (default: project root name)
#   --suffix SA|IA    Certification suffix (default: -SA)
#   --threshold N     Score decline threshold to trigger regression (default: 5)
#   --json            Output JSON to stdout
#   --save            Save rating artifact to admiral/rating/artifacts/
#   --history FILE    Path to history JSON file (default: admiral/rating/history.json)
#   --no-fail         Exit 0 even on regression (alert only)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ARTIFACTS_DIR="${SCRIPT_DIR}/artifacts"
DEFAULT_HISTORY="${SCRIPT_DIR}/history.json"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
OPT_ENTITY=""
OPT_SUFFIX="-SA"
OPT_THRESHOLD=5
OPT_JSON=false
OPT_SAVE=false
OPT_HISTORY="${DEFAULT_HISTORY}"
OPT_NO_FAIL=false

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --entity)
        shift
        if [ $# -eq 0 ]; then
          echo "ERROR: --entity requires an argument" >&2
          exit 2
        fi
        OPT_ENTITY="$1"
        ;;
      --suffix)
        shift
        if [ $# -eq 0 ]; then
          echo "ERROR: --suffix requires an argument" >&2
          exit 2
        fi
        OPT_SUFFIX="-$1"
        ;;
      --threshold)
        shift
        if [ $# -eq 0 ]; then
          echo "ERROR: --threshold requires an argument" >&2
          exit 2
        fi
        OPT_THRESHOLD="$1"
        ;;
      --history)
        shift
        if [ $# -eq 0 ]; then
          echo "ERROR: --history requires an argument" >&2
          exit 2
        fi
        OPT_HISTORY="$1"
        ;;
      --json)   OPT_JSON=true ;;
      --save)   OPT_SAVE=true ;;
      --no-fail) OPT_NO_FAIL=true ;;
      -*)
        echo "ERROR: Unknown option: $1" >&2
        exit 2
        ;;
    esac
    shift
  done
}

parse_args "$@"

# Default entity name to project root basename
if [ -z "$OPT_ENTITY" ]; then
  OPT_ENTITY="$(basename "$PROJECT_ROOT")"
fi

# ---------------------------------------------------------------------------
# Dependency check
# ---------------------------------------------------------------------------

check_deps() {
  if ! command -v node &>/dev/null; then
    echo "ERROR: node is required but not found" >&2
    exit 2
  fi
  if ! command -v jq &>/dev/null; then
    echo "WARNING: jq not found — JSON parsing will be limited" >&2
    # Continue without jq — fall back to grep/awk
  fi
}

check_deps

# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------

log() {
  echo "[ci_rating] $*" >&2
}

log_section() {
  echo "" >&2
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
  echo "  $*" >&2
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
}

# ---------------------------------------------------------------------------
# Run rating calculator
# ---------------------------------------------------------------------------

RATING_SCRIPT="${PROJECT_ROOT}/control-plane"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
COMMIT_SHA=""

# Try to get current commit SHA
if command -v git &>/dev/null && git -C "$PROJECT_ROOT" rev-parse --short HEAD &>/dev/null 2>&1; then
  COMMIT_SHA="$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "")"
fi

log_section "Admiral Rating CI — $OPT_ENTITY"
log "Timestamp: $TIMESTAMP"
log "Project root: $PROJECT_ROOT"
log "Commit: ${COMMIT_SHA:-unknown}"
log "Suffix: $OPT_SUFFIX"
log "Threshold: $OPT_THRESHOLD points"

# ---------------------------------------------------------------------------
# Compute rating using node
# ---------------------------------------------------------------------------

RATING_JSON=""

compute_rating() {
  local node_script
  node_script="$(cat <<'NODEEOF'
const path = require('path');
const { RatingCalculator } = require('./control-plane/src/rating/calculator.js');

async function main() {
  const root = process.env.PROJECT_ROOT || process.cwd();
  const entity = process.env.RATING_ENTITY || path.basename(root);
  const suffix = process.env.RATING_SUFFIX || '-SA';
  const commitSha = process.env.COMMIT_SHA || undefined;

  // Try ESM dynamic import
  try {
    const { RatingCalculator: Calc } = await import(
      path.join(root, 'control-plane', 'src', 'rating', 'calculator.js')
    ).catch(() => require(path.join(root, 'control-plane', 'src', 'rating', 'calculator.js')));

    const calc = new Calc(root);
    const report = calc.calculate({ projectRoot: root, entity, certificationSuffix: suffix, commitSha });
    console.log(JSON.stringify(report, null, 2));
  } catch (e) {
    process.stderr.write('Calculator error: ' + e.message + '\n');
    // Emit fallback minimal report
    const report = {
      id: 'rat_ci_fallback',
      generatedAt: new Date().toISOString(),
      entity,
      tier: 'ADM-5',
      certificationSuffix: suffix,
      ratingLabel: 'ADM-5' + suffix,
      overallScore: 0,
      dimensionScores: [],
      moduleRatings: [],
      activeCaps: [],
      recommendations: ['Could not run rating calculator — check control-plane build'],
      validUntil: new Date(Date.now() + 365 * 86400000).toISOString(),
      metadata: { error: e.message }
    };
    console.log(JSON.stringify(report, null, 2));
  }
}
main();
NODEEOF
)"

  RATING_JSON="$(
    PROJECT_ROOT="$PROJECT_ROOT" \
    RATING_ENTITY="$OPT_ENTITY" \
    RATING_SUFFIX="$OPT_SUFFIX" \
    COMMIT_SHA="$COMMIT_SHA" \
    node --input-type=module \
      --experimental-vm-modules \
      2>/dev/null <<'NODEEOF' || echo '{}'
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const root = process.env.PROJECT_ROOT;
const entity = process.env.RATING_ENTITY;
const suffix = process.env.RATING_SUFFIX;
const commitSha = process.env.COMMIT_SHA || undefined;

try {
  const mod = await import(path.join(root, 'control-plane', 'src', 'rating', 'calculator.js'));
  const calc = new mod.RatingCalculator(root);
  const report = calc.calculate({ projectRoot: root, entity, certificationSuffix: suffix, commitSha });
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} catch (e) {
  process.stderr.write('Calculator error: ' + e.message + '\n');
  const report = {
    id: 'rat_ci_fallback_' + Date.now(),
    generatedAt: new Date().toISOString(),
    entity,
    tier: 'ADM-5',
    certificationSuffix: suffix,
    ratingLabel: 'ADM-5' + suffix,
    overallScore: 0,
    dimensionScores: [],
    moduleRatings: [],
    activeCaps: [],
    recommendations: ['Could not run rating calculator: ' + e.message],
    validUntil: new Date(Date.now() + 365 * 86400000).toISOString(),
    metadata: { error: e.message }
  };
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
NODEEOF
  )"
}

compute_rating

if [ -z "$RATING_JSON" ] || [ "$RATING_JSON" = "{}" ]; then
  log "WARNING: Rating calculator returned empty result — using minimal fallback"
  RATING_JSON="{\"id\":\"rat_fallback\",\"tier\":\"ADM-5\",\"overallScore\":0,\"ratingLabel\":\"ADM-5${OPT_SUFFIX}\",\"entity\":\"${OPT_ENTITY}\",\"generatedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"activeCaps\":[],\"recommendations\":[]}"
fi

# ---------------------------------------------------------------------------
# Extract fields from rating JSON
# ---------------------------------------------------------------------------

extract_field() {
  local json="$1"
  local field="$2"
  if command -v jq &>/dev/null; then
    echo "$json" | jq -r ".$field // empty"
  else
    echo "$json" | grep -o "\"${field}\":[^,}]*" | head -1 | sed 's/.*: *//; s/[", ]//g'
  fi
}

CURRENT_TIER="$(extract_field "$RATING_JSON" "tier")"
CURRENT_SCORE="$(extract_field "$RATING_JSON" "overallScore")"
RATING_LABEL="$(extract_field "$RATING_JSON" "ratingLabel")"
REPORT_ID="$(extract_field "$RATING_JSON" "id")"

log ""
log "Current rating: $RATING_LABEL (score: $CURRENT_SCORE)"
log "Active caps: $(echo "$RATING_JSON" | jq -r '.activeCaps | length' 2>/dev/null || echo "?")"

# ---------------------------------------------------------------------------
# Load previous rating from history
# ---------------------------------------------------------------------------

PREV_TIER=""
PREV_SCORE=""
REGRESSED=false

load_previous_rating() {
  if [ ! -f "$OPT_HISTORY" ]; then
    log "No history file found at $OPT_HISTORY — first run"
    return
  fi

  if command -v jq &>/dev/null; then
    local entry_count
    entry_count="$(jq '.entries | length' "$OPT_HISTORY" 2>/dev/null || echo 0)"
    if [ "$entry_count" -eq 0 ]; then
      log "History file exists but has no entries — first run"
      return
    fi

    PREV_TIER="$(jq -r '.entries[-1].tier // empty' "$OPT_HISTORY" 2>/dev/null || echo "")"
    PREV_SCORE="$(jq -r '.entries[-1].overallScore // empty' "$OPT_HISTORY" 2>/dev/null || echo "")"
    log "Previous rating: ${PREV_TIER:-unknown} (score: ${PREV_SCORE:-unknown})"
  else
    log "jq not available — skipping history comparison"
  fi
}

load_previous_rating

# ---------------------------------------------------------------------------
# Regression detection
# ---------------------------------------------------------------------------

tier_rank() {
  case "$1" in
    "ADM-1") echo 5 ;;
    "ADM-2") echo 4 ;;
    "ADM-3") echo 3 ;;
    "ADM-4") echo 2 ;;
    "ADM-5") echo 1 ;;
    *) echo 0 ;;
  esac
}

check_regression() {
  if [ -z "$PREV_TIER" ] || [ -z "$PREV_SCORE" ]; then
    log "No previous rating to compare against"
    return
  fi

  local curr_rank prev_rank score_delta
  curr_rank="$(tier_rank "$CURRENT_TIER")"
  prev_rank="$(tier_rank "$PREV_TIER")"

  # Integer arithmetic for score delta
  if [ -n "$CURRENT_SCORE" ] && [ -n "$PREV_SCORE" ]; then
    local curr_int prev_int
    curr_int="${CURRENT_SCORE%%.*}"
    prev_int="${PREV_SCORE%%.*}"
    score_delta=$((curr_int - prev_int))
  else
    score_delta=0
  fi

  log ""
  if [ "$curr_rank" -lt "$prev_rank" ]; then
    log "REGRESSION DETECTED: Tier dropped from $PREV_TIER to $CURRENT_TIER"
    REGRESSED=true
  elif [ "$score_delta" -le "-${OPT_THRESHOLD}" ]; then
    log "REGRESSION DETECTED: Score declined by $((0 - score_delta)) points (threshold: ${OPT_THRESHOLD})"
    REGRESSED=true
  else
    log "Rating stable or improved (delta: ${score_delta:+}${score_delta} points)"
  fi
}

check_regression

# ---------------------------------------------------------------------------
# Append to history
# ---------------------------------------------------------------------------

append_to_history() {
  local history_dir
  history_dir="$(dirname "$OPT_HISTORY")"
  mkdir -p "$history_dir"

  local entry
  if command -v jq &>/dev/null; then
    entry="$(echo "$RATING_JSON" | jq '{
      reportId: .id,
      timestamp: .generatedAt,
      entity: .entity,
      tier: .tier,
      ratingLabel: .ratingLabel,
      overallScore: .overallScore,
      dimensionScores: (
        if .dimensionScores then
          (.dimensionScores | map({(.dimensionId): .score}) | add // {})
        else {}
        end
      ),
      commitSha: .commitSha,
      activeCapsCount: (.activeCaps | length)
    }')"

    if [ -f "$OPT_HISTORY" ]; then
      local updated
      updated="$(jq --argjson entry "$entry" '.entries += [$entry]' "$OPT_HISTORY" 2>/dev/null)" || true
      if [ -n "$updated" ]; then
        echo "$updated" > "$OPT_HISTORY"
        log "Appended to history ($OPT_HISTORY)"
      fi
    else
      echo "{\"version\":1,\"entries\":[$entry]}" > "$OPT_HISTORY"
      log "Created history file ($OPT_HISTORY)"
    fi
  else
    log "jq not available — skipping history persistence"
  fi
}

append_to_history

# ---------------------------------------------------------------------------
# Save artifact
# ---------------------------------------------------------------------------

save_artifact() {
  mkdir -p "$ARTIFACTS_DIR"
  local artifact_path="${ARTIFACTS_DIR}/rating_${TIMESTAMP}_${CURRENT_TIER}.json"
  echo "$RATING_JSON" > "$artifact_path"
  log "Saved rating artifact: $artifact_path"

  # Also update latest symlink / file
  echo "$RATING_JSON" > "${ARTIFACTS_DIR}/rating_latest.json"
}

if [ "$OPT_SAVE" = true ]; then
  save_artifact
fi

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

log_section "Rating Summary"
log "Entity:       $OPT_ENTITY"
log "Rating:       $RATING_LABEL"
log "Score:        $CURRENT_SCORE / 100"
log "Previous:     ${PREV_TIER:-n/a} (${PREV_SCORE:-n/a})"
log "Regressed:    $REGRESSED"
log "Report ID:    $REPORT_ID"

if [ "$OPT_JSON" = true ]; then
  echo "$RATING_JSON"
fi

# ---------------------------------------------------------------------------
# Exit
# ---------------------------------------------------------------------------

if [ "$REGRESSED" = true ] && [ "$OPT_NO_FAIL" = false ]; then
  log ""
  log "EXIT 1: Rating regression detected"
  exit 1
fi

log ""
log "EXIT 0: Rating stable or improved"
exit 0
