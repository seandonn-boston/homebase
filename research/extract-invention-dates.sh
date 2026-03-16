#!/usr/bin/env bash
# extract-invention-dates.sh — Phase 4.1: Document invention dates for all 23 patent opportunities
# Extracts earliest git commits relevant to each patentable innovation in the Admiral Framework.
# Output: research/invention-dates.md
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

OUTPUT="$REPO_ROOT/research/invention-dates.md"
TMPDIR_WORK="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_WORK"' EXIT

# --- Opportunity definitions ---
# Format: ID|Name|Tier|Priority|grep_patterns(comma-sep)|file_paths(space-sep)
cat > "$TMPDIR_WORK/opportunities.txt" <<'OPPS'
1|The Enforcement Spectrum|1|HIGHEST|enforcement.spectrum,hard enforcement,firm guidance,soft guidance,hook.*lifecycle,deterministic.*enforcement,enforcement.*tier|admiral/spec/part3* .hooks/ admiral/standing-orders/
2|Fleet-Wide Institutional Memory (The Brain)|1|HIGH|brain.*architecture,institutional.memory,knowledge.*entry,strengthening.*decay,supersession.*chain,semantic.*retrieval,brain.*level|admiral/spec/part5* brain/ .brain/ admiral/bin/brain_*
3|Decision Authority Taxonomy|1|HIGH|decision.authority,autonomous.*propose.*escalate,trust.calibration,authority.*tier,four.tier|admiral/spec/part1* admiral/spec/part3* AGENTS.md
4|Self-Healing Governance Loops|1|MEDIUM|self.heal,recovery.ladder,cycle.detection,error.*signature.*tuple,governance.*loop|admiral/spec/part3* .hooks/ admiral/spec/part10*
5|Standing Orders as Mechanical Behavioral Invariants|1|MEDIUM|standing.order,behavioral.invariant,mechanical.*invariant,SO-[0-9]|admiral/standing-orders/ admiral/spec/part11*
6|Closed-Loop Data Ecosystem|1|MEDIUM|closed.loop.*data,outcome.attribution,data.*ecosystem,feedback.*loop.*agent|admiral/spec/part12* monitor/
7|Progressive Component Scaling|1|LOW|progressive.*scal,dependency.*matrix,component.*level,starter.*team.*governed,B1.*B2.*B3|admiral/spec/index.md admiral/reference/
8|Intent Engineering Methodology|2|HIGH|intent.engineer,six.element,goal.*priority.*constraint,prompt.anatomy,beyond.*prompt|admiral/spec/part2* admiral/spec/part6* fleet/prompt-anatomy*
9|Agent Identity with Non-Delegable Tokens|2|HIGH|agent.identity,non.delegable,identity.*token,zero.trust.*agent,authority.*self.*escalat|admiral/spec/part3* admiral/spec/part10*
10|Five-Layer Quarantine Immune System|2|HIGH|quarantine.*immune,five.layer,injection.*detect,llm.airgap,antibody.*generat|admiral/spec/part3* admiral/lib/injection_detect* monitor/
11|Context Window Stratification|2|MEDIUM-HIGH|context.*window.*strat,primacy.*recency,loading.*order.*protocol,context.*health,context.*sacrifice|admiral/spec/part2* .hooks/session_start* .hooks/context_*
12|A2A Protocol with Agent Cards|2|MEDIUM|agent.card,a2a.*protocol,agent.to.agent,json.rpc.*agent,cross.fleet.*collaborat|admiral/spec/part4*
13|Fleet Catalog with Role Architecture|2|MEDIUM|fleet.*catalog,role.*architecture,interface.*contract,sender.delivers,receiver.returns,routing.*rule|admiral/spec/part6* admiral/spec/part8* fleet/
14|Governance Agents|2|MEDIUM-HIGH|governance.*agent,drift.*monitor,hallucination.*audit,bias.*sentinel,loop.*breaker,red.*team.*agent|admiral/spec/part8* admiral/spec/part10* control-plane/src/runaway*
15|Multi-Agent Handoff Protocol|2|MEDIUM|handoff.*protocol,task.*handoff,mediator.*agent,handoff.*verif|admiral/spec/part6* admiral/spec/part7*
16|Orchestrator Degradation|2|MEDIUM|orchestrator.*degrad,fallback.*decompos,fleet.*pause,heartbeat.*miss|admiral/spec/part8* admiral/spec/part10*
17|Metered Service Broker|3|LOW-MEDIUM|metered.*service,per.second.*bill,credential.*vault,session.*broker,billing.*engine|admiral/spec/part8*
18|AI Landscape Monitor|3|LOW-MEDIUM|landscape.*monitor,rss.*scan,seed.*candidate,model.*provider.*scan|admiral/spec/part9* monitor/
19|Spec-First Pipeline|3|LOW|spec.first.*pipeline,phase.*artifact,mission.*template,requirements.*spec.*design.*spec|admiral/spec/part1* admiral/spec/part6*
20|Strategic Adaptation Protocol|3|LOW-MEDIUM|cascade.*map,adaptation.*protocol,artifact.*depend,fleet.*pause.*protocol,strategic.*shift|admiral/spec/part8*
21|Agentic Engineering Ladder|3|MEDIUM|agentic.*engineering.*ladder,nine.rung,prompt.*context.*intent.*constraint,autonomy.*engineering|thesis/agentic-engineering-ladder*
22|Fleet Pause/Resume Protocol|3|LOW|fleet.*pause.*resume,checkpoint.*continu,coordinated.*pause,resume.*rehydrat|admiral/spec/part7* admiral/spec/part8*
23|Execution Trace Forest Builder|3|LOW|trace.*forest,reasoning.*tree,trace.*node,ascii.*tree.*agent,flat.*event.*hierarchi|control-plane/src/trace* admiral/spec/part7*
OPPS

