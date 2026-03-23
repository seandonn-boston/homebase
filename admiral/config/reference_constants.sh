#!/bin/bash
# Admiral Framework — Reference Constants Registry
# Machine-readable constants derived from aiStrat/admiral/reference/reference-constants.md
# Source this file in hooks and scripts to use spec-aligned constant values.
# All values here are the canonical implementation defaults; admiral/config.json
# may override some of them at runtime.
#
# Spec source: aiStrat/admiral/reference/reference-constants.md
# Generated for: SD-06 (Reference Constants Implementation Audit)

# --- Tool Token Estimation ---
readonly RC_TOKEN_BASH=500
readonly RC_TOKEN_READ=1000
readonly RC_TOKEN_WRITE=800
readonly RC_TOKEN_EDIT=600
readonly RC_TOKEN_GLOB=300
readonly RC_TOKEN_GREP=500
readonly RC_TOKEN_WEBFETCH=2000
readonly RC_TOKEN_WEBSEARCH=1500
readonly RC_TOKEN_AGENT=5000
readonly RC_TOKEN_NOTEBOOKEDIT=800
readonly RC_TOKEN_DEFAULT=500

# --- Context Budget Allocation (percentages, must sum to 100) ---
readonly RC_CONTEXT_STANDING_MIN_PCT=15
readonly RC_CONTEXT_STANDING_MAX_PCT=25
readonly RC_CONTEXT_SESSION_MIN_PCT=50
readonly RC_CONTEXT_SESSION_MAX_PCT=65
readonly RC_CONTEXT_WORKING_MIN_PCT=20
readonly RC_CONTEXT_WORKING_MAX_PCT=30

# --- Token Budget Alert Thresholds ---
readonly RC_BUDGET_WARNING_PCT=80
readonly RC_BUDGET_ESCALATION_PCT=90

# --- Loop Detection Thresholds ---
readonly RC_MAX_SAME_ERROR=3
readonly RC_MAX_TOTAL_ERRORS=10
readonly RC_SUCCESS_DECAY=1

# --- Self-Healing Behavioral Details ---
readonly RC_SELF_HEAL_MAX_RETRIES=3
readonly RC_SELF_HEAL_MAX_SESSION_RETRIES=10
readonly RC_SELF_HEAL_RETRY_MIN=1
readonly RC_SELF_HEAL_RETRY_MAX=5

# --- Exit Code Conventions ---
readonly RC_EXIT_PASS=0
readonly RC_EXIT_FAIL=1
readonly RC_EXIT_BLOCK=2

# --- Hook Timeout Defaults (milliseconds) ---
readonly RC_HOOK_TIMEOUT_DEFAULT=30000
readonly RC_HOOK_TIMEOUT_BUDGET=5000
readonly RC_HOOK_TIMEOUT_LOOP=5000
readonly RC_HOOK_TIMEOUT_CONTEXT_BASELINE=10000
readonly RC_HOOK_TIMEOUT_CONTEXT_HEALTH=10000
readonly RC_HOOK_TIMEOUT_IDENTITY=10000
readonly RC_HOOK_TIMEOUT_HEARTBEAT=10000
readonly RC_HOOK_TIMEOUT_MIN=100
readonly RC_HOOK_TIMEOUT_MAX=300000

# --- Hook Manifest Validation Patterns ---
readonly RC_HOOK_NAME_PATTERN='^[a-z][a-z0-9_]*$'
readonly RC_HOOK_VERSION_PATTERN='^\d+\.\d+\.\d+$'

# --- Context Health Check ---
readonly RC_HEALTH_CHECK_FREQUENCY=10

# --- Context Window Absolute Ceilings ---
readonly RC_STANDING_CONTEXT_CEILING=50000
readonly RC_STANDING_CONTEXT_WARNING=45000
readonly RC_CONTEXT_STUFFING_THRESHOLD_PCT=60

# --- Fleet and Work Constants ---
readonly RC_FLEET_MIN_AGENTS=1
readonly RC_FLEET_MAX_AGENTS=12
readonly RC_CHUNK_BUDGET_CEILING_PCT=40
readonly RC_STANDING_CONTEXT_MAX_LINES=150

# --- Token Depletion and Chunk Sizing ---
readonly RC_QUALITY_DEGRADATION_ONSET_PCT=60
readonly RC_OVER_DECOMPOSITION_THRESHOLD_PCT=20

# --- Governance Heartbeat Monitor ---
readonly RC_HEARTBEAT_INTERVAL_SEC=60
readonly RC_HEARTBEAT_MISSED_THRESHOLD=2
readonly RC_HEARTBEAT_CONFIDENCE_FLOOR=0.5

# --- Admiral Fallback Decomposer Mode ---
readonly RC_ORCH_FAILURE_MISSED_HEARTBEATS=3
readonly RC_ORCH_FAILURE_WINDOW_SEC=30
readonly RC_FALLBACK_DURATION_LIMIT_SEC=300
readonly RC_FALLBACK_EXIT_STABLE_INTERVALS=3
readonly RC_FALLBACK_STABLE_INTERVAL_SEC=30

# --- A2A Protocol ---
readonly RC_A2A_REQUEST_TIMEOUT_SEC=300

# --- Brain Query Defaults ---
readonly RC_BRAIN_DEFAULT_RESULT_LIMIT=10
readonly RC_BRAIN_MAX_RESULT_LIMIT=50
readonly RC_BRAIN_COSINE_MIN_SCORE=0.7

