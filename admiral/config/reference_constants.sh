#!/bin/bash
# Admiral Framework — Reference Constants Registry
# Machine-readable registry of all constants from reference-constants.md
# Source: aiStrat/admiral/reference/reference-constants.md
# Usage: source this file to load constants, or run directly to list them.
#
# Each constant is defined as a shell variable with a comment containing:
#   Section, spec source, and brief description.

# ============================================================
# Tool Token Estimation
# ============================================================
TOOL_TOKENS_BASH=500
TOOL_TOKENS_READ=1000
TOOL_TOKENS_WRITE=800
TOOL_TOKENS_EDIT=600
TOOL_TOKENS_GLOB=300
TOOL_TOKENS_GREP=500
TOOL_TOKENS_WEBFETCH=2000
TOOL_TOKENS_WEBSEARCH=1500
TOOL_TOKENS_AGENT=5000
TOOL_TOKENS_NOTEBOOKEDIT=800
TOOL_TOKENS_DEFAULT=500

# ============================================================
# Context Budget Validation
# ============================================================
CONTEXT_STANDING_MIN_PCT=15
CONTEXT_STANDING_MAX_PCT=25
CONTEXT_SESSION_MIN_PCT=50
CONTEXT_SESSION_MAX_PCT=65
CONTEXT_WORKING_MIN_PCT=20
CONTEXT_WORKING_MAX_PCT=30
CONTEXT_ALLOCATION_SUM=100

# ============================================================
# Token Budget Alert Thresholds
# ============================================================
TOKEN_ALERT_ESCALATION_PCT=90
TOKEN_ALERT_WARNING_PCT=80

# ============================================================
# Loop Detection Thresholds
# ============================================================
LOOP_MAX_SAME_ERROR=3
LOOP_MAX_TOTAL_ERRORS=10
LOOP_SUCCESS_DECAY=1

# ============================================================
# Self-Healing Behavioral Details
# ============================================================
SELF_HEAL_MAX_RETRIES=3
SELF_HEAL_MAX_SESSION_RETRIES=10
SELF_HEAL_RETRY_CONFIG_MIN=1
SELF_HEAL_RETRY_CONFIG_MAX=5

# ============================================================
# Exit Code Conventions
# ============================================================
EXIT_PASS=0
EXIT_FAIL_SOFT=1
EXIT_BLOCK_HARD=2

# ============================================================
# Fleet and Work Constants
# ============================================================
FLEET_MIN_AGENTS=1
FLEET_MAX_AGENTS=12
CHUNK_BUDGET_CEILING_PCT=40
STANDING_CONTEXT_MAX_LINES=150

# ============================================================
# Hook Timeout Defaults (milliseconds)
# ============================================================
HOOK_TIMEOUT_DEFAULT_MS=30000
HOOK_TIMEOUT_TOKEN_BUDGET_GATE_MS=5000
HOOK_TIMEOUT_TOKEN_BUDGET_TRACKER_MS=5000
HOOK_TIMEOUT_LOOP_DETECTOR_MS=5000
HOOK_TIMEOUT_CONTEXT_BASELINE_MS=10000
HOOK_TIMEOUT_CONTEXT_HEALTH_CHECK_MS=10000
HOOK_TIMEOUT_IDENTITY_VALIDATION_MS=10000
HOOK_TIMEOUT_GOVERNANCE_HEARTBEAT_MS=10000
HOOK_TIMEOUT_MIN_MS=100
HOOK_TIMEOUT_MAX_MS=300000

# ============================================================
# Context Health Check
# ============================================================
CONTEXT_HEALTH_CHECK_FREQUENCY=10

# ============================================================
# Governance Heartbeat Monitor
# ============================================================
HEARTBEAT_DEFAULT_INTERVAL_S=60
HEARTBEAT_MISSED_THRESHOLD=2
HEARTBEAT_CONFIDENCE_FLOOR=0.5

# ============================================================
# Context Window Absolute Ceilings
# ============================================================
STANDING_CONTEXT_CEILING_TOKENS=50000
STANDING_CONTEXT_WARNING_TOKENS=45000
CONTEXT_STUFFING_THRESHOLD_PCT=60

# ============================================================
# Token Depletion and Chunk Sizing
# ============================================================
QUALITY_DEGRADATION_ONSET_PCT=60
OVER_DECOMPOSITION_SIGNAL_PCT=20

