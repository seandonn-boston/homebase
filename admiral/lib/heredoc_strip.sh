#!/bin/bash
# Admiral Framework — Command Data Stripper
# Shared utility for enforcement hooks that scan Bash commands.
#
# Problem: tool_input.command includes non-command data (heredoc bodies,
# echo/printf arguments, commit messages) as part of the command string.
# Pattern scanners (grep -E) match against the full string, causing false
# positives when documentation text contains substrings like "rm" (in
# "transforms"), "--no-verify" (in commit messages), "sudo" (in echo
# output), or ">" (in markdown blockquotes).
#
# Solution: strip data content before pattern scanning. Only the actual
# command structure is returned; heredoc bodies, echo/printf arguments,
# and git commit -m messages are excluded.
#
# Known limitations (acceptable — these hooks are speed bumps, not security):
#   - Does not strip: subshell content $(...), eval arguments, bash -c "..."
#   - Unquoted echo args are not stripped (rare in practice)
#   - An adversarial agent could hide commands inside stripped regions
#   - See aiStrat/admiral/reference/spec-debt.md for full discussion
#
# Usage:
#   source admiral/lib/heredoc_strip.sh
#   CMD_FOR_SCAN=$(strip_data_from_command "$COMMAND")

# Legacy alias — hooks may still reference the old name
strip_heredoc_content() { strip_data_from_command "$@"; }

strip_data_from_command() {
  local cmd="$1"
  # Phase 1: Strip heredoc bodies.
  # Keeps the command line (e.g., "cat > file << 'EOF'") but removes
  # all lines between the heredoc start and its closing delimiter.
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
  ' | \
  # Phase 2: Strip quoted arguments from data-producing commands.
  # echo/printf arguments are output data, not commands to execute.
  # git commit -m messages are content, not flags.
  # Word boundaries (\b) prevent matching function names like "echo_log".
  sed -E \
    -e "s/\b(echo|printf)\b([[:space:]]+-[a-zA-Z]+)*[[:space:]]+'[^']*'/\1\2/g" \
    -e 's/\b(echo|printf)\b([[:space:]]+-[a-zA-Z]+)*[[:space:]]+"[^"]*"/\1\2/g' \
    -e "s/(-m)[[:space:]]+'[^']*'/\1/g" \
    -e 's/(-m)[[:space:]]+"[^"]*"/\1/g'
}