# --- Brain Token Lifecycle ---
readonly RC_BRAIN_TOKEN_LIFETIME_SEC=3600
readonly RC_BRAIN_TOKEN_MAX_LIFETIME_SEC=14400
readonly RC_BRAIN_TOKEN_ROTATION_SEC=3600
readonly RC_BRAIN_REVOCATION_PROPAGATION_SEC=10

# --- Brain Decay and Graduation ---
readonly RC_BRAIN_DECAY_WINDOW_DAYS=90
readonly RC_BRAIN_B1_B2_MISSED_RATE=30
readonly RC_BRAIN_B1_B2_EVAL_DAYS=14
readonly RC_BRAIN_B2_ENTRY_LIMIT=10000

# --- Swarm Pattern Constants ---
readonly RC_SWARM_HEARTBEAT_TIMEOUT_SEC=60
readonly RC_SWARM_ERROR_RATE_THRESHOLD_PCT=30

# --- Quality & Health Metric Thresholds ---
readonly RC_QUALITY_FIRST_PASS_HEALTHY_PCT=75
readonly RC_QUALITY_FIRST_PASS_CRITICAL_PCT=50
readonly RC_QUALITY_REWORK_HEALTHY_PCT=10
readonly RC_QUALITY_REWORK_CRITICAL_PCT=20
readonly RC_QUALITY_SELF_HEAL_HEALTHY_PCT=80
readonly RC_QUALITY_SELF_HEAL_CRITICAL_PCT=50
readonly RC_QUALITY_ASSUMPTION_HEALTHY_PCT=85
readonly RC_QUALITY_ASSUMPTION_CRITICAL_PCT=70
readonly RC_QUALITY_HANDOFF_HEALTHY_PCT=5
readonly RC_QUALITY_HANDOFF_CRITICAL_PCT=15

# --- Cost & Efficiency ---
readonly RC_EFFICIENCY_IDLE_HEALTHY_PCT=15
readonly RC_EFFICIENCY_IDLE_CRITICAL_PCT=25
readonly RC_EFFICIENCY_ORCH_OVERHEAD_NORMAL_PCT=20

# --- Orchestrator Overhead Graduated Response ---
readonly RC_ORCH_OVERHEAD_MONITOR_PCT=25
readonly RC_ORCH_OVERHEAD_CAUTION_PCT=35
readonly RC_ORCH_OVERHEAD_ALERT_PCT=50

# --- Standing Context Position ---
readonly RC_STANDING_CONTEXT_POSITION_PCT_MIN=5
readonly RC_STANDING_CONTEXT_POSITION_PCT_MAX=10

# --- Spec-Gap Resolved: Brain Level Advancement ---
readonly RC_BRAIN_RETRIEVAL_HIT_MIN_PCT=85
readonly RC_BRAIN_PRECISION_MIN_PCT=90
readonly RC_BRAIN_REUSE_MIN_PCT=30
readonly RC_BRAIN_IMPROVEMENT_MIN_PCT=5

# --- Spec-Gap Resolved: Brain Supersession Rate ---
readonly RC_BRAIN_SUPERSESSION_HEALTHY_PCT=10
readonly RC_BRAIN_SUPERSESSION_WARNING_PCT=15

# --- Spec-Gap Resolved: Over-Decomposition Trigger ---
readonly RC_OVER_DECOMP_CONSECUTIVE_TRIGGER=2
readonly RC_OVER_DECOMP_SESSION_TRIGGER=3

# --- Spec-Gap Resolved: Tactical vs Strategic Classification ---
readonly RC_SCOPE_EXPANSION_STRATEGIC_PCT=15
readonly RC_SCOPE_REDUCTION_STRATEGIC_PCT=10
readonly RC_DEADLINE_SHIFT_STRATEGIC_DAYS=7

# --- Spec-Gap Resolved: Admiral Trust Promotion ---
readonly RC_TRUST_CONSECUTIVE_SUCCESS=5

# --- Spec-Gap Resolved: Context Honesty Confidence ---
readonly RC_CONTEXT_CONFIDENCE_MIN_PCT=80

# --- Spec-Gap Resolved: Headless Agent Authority Shift ---
readonly RC_HEADLESS_AUTHORITY_SHIFT=1

# --- Spec-Gap Resolved: Escalation Rate ---
readonly RC_ESCALATION_DECLINE_MIN_PCT=5
readonly RC_ESCALATION_DECLINE_MAX_PCT=10
readonly RC_ESCALATION_PLATEAU_SESSIONS=3

# --- Spec-Gap Resolved: Sycophantic Drift ---
readonly RC_DRIFT_FINDING_DECLINE_PCT=30

# --- Spec-Gap Resolved: QA Confidence Levels ---
readonly RC_QA_VERIFIED_TEST_CASES=2
readonly RC_QA_ASSESSED_REVIEW_PCT=50
readonly RC_QA_ASSUMED_SPOT_CHECK_PCT=10

# --- LLM-Last Design Constants ---
readonly RC_LLM_ELIMINATION_RATE_MIN_PCT=30
readonly RC_LLM_ELIMINATION_RATE_MAX_PCT=60

# --- Minimum Dependencies ---
readonly RC_MIN_PYTHON_VERSION="3.11"
readonly RC_MIN_PYDANTIC_VERSION="2.5.0"
readonly RC_MIN_JSONSCHEMA_VERSION="4.20.0"
readonly RC_MIN_PYTEST_VERSION="8.0"