# ============================================================
# Swarm Pattern Constants
# ============================================================
SWARM_WORKER_HEARTBEAT_TIMEOUT_S=60
SWARM_ERROR_RATE_THRESHOLD_PCT=30

# ============================================================
# Quality & Health Metric Thresholds — Execution Quality
# ============================================================
QUALITY_FIRST_PASS_HEALTHY_PCT=75
QUALITY_FIRST_PASS_CRITICAL_PCT=50
QUALITY_REWORK_HEALTHY_PCT=10
QUALITY_REWORK_CRITICAL_PCT=20
QUALITY_SELF_HEAL_HEALTHY_PCT=80
QUALITY_SELF_HEAL_CRITICAL_PCT=50
QUALITY_ASSUMPTION_HEALTHY_PCT=85
QUALITY_ASSUMPTION_CRITICAL_PCT=70
QUALITY_HANDOFF_REJECTION_HEALTHY_PCT=5
QUALITY_HANDOFF_REJECTION_CRITICAL_PCT=15

# ============================================================
# Quality & Health Metric Thresholds — Cost & Efficiency
# ============================================================
EFFICIENCY_IDLE_TIME_HEALTHY_PCT=15
EFFICIENCY_IDLE_TIME_CRITICAL_PCT=25
EFFICIENCY_ORCHESTRATOR_OVERHEAD_MONITOR_PCT=20
EFFICIENCY_ORCHESTRATOR_OVERHEAD_CAUTION_PCT=25
EFFICIENCY_ORCHESTRATOR_OVERHEAD_ALERT_PCT=35
EFFICIENCY_ORCHESTRATOR_OVERHEAD_CRITICAL_PCT=50

# ============================================================
# Admiral Fallback Decomposer Mode
# ============================================================
FALLBACK_DETECTION_MISSED_HEARTBEATS=3
FALLBACK_DETECTION_WINDOW_S=30
FALLBACK_DURATION_LIMIT_S=300
FALLBACK_EXIT_STABLE_INTERVALS=3
FALLBACK_STABLE_INTERVAL_S=30

# ============================================================
# A2A Protocol Constants
# ============================================================
A2A_REQUEST_TIMEOUT_S=300

# ============================================================
# Brain Configuration — Query Defaults
# ============================================================
BRAIN_QUERY_DEFAULT_LIMIT=10
BRAIN_QUERY_MAX_LIMIT=50
BRAIN_COSINE_MIN_SCORE=0.7

# ============================================================
# Brain Configuration — Token Lifecycle
# ============================================================
BRAIN_TOKEN_DEFAULT_LIFETIME_S=3600
BRAIN_TOKEN_MAX_LIFETIME_S=14400
BRAIN_TOKEN_ROTATION_INTERVAL_S=3600
BRAIN_TOKEN_REVOCATION_PROPAGATION_S=10

# ============================================================
# Brain Configuration — Decay and Graduation
# ============================================================
BRAIN_DECAY_AWARENESS_DAYS=90
BRAIN_B1_B2_GRADUATION_MISSED_RATE_PCT=30
BRAIN_B1_B2_GRADUATION_WINDOW_DAYS=14
BRAIN_B2_PERFORMANCE_LIMIT=10000

# ============================================================
# Decision Authority Reference Defaults
# ============================================================
# (Defined as tier names, not numeric — see reference-constants.md)
DA_TOKEN_BUDGET="ENFORCED"
DA_LOOP_DETECTION="ENFORCED"
DA_CODE_PATTERN_VIOLATIONS="AUTONOMOUS"
DA_TEST_COVERAGE="AUTONOMOUS"
DA_DOC_UPDATES="AUTONOMOUS"
DA_ARCHITECTURE_CHANGES="PROPOSE"
DA_DEPENDENCY_UPGRADES="PROPOSE"
DA_ENFORCEMENT_CONFIG="ESCALATE"
DA_SECURITY_DECISIONS="ESCALATE"
DA_SCOPE_CONTRADICTIONS="ESCALATE"

# ============================================================
# Spec-Gap Resolved — Brain Level Advancement
# ============================================================
BRAIN_RETRIEVAL_HIT_RATE_MIN_PCT=85
BRAIN_RETRIEVAL_PRECISION_MIN_PCT=90
BRAIN_KNOWLEDGE_REUSE_MIN_PCT=30
BRAIN_IMPROVEMENT_THRESHOLD_PCT=5

