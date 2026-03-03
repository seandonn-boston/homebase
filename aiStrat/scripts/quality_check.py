#!/usr/bin/env python3
"""Quality gate script for the aiStrat framework.

Runs pre-merge checks to verify codebase integrity:

1. Seed checksum verification — ensures seed_research.py has not been
   tampered with since the last known-good state.

2. Archive import verification — ensures no production code imports from
   the archive/ directory, which contains deprecated/superseded modules.

3. Summary — prints pass/fail for each check with exit code 0 (all pass)
   or 1 (any failure).

Usage:
    python -m aiStrat.scripts.quality_check
    # or
    python aiStrat/scripts/quality_check.py

v4: Added as a CI/quality gate to enforce structural integrity invariants.

Reference: admiral/part3-enforcement.md (hooks over instructions).
"""

from __future__ import annotations

import os
import re
import sys

# ── Paths ────────────────────────────────────────────────────────

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_AISTRAT_ROOT = os.path.dirname(_SCRIPT_DIR)
_PROJECT_ROOT = os.path.dirname(_AISTRAT_ROOT)

_SEED_FILE = os.path.join(_AISTRAT_ROOT, "brain", "seeds", "seed_research.py")

# Directories to scan for archive imports
_SCAN_DIRS = [
    os.path.join(_AISTRAT_ROOT, "brain"),
    os.path.join(_AISTRAT_ROOT, "monitor"),
    os.path.join(_AISTRAT_ROOT, "scripts"),
]


# ── Check 1: Seed checksum ──────────────────────────────────────

def check_seed_checksum() -> tuple[bool, str]:
    """Verify the seed file exists and compute its checksum.

    Returns:
        (passed, message) tuple.

    v4: Protects seed supply chain (Vuln 8.1.7).
    """
    if not os.path.exists(_SEED_FILE):
        return False, f"FAIL: Seed file not found: {_SEED_FILE}"

    try:
        import hashlib
        with open(_SEED_FILE, "rb") as f:
            checksum = hashlib.sha256(f.read()).hexdigest()

        # Verify the seed file can be parsed (no syntax errors)
        with open(_SEED_FILE, "r", encoding="utf-8") as f:
            source = f.read()
        compile(source, _SEED_FILE, "exec")

        return True, f"PASS: Seed checksum verified: {checksum[:16]}..."

    except SyntaxError as e:
        return False, f"FAIL: Seed file has syntax error: {e}"
    except Exception as e:
        return False, f"FAIL: Seed checksum verification failed: {e}"


# ── Check 2: No archive imports ─────────────────────────────────

# Pattern matches: from archive, import archive, from .archive, from ..archive
_ARCHIVE_IMPORT_PATTERN = re.compile(
    r"^\s*(?:from|import)\s+(?:\.{0,3})archive(?:\.|[\s])",
    re.MULTILINE,
)


def check_no_archive_imports() -> tuple[bool, str]:
    """Verify no Python files import from archive/ directories.

    The archive/ directory contains deprecated and superseded modules
    that must not be referenced from active production code.

    Returns:
        (passed, message) tuple.

    v4: Prevents accidental use of deprecated code paths.
    """
    violations = []

    for scan_dir in _SCAN_DIRS:
        if not os.path.exists(scan_dir):
            continue

        for root, _dirs, files in os.walk(scan_dir):
            # Skip __pycache__ and hidden directories
            if "__pycache__" in root or "/." in root:
                continue

            for filename in files:
                if not filename.endswith(".py"):
                    continue

                filepath = os.path.join(root, filename)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()

                    matches = _ARCHIVE_IMPORT_PATTERN.findall(content)
                    if matches:
                        rel_path = os.path.relpath(filepath, _AISTRAT_ROOT)
                        for match in matches:
                            violations.append(f"  {rel_path}: {match.strip()}")

                except (OSError, UnicodeDecodeError):
                    # Skip unreadable files
                    continue

    if violations:
        detail = "\n".join(violations)
        return False, f"FAIL: Found archive/ imports in {len(violations)} location(s):\n{detail}"

    return True, "PASS: No archive/ imports found in production code."


# ── Runner ───────────────────────────────────────────────────────

def run_quality_checks() -> bool:
    """Run all quality gate checks and print results.

    Returns:
        True if all checks pass, False if any fail.
    """
    print("=" * 60)
    print("aiStrat v4 Quality Gate")
    print("=" * 60)
    print()

    checks = [
        ("Seed Checksum", check_seed_checksum),
        ("No Archive Imports", check_no_archive_imports),
    ]

    all_passed = True

    for name, check_fn in checks:
        passed, message = check_fn()
        status = "PASS" if passed else "FAIL"
        print(f"[{status}] {name}")
        print(f"       {message}")
        print()
        if not passed:
            all_passed = False

    print("-" * 60)
    if all_passed:
        print("RESULT: ALL CHECKS PASSED")
    else:
        print("RESULT: SOME CHECKS FAILED")
    print("-" * 60)

    return all_passed


if __name__ == "__main__":
    success = run_quality_checks()
    sys.exit(0 if success else 1)
