#!/bin/bash
# Admiral Framework — Heredoc Content Stripper
# Shared utility for enforcement hooks that scan Bash commands.
#
# Problem: tool_input.command includes heredoc body text as part of the
# command string. Pattern scanners (grep -E) match against the full string,
# causing false positives when documentation text inside heredocs contains
# substrings like "rm" (in "transforms"), "sudo" (in text), or ">" (in markdown).
#
# Solution: strip heredoc bodies before pattern scanning. Only the actual
# command lines are returned; heredoc bodies (data, not commands) are excluded.
#
# Usage:
#   source admiral/lib/heredoc_strip.sh
#   CMD_FOR_SCAN=$(strip_heredoc_content "$COMMAND")

strip_heredoc_content() {
  local cmd="$1"
  printf '%s\n' "$cmd" | awk '
    BEGIN { skip=0 }
    skip {
      t=$0; gsub(/^[[:space:]]+|[[:space:]]+$/, "", t)
      if (t == delim) skip=0
      next
    }
    /<<-?[[:space:]]*["'"'"'\\]?[A-Za-z_]/ {
      line=$0
      sub(/.*<<-?[[:space:]]*/, "", line)
      gsub(/["'"'"'\\]/, "", line)
      gsub(/[[:space:]]*$/, "", line)
      if (line != "") { delim=line; skip=1 }
    }
    { print }
  '
}
