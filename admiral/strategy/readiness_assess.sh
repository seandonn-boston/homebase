#!/bin/bash
# readiness_assess.sh — Assess project readiness for Admiral fleet deployment.
#
# Usage: readiness_assess.sh <project_root> [ground_truth_path]
#   project_root:       Root directory of the project to assess.
#   ground_truth_path:  Path to ground-truth.yaml (default: <project_root>/ground-truth.yaml)
#
# Outputs one of three readiness states per Part 1:
#   Ready          — Full fleet operations at any profile.
#   Partially Ready — Starter profile only. Enforcement limited to universal constraints.
#   Not Ready      — Fleet deployment produces Governance Theater.
#
# Exit codes: 0=Ready, 1=Partially Ready, 2=Not Ready, 3=usage error
# Spec ref: Part 1 — Project Readiness Assessment
# SO ref: SO-15 (Pre-Work Validation)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $# -lt 1 ]]; then
  echo "Usage: readiness_assess.sh <project_root> [ground_truth_path]" >&2
  exit 3
fi

PROJECT_ROOT="$1"
GT_PATH="${2:-${PROJECT_ROOT}/ground-truth.yaml}"

if [[ ! -d "${PROJECT_ROOT}" ]]; then
  echo "ERROR: Project root not found: ${PROJECT_ROOT}" >&2
  exit 3
fi

# ── Check categories ──────────────────────────────────────────────────────

PASS=0
FAIL=0
WARN=0
DETAILS=""

check_pass() {
  local label="$1"
  PASS=$((PASS + 1))
  DETAILS="${DETAILS}  PASS: ${label}\n"
}

check_fail() {
  local label="$1"
  FAIL=$((FAIL + 1))
  DETAILS="${DETAILS}  FAIL: ${label}\n"
}

check_warn() {
  local label="$1"
  WARN=$((WARN + 1))
  DETAILS="${DETAILS}  WARN: ${label}\n"
}

# ── 1. Ground Truth completeness ──────────────────────────────────────────

echo "=== Admiral Project Readiness Assessment ==="
echo "Project: ${PROJECT_ROOT}"
echo "Ground Truth: ${GT_PATH}"
echo ""
echo "--- Checks ---"

if [[ -f "${GT_PATH}" ]]; then
  # Run the validator
  if "${SCRIPT_DIR}/validate_ground_truth.sh" "${GT_PATH}" > /dev/null 2>&1; then
    check_pass "Ground Truth exists and all required fields present"
  else
    check_warn "Ground Truth exists but has empty required fields"
  fi
else
  check_fail "Ground Truth document not found at ${GT_PATH}"
fi

# ── 2. CI configuration ──────────────────────────────────────────────────

CI_FOUND=false
for ci_path in \
  "${PROJECT_ROOT}/.github/workflows" \
  "${PROJECT_ROOT}/.gitlab-ci.yml" \
  "${PROJECT_ROOT}/Jenkinsfile" \
  "${PROJECT_ROOT}/.circleci" \
  "${PROJECT_ROOT}/.travis.yml"; do
  if [[ -e "${ci_path}" ]]; then
    CI_FOUND=true
    break
  fi
done

if [[ "${CI_FOUND}" == "true" ]]; then
  check_pass "CI configuration found"
else
  check_fail "No CI configuration found (checked GitHub Actions, GitLab CI, Jenkins, CircleCI, Travis)"
fi

# ── 3. Test suite ─────────────────────────────────────────────────────────

TESTS_FOUND=false

# Check for common test patterns
if [[ -f "${PROJECT_ROOT}/package.json" ]] && grep -q '"test"' "${PROJECT_ROOT}/package.json" 2>/dev/null; then
  TESTS_FOUND=true
elif find "${PROJECT_ROOT}" -maxdepth 3 -name "*.test.*" -o -name "*.spec.*" -o -name "test_*.sh" 2>/dev/null | head -1 | grep -q .; then
  TESTS_FOUND=true
elif [[ -d "${PROJECT_ROOT}/tests" || -d "${PROJECT_ROOT}/test" || -d "${PROJECT_ROOT}/__tests__" ]]; then
  TESTS_FOUND=true
fi

if [[ "${TESTS_FOUND}" == "true" ]]; then
  check_pass "Test suite found"
else
  check_fail "No test suite found"
fi

# ── 4. Linter configuration ──────────────────────────────────────────────

LINTER_FOUND=false
for linter_path in \
  "${PROJECT_ROOT}/.eslintrc"* \
  "${PROJECT_ROOT}/eslint.config"* \
  "${PROJECT_ROOT}/.prettierrc"* \
  "${PROJECT_ROOT}/prettier.config"* \
  "${PROJECT_ROOT}/.shellcheckrc" \
  "${PROJECT_ROOT}/pyproject.toml" \
  "${PROJECT_ROOT}/.flake8" \
  "${PROJECT_ROOT}/.rubocop.yml" \
  "${PROJECT_ROOT}/.golangci.yml" \
  "${PROJECT_ROOT}/tsconfig.json"; do
  if [[ -e "${linter_path}" ]]; then
    LINTER_FOUND=true
    break
  fi
done

if [[ "${LINTER_FOUND}" == "true" ]]; then
  check_pass "Linter configuration found"
else
  check_warn "No linter configuration found"
fi

# ── 5. Documented conventions ─────────────────────────────────────────────

CONVENTIONS_FOUND=false
for doc_path in \
  "${PROJECT_ROOT}/CONTRIBUTING.md" \
  "${PROJECT_ROOT}/AGENTS.md" \
  "${PROJECT_ROOT}/CLAUDE.md" \
  "${PROJECT_ROOT}/CONVENTIONS.md" \
  "${PROJECT_ROOT}/.editorconfig"; do
  if [[ -f "${doc_path}" ]]; then
    CONVENTIONS_FOUND=true
    break
  fi
done

if [[ "${CONVENTIONS_FOUND}" == "true" ]]; then
  check_pass "Documented conventions found"
else
  check_warn "No documented conventions found (CONTRIBUTING.md, AGENTS.md, .editorconfig, etc.)"
fi

# ── Determine readiness state ────────────────────────────────────────────

echo -e "${DETAILS}"
echo "--- Result ---"
echo "Pass: ${PASS}  Warn: ${WARN}  Fail: ${FAIL}"
echo ""

if [[ ${FAIL} -eq 0 && ${WARN} -eq 0 ]]; then
  echo "READINESS: Ready"
  echo "Full fleet operations permitted at any profile."
  exit 0
elif [[ ${FAIL} -eq 0 ]]; then
  echo "READINESS: Partially Ready"
  echo "Starter profile only. Enforcement limited to universal constraints."
  echo ""
  echo "To reach Ready:"
  echo "  - Address all WARN items above."
  exit 1
else
  echo "READINESS: Not Ready"
  echo "Fleet deployment would produce Governance Theater."
  echo ""
  echo "Preparation path (Part 1):"
  echo "  1. Assess — Which readiness state is this project in? (You are here: Not Ready)"
  echo "  2. Prepare — Create or complete Ground Truth. Document conventions. Establish CI/tests."
  echo "  3. Verify — Run this assessment again."
  echo "  4. Deploy — Enter Standup lifecycle with Starter profile."
  exit 2
fi
