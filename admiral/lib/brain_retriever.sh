#!/bin/bash
# Admiral Framework — Brain Retriever Library (B-02)
# Provides functions for hooks to query Brain and get structured context.
# Used by brain_context_router.sh to inject matching entries on Propose/Escalate.

# Record a demand signal when a query returns zero results (B-03)
_record_demand_signal() {
  local keyword="$1"
  local project="${2:-}"
  local demand_dir="${BRAIN_DIR:-${CLAUDE_PROJECT_DIR:-.}/.brain}/_demand"

  mkdir -p "$demand_dir" 2>/dev/null || return 0

  local ts
  ts=$(date -u +%Y%m%d-%H%M%S 2>/dev/null || echo "unknown")
  local iso_ts
  iso_ts=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "unknown")

  local filename="${ts}-demand-${keyword}.json"
  # Sanitize filename
  filename=$(echo "$filename" | sed 's/[^a-zA-Z0-9._-]/-/g')

  jq -n --arg kw "$keyword" \
        --arg proj "$project" \
        --arg ts "$iso_ts" \
        '{keyword: $kw, project: $proj, timestamp: $ts, type: "demand_signal"}' \
        > "$demand_dir/$filename" 2>/dev/null || true
}

# Query brain for entries matching a keyword. Returns JSON array of matches.
# Usage: brain_retrieve_context <keyword> [project] [max_results]
brain_retrieve_context() {
  local keyword="$1"
  local project="${2:-}"
  local max_results="${3:-3}"

  local project_dir="${CLAUDE_PROJECT_DIR:-.}"
  local brain_dir="${BRAIN_DIR:-$project_dir/.brain}"

  if [ ! -d "$brain_dir" ]; then
    echo "[]"
    return 0
  fi

  local search_path="$brain_dir"
  if [ -n "$project" ]; then
    if [ -d "$brain_dir/$project" ]; then
      search_path="$brain_dir/$project"
    else
      echo "[]"
      return 0
    fi
  fi

  # Find matching files
  local matching_files
  matching_files=$(grep -rlFi "$keyword" "$search_path" 2>/dev/null | head -n "$max_results" || true)

  if [ -z "$matching_files" ]; then
    # B-03: Record demand signal for zero-result queries
    _record_demand_signal "$keyword" "$project"
    echo "[]"
    return 0
  fi

  # Build JSON array of matches
  local results="["
  local first=true
  while IFS= read -r file; do
    [ -f "$file" ] || continue
    case "$file" in *.json) ;; *) continue ;; esac

    local entry
    entry=$(jq -c '{
      title: .title,
      category: .category,
      content: (.content | if length > 200 then .[:200] + "..." else . end),
      created_at: .created_at,
      file: input_filename
    }' --arg fn "$file" "$file" 2>/dev/null | tr -d '\r') || continue

    if [ "$first" = "true" ]; then
      first=false
    else
      results+=","
    fi
    results+="$entry"
  done <<< "$matching_files"

  results+="]"
  echo "$results"
}

# Format brain entries as a readable context string for injection
# Usage: brain_format_context <json_array>
brain_format_context() {
  local json_array="$1"
  local count
  count=$(echo "$json_array" | tr -d '\r' | jq 'length' 2>/dev/null || echo "0")

  if [ "$count" = "0" ]; then
    echo ""
    return 0
  fi

  local output="[Brain Context: $count relevant entries]\n"
  echo "$json_array" | tr -d '\r' | jq -r '.[] | "- [\(.category)] \(.title): \(.content)"' 2>/dev/null | while IFS= read -r line; do
    output+="$line\n"
  done

  echo -e "$output"
}

# Extract keywords from tool content for brain search
# Usage: brain_extract_keywords <content>
brain_extract_keywords() {
  local content="$1"
  # Extract meaningful words (4+ chars, skip common words)
  echo "$content" | \
    tr '[:upper:]' '[:lower:]' | \
    grep -oE '[a-z]{4,}' | \
    grep -vE '^(this|that|with|from|have|been|were|will|would|could|should|into|than|then|them|their|there|these|those|what|when|where|which|while|about|after|before|between|through|during)$' | \
    sort -u | \
    head -5 | \
    tr '\n' ' '
}