# --- Find earliest commit for an opportunity ---
find_earliest() {
  local patterns="$1"
  local paths="$2"
  local tmpfile="$TMPDIR_WORK/commits.tmp"
  > "$tmpfile"

  # Search commit messages for each pattern
  IFS=',' read -ra PATS <<< "$patterns"
  for pat in "${PATS[@]}"; do
    git log --all --format='%H|%as|%s' --grep="$pat" -i 2>/dev/null >> "$tmpfile" || true
    git log --all --format='%H|%as|%s' -S "$pat" 2>/dev/null | head -20 >> "$tmpfile" || true
  done

  # Search file creation dates for relevant paths
  if [ -n "$paths" ]; then
    # shellcheck disable=SC2086
    git log --all --format='%H|%as|%s' --diff-filter=A -- $paths 2>/dev/null >> "$tmpfile" || true
  fi

  # Sort by date, take earliest
  if [ -s "$tmpfile" ]; then
    sort -t'|' -k2,2 "$tmpfile" | head -1
  else
    echo "NOT_FOUND|—|No matching commits found"
  fi
}

# --- Get detail commits for an opportunity ---
get_details() {
  local patterns="$1"
  local paths="$2"
  local tmpfile="$TMPDIR_WORK/details.tmp"
  > "$tmpfile"

  # File creation commits (most reliable signal)
  if [ -n "$paths" ]; then
    # shellcheck disable=SC2086
    git log --all --format='%as %h %s' --diff-filter=A -- $paths 2>/dev/null | tail -5 >> "$tmpfile" || true
  fi

  # Keyword commits
  local count
  count=$(wc -l < "$tmpfile")
  if [ "$count" -lt 3 ]; then
    IFS=',' read -ra PATS <<< "$patterns"
    for pat in "${PATS[@]}"; do
      [ "$(wc -l < "$tmpfile")" -ge 5 ] && break
      git log --all --format='%as %h %s' --grep="$pat" -i 2>/dev/null | tail -3 >> "$tmpfile" || true
    done
  fi

  # Deduplicate and sort, take earliest 5
  if [ -s "$tmpfile" ]; then
    sort -u "$tmpfile" | sort -k1,1 | head -5
  else
    echo "(no matching commits found)"
  fi
}

# --- Generate the document ---
echo "Generating invention dates for 23 patent opportunities..." >&2

{
  cat <<HEADER
# Admiral Framework — Invention Date Documentation

**Generated:** $(date +%Y-%m-%d)
**Purpose:** Phase 4.1 — Document invention dates for all 23 patentable innovations
**Method:** Git history analysis (commit messages, diff content, file creation dates)
**Source:** \`research/patent-opportunity-analysis.md\`

---

## Summary

This document records the earliest git commit establishing each of the 23 patent opportunities
identified in the Admiral Framework. These dates serve as evidence of invention priority for
provisional patent filings.

---

## Invention Dates

| # | Innovation | Tier | Priority | Earliest Date | Commit | Summary |
|---|---|---|---|---|---|---|
HEADER

  while IFS='|' read -r id name tier priority patterns paths; do
    result="$(find_earliest "$patterns" "$paths")"
    hash="$(echo "$result" | cut -d'|' -f1)"
    date="$(echo "$result" | cut -d'|' -f2)"
    subject="$(echo "$result" | cut -d'|' -f3-)"

    if [ "$hash" = "NOT_FOUND" ]; then
      short_hash="—"
    else
      short_hash="${hash:0:7}"
    fi

    # Escape pipes and truncate
    subject="${subject//|/∣}"
    if [ "${#subject}" -gt 80 ]; then
      subject="${subject:0:77}..."
    fi

    echo "| **$id** | $name | $tier | $priority | $date | \`$short_hash\` | $subject |"
    echo "  [$id/23] $name — $date" >&2
  done < "$TMPDIR_WORK/opportunities.txt"

  echo ""
  echo "---"
  echo ""
  echo "## Detailed Findings"
  echo ""

  while IFS='|' read -r id name tier priority patterns paths; do
    echo "### #$id: $name"
    echo ""
    echo "**Tier:** $tier | **Priority:** $priority"
    echo ""
    echo "**Search patterns:** \`$patterns\`"
    [ -n "$paths" ] && echo "**Relevant paths:** \`$paths\`"
    echo ""
    echo "**Earliest relevant commits:**"
    echo ""
    echo '```'
    get_details "$patterns" "$paths"
    echo '```'
    echo ""
    echo "---"
    echo ""
  done < "$TMPDIR_WORK/opportunities.txt"

  echo "*Generated by \`research/extract-invention-dates.sh\` — Phase 4.1 of PLAN.md*"

} > "$OUTPUT"

echo "" >&2
echo "===================================" >&2
echo " Invention dates extracted" >&2
echo " Output: $OUTPUT" >&2
echo "===================================" >&2
wc -l "$OUTPUT" >&2
