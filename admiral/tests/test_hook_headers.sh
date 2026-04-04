#!/bin/bash
# Admiral Framework — Hook Header Compliance Test (Q-03)
# Verifies all hook scripts have mandatory header fields per ADMIRAL_STYLE.md.
# Required: #!/bin/bash, "Admiral Framework" description, set -euo pipefail
# Exit code: 0 = all pass, 1 = violations found
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOKS_DIR="$PROJECT_DIR/.hooks"

PASS=0
FAIL=0
ERRORS=""

echo "=== Hook Header Compliance (Q-03) ==="
echo ""

for hook_file in "$HOOKS_DIR"/*.sh; do
  [ -f "$hook_file" ] || continue
  basename=$(basename "$hook_file")

  # Skip test directories
  [ -d "$hook_file" ] && continue

  HOOK_PASS=true

  # 1. Must start with #!/bin/bash
  FIRST_LINE=$(head -1 "$hook_file")
  if [ "$FIRST_LINE" != "#!/bin/bash" ]; then
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $basename — missing #!/bin/bash shebang\n"
    echo "  [FAIL] $basename — missing #!/bin/bash shebang"
    HOOK_PASS=false
  fi

  # 2. Must have "Admiral Framework" in first 5 lines (purpose comment)
  if ! head -5 "$hook_file" | grep -q "Admiral Framework"; then
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $basename — missing 'Admiral Framework' in header\n"
    echo "  [FAIL] $basename — missing 'Admiral Framework' in header"
    HOOK_PASS=false
  fi

  # 3. Must have purpose description (line starting with # that describes function)
  COMMENT_LINES=$(head -10 "$hook_file" | grep -c '^#' 2>/dev/null) || COMMENT_LINES=0
  if [ "$COMMENT_LINES" -lt 2 ]; then
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $basename — insufficient header comments (need >= 2 comment lines)\n"
    echo "  [FAIL] $basename — insufficient header comments"
    HOOK_PASS=false
  fi

  # 4. Must have set -euo pipefail (within first 20 lines)
  if ! head -20 "$hook_file" | grep -q 'set -euo pipefail'; then
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $basename — missing 'set -euo pipefail'\n"
    echo "  [FAIL] $basename — missing 'set -euo pipefail'"
    HOOK_PASS=false
  fi

  # 5. Must document exit behavior (exit, advisory, hard-block, fail-open, or similar)
  if ! head -10 "$hook_file" | grep -qiE '(exit [0-9]|advisory|hard-block|fail-open|fail-closed|never blocks|always exit|NEVER hard)'; then
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $basename — header doesn't document exit behavior\n"
    echo "  [FAIL] $basename — header doesn't document exit behavior"
    HOOK_PASS=false
  fi

  if [ "$HOOK_PASS" = "true" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $basename"
  fi
done

# Also check admiral/lib/ scripts
echo ""
echo "--- Library header compliance ---"

for lib_file in "$PROJECT_DIR/admiral/lib/"*.sh; do
  [ -f "$lib_file" ] || continue
  basename=$(basename "$lib_file")

  LIB_PASS=true

  # Libraries must have shebang and Admiral Framework header
  FIRST_LINE=$(head -1 "$lib_file")
  if [ "$FIRST_LINE" != "#!/bin/bash" ]; then
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] lib/$basename — missing #!/bin/bash shebang\n"
    echo "  [FAIL] lib/$basename — missing #!/bin/bash shebang"
    LIB_PASS=false
  fi

  if ! head -5 "$lib_file" | grep -q "Admiral Framework"; then
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] lib/$basename — missing 'Admiral Framework' in header\n"
    echo "  [FAIL] lib/$basename — missing 'Admiral Framework' in header"
    LIB_PASS=false
  fi

  if [ "$LIB_PASS" = "true" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] lib/$basename"
  fi
done

# ─── Summary ─────────────────────────────────────────────────────────

echo ""
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Violations:"
  printf '%b' "$ERRORS"
  exit 1
fi

echo "  All scripts comply with header standard."
exit 0
