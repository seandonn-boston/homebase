# PLAN2.md — Remaining / Incorrectly Built Items from plan.md

Review date: 2026-03-18

## Summary

All 8 phases (30 items) from `plan.md` have been implemented. Build succeeds and all 129 tests pass. Two minor issues were identified:

---

## Issue 1: Incomplete "why" comments in `scope_boundary_guard.sh` (Phase 8b — Partial)

**Plan requirement:** Phase 8b item 3 specifies:
> `.hooks/scope_boundary_guard.sh` — explain the regex patterns used for path matching

**Current state:** The file has comments explaining **what** each protected directory is and **why** it's protected (lines 41–43), but does **not** explain the matching patterns themselves:

1. **Line 70:** `"$PROTECTED"*|*"$PROTECTED"*` — No comment explaining why both prefix match **and** substring match are used (e.g., to catch both absolute and relative path references).
2. **Line 82:** `grep -qE '(rm |mv |cp |sed -i|chmod |chown |>|>>|tee )'` — No comment explaining why these specific commands constitute "write operations" or why the trailing space is significant (to avoid false positives on substrings like `rmdir` vs `rm`).

**Fix:** Add inline comments explaining the pattern design choices:

```bash
# Match both prefix ("aiStrat/foo") and substring ("/full/path/to/aiStrat/foo")
# to catch absolute paths, relative paths, and paths embedded in commands.
case "$REL_PATH" in
  "$PROTECTED"*|*"$PROTECTED"*)

# Detect write operations in Bash commands. Trailing spaces prevent substring
# false positives (e.g., "rmdir" won't match "rm "). Covers: file deletion (rm),
# moves (mv), copies (cp), in-place edits (sed -i), permission changes (chmod/chown),
# and output redirection (>, >>, tee).
if echo "$COMMAND" | grep -qE '(rm |mv |cp |sed -i|chmod |chown |>|>>|tee )'; then
```

---

## Issue 2: ShellCheck severity mismatch for test scripts (Phase 4a — Minor Deviation)

**Plan requirement:** Phase 4a specifies:
> ```yaml
> - name: ShellCheck test scripts
>   run: shellcheck -s bash -S info .hooks/tests/*.sh admiral/tests/*.sh
> ```

**Current state:** `.github/workflows/hook-tests.yml` line 26 uses `-S error` instead of `-S info`:
```yaml
run: shellcheck -s bash -S error .hooks/tests/*.sh admiral/tests/*.sh
```

**Impact:** `-S error` is **stricter** than the planned `-S info` — it only reports errors, suppressing warnings and info-level findings. The plan intended `-S info` to surface more findings in test scripts at a non-blocking severity. This is arguably fine (fewer false positives in CI), but deviates from the plan.

**Fix (optional):** Change `-S error` to `-S info` to match the plan, or document the intentional deviation.

---

## All Other Items: Verified Complete

| Phase | Items | Status |
|-------|-------|--------|
| 1. Bug Fixes (1a, 1b, 1c) | 3/3 | Done |
| 2. Performance (2a, 2b, 2c) | 3/3 | Done |
| 3. Test Coverage (3a, 3b, 3c, 3d, 3e) | 5/5 | Done |
| 4. Code Quality Tooling (4a, 4b, 4c) | 3/3 | Done (4a minor deviation noted above) |
| 5. Architecture & Error Handling (5a–5e) | 5/5 | Done |
| 6. Contributor Experience (6a, 6b, 6c) | 3/3 | Done |
| 7. CI Hardening (7a, 7b, 7c, 7d) | 4/4 | Done |
| 8. Documentation & Polish (8a, 8b, 8c, 8d) | 4/4 | Done (8b partial for one file) |
| **Total** | **30/30** | **28 fully done, 2 minor issues** |

### Verification Results

- **Build:** `npm run build` — clean, zero errors
- **Tests:** `npm test` — 129 tests, 129 pass, 0 fail
- **Test suites:** 15 suites across 6 test files (runaway-detector, events-trace-ingest, ring-buffer, server, cli, integration)