# ============================================================
# Spec-Gap Resolved — Brain Supersession
# ============================================================
BRAIN_SUPERSESSION_HEALTHY_PCT=10
BRAIN_SUPERSESSION_WARNING_PCT=15

# ============================================================
# Spec-Gap Resolved — Over-Decomposition
# ============================================================
OVERDECOMP_REDECOMPOSE_CONSECUTIVE=2
OVERDECOMP_SESSION_PATTERN=3

# ============================================================
# Spec-Gap Resolved — Tactical vs Strategic
# ============================================================
SCOPE_EXPANSION_STRATEGIC_PCT=15
SCOPE_REDUCTION_STRATEGIC_PCT=10
DEADLINE_SHIFT_STRATEGIC_DAYS=7

# ============================================================
# Spec-Gap Resolved — Health Metric Yellow Zones
# ============================================================
YELLOW_FIRST_PASS_LOW_PCT=50
YELLOW_FIRST_PASS_HIGH_PCT=75
YELLOW_ASSUMPTION_LOW_PCT=70
YELLOW_ASSUMPTION_HIGH_PCT=85

# ============================================================
# Spec-Gap Resolved — Orchestrator Overhead
# ============================================================
ORCH_OVERHEAD_NORMAL_PCT=20
ORCH_OVERHEAD_MONITOR_PCT=25
ORCH_OVERHEAD_CAUTION_PCT=35
ORCH_OVERHEAD_ALERT_PCT=50

# ============================================================
# Spec-Gap Resolved — Context Loading Position
# ============================================================
STANDING_CONTEXT_POSITION_MIN_PCT=5
STANDING_CONTEXT_POSITION_MAX_PCT=10

# ============================================================
# Spec-Gap Resolved — QA Confidence Levels
# ============================================================
QA_VERIFIED_TEST_CASES=2
QA_ASSESSED_REVIEW_PCT=50
QA_ASSUMED_SPOT_CHECK_PCT=10

# ============================================================
# Spec-Gap Resolved — Sycophantic Drift
# ============================================================
DRIFT_FINDING_DECLINE_PCT=30

# ============================================================
# Spec-Gap Resolved — Admiral Trust Promotion
# ============================================================
TRUST_CONSECUTIVE_SUCCESS=5

# ============================================================
# Spec-Gap Resolved — Context Honesty Confidence
# ============================================================
CONTEXT_HONESTY_MIN_CONFIDENCE_PCT=80

# ============================================================
# Spec-Gap Resolved — Headless Agent Authority
# ============================================================
# Authority shifts 1 tier down: Autonomous→Propose, Propose→Escalate

# ============================================================
# Spec-Gap Resolved — Escalation Rate
# ============================================================
ESCALATION_DECLINE_RATE_MIN_PCT=5
ESCALATION_DECLINE_RATE_MAX_PCT=10
ESCALATION_PLATEAU_SESSIONS=3

# ============================================================
# LLM-Last Design Constants
# ============================================================
LLM_CALL_ELIMINATION_RATE_MIN_PCT=30
LLM_CALL_ELIMINATION_RATE_MAX_PCT=60
LLM_ECONOMY_COST_RATIO=30

# ============================================================
# Minimum Dependency Set — Versions
# ============================================================
DEP_PYTHON_MIN="3.11"
DEP_PYDANTIC_MIN="2.5.0"
DEP_JSONSCHEMA_MIN="4.20.0"
DEP_PYTEST_MIN="8.0"

# ============================================================
# If run directly (not sourced), list all constants
# ============================================================
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "=== Admiral Reference Constants Registry ==="
  echo "Source: aiStrat/admiral/reference/reference-constants.md"
  echo ""
  # Count and list all defined constants
  count=0
  while IFS= read -r line; do
    if [[ "$line" =~ ^[A-Z_]+=.* ]]; then
      varname="${line%%=*}"
      value="${line#*=}"
      # Strip quotes
      value="${value%\"}"
      value="${value#\"}"
      printf "  %-50s = %s\n" "$varname" "$value"
      count=$((count + 1))
    fi
  done < "${BASH_SOURCE[0]}"
  echo ""
  echo "Total constants: $count"
fi
