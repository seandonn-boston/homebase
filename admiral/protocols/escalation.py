"""Escalation Protocol — Section 37.

Escalation is not failure. It is the fleet's mechanism for routing decisions
to the entity with the right authority. Suppressing escalation is the actual failure.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


class EscalationSeverity(str, Enum):
    """Escalation severity levels with routing implications."""

    CRITICAL = "critical"  # → Admiral directly
    HIGH = "high"          # → Orchestrator → Admiral if unresolvable
    MEDIUM = "medium"      # → Orchestrator


class EscalationTrigger(str, Enum):
    """Reasons to escalate, per Section 37."""

    SCOPE_CHANGE = "scope_change"
    BUDGET_EXCEEDED = "budget_exceeded"
    SECURITY_CONCERN = "security_concern"
    CONTRADICTORY_REQUIREMENTS = "contradictory_requirements"
    AUTHORITY_EXCEEDED = "authority_exceeded"
    RECOVERY_EXHAUSTED = "recovery_exhausted"
    BLOCKING_DEPENDENCY = "blocking_dependency"
    SAFETY_CONCERN = "safety_concern"


class ApproachAttempted(BaseModel):
    """A single approach attempted before escalation."""

    description: str = Field(..., min_length=1)
    failure_reason: str = Field(..., min_length=1)


class EscalationReport(BaseModel):
    """Structured escalation report per Section 37 template.

    Every escalation must include this report format.
    """

    agent: str = Field(..., min_length=1, description="The escalating agent's role.")
    task: str = Field(..., min_length=1, description="What the agent was working on.")
    severity: EscalationSeverity
    trigger: EscalationTrigger
    blocker: str = Field(..., min_length=1, description="One sentence describing what's blocking progress.")
    context: str = Field(..., min_length=1, description="What you were trying to accomplish and why.")
    approaches_attempted: list[ApproachAttempted] = Field(
        default_factory=list,
        description="What was tried and why it failed.",
    )
    root_cause_assessment: str = Field(
        ..., min_length=1,
        description="Best understanding of why the blocker exists.",
    )
    whats_needed: str = Field(
        ..., min_length=1,
        description="Specific action, decision, or information required to unblock.",
    )
    impact: str = Field(
        ..., min_length=1,
        description="What happens if this remains unresolved — scope, timeline, quality.",
    )
    recommendation: str = Field(
        default="Awaiting direction",
        description="Proposed resolution, if any.",
    )
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def route_to(self) -> str:
        """Determine the escalation target based on severity routing rules.

        Critical → Admiral directly
        High → Orchestrator (→ Admiral if unresolvable)
        Medium → Orchestrator
        """
        if self.severity == EscalationSeverity.CRITICAL:
            return "Admiral"
        return "Orchestrator"

    def render(self) -> str:
        """Render the escalation report in the Section 37 text format."""
        lines = [
            "ESCALATION REPORT",
            "=================",
            "",
            f"AGENT: {self.agent}",
            f"TASK: {self.task}",
            f"SEVERITY: {self.severity.value.title()}",
            "",
            f"BLOCKER: {self.blocker}",
            "",
            "CONTEXT:",
            self.context,
            "",
            "APPROACHES ATTEMPTED:",
        ]
        if self.approaches_attempted:
            for i, approach in enumerate(self.approaches_attempted, 1):
                lines.append(f"{i}. {approach.description} — {approach.failure_reason}")
        else:
            lines.append("(None — escalating before attempting resolution)")
        lines.extend([
            "",
            "ROOT CAUSE ASSESSMENT:",
            self.root_cause_assessment,
            "",
            "WHAT'S NEEDED:",
            self.whats_needed,
            "",
            "IMPACT:",
            self.impact,
            "",
            "RECOMMENDATION:",
            self.recommendation,
        ])
        return "\n".join(lines)


class EmergencyHaltTrigger(str, Enum):
    """Triggers for Emergency Halt Protocol."""

    DATA_DESTRUCTION = "data_destruction"
    SECURITY_BREACH = "security_breach"
    COMPLIANCE_VIOLATION = "compliance_violation"
    SAFETY_HAZARD = "safety_hazard"
    CASCADE_FAILURE = "cascade_failure"
    ACCESS_RISK_EXCEEDED = "access_risk_exceeded"


class EmergencyHaltReport(BaseModel):
    """Emergency Halt report per Section 37.

    Anything deemed too risky or likely to cause irreparable harm
    must stop immediately. This report always routes to Admiral directly.
    """

    agent: str = Field(..., min_length=1)
    trigger: EmergencyHaltTrigger
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    what_happened: str = Field(..., min_length=1)
    current_state: str = Field(..., min_length=1)
    evidence: str = Field(..., min_length=1)
    actions_taken: str = Field(
        default="Stopped all work.",
        description="Should always be 'stopped all work'.",
    )

    def render(self) -> str:
        """Render the Emergency Halt report in the Section 37 text format."""
        return "\n".join([
            "EMERGENCY HALT",
            "==============",
            "",
            f"AGENT: {self.agent}",
            "SEVERITY: CRITICAL — EMERGENCY HALT",
            f"TIMESTAMP: {self.timestamp.isoformat()}",
            "",
            f"TRIGGER: {self.trigger.value}",
            "",
            "WHAT HAPPENED:",
            self.what_happened,
            "",
            "CURRENT STATE:",
            self.current_state,
            "",
            "EVIDENCE:",
            self.evidence,
            "",
            "ACTIONS TAKEN:",
            self.actions_taken,
            "",
            "AWAITING: Admiral direction. All work ceased.",
        ])
