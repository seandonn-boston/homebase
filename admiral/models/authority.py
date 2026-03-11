"""Decision authority models.

Implements Section 09 — Decision Authority.

Four tiers: Enforced (hooks decide), Autonomous (agent decides),
Propose (agent recommends, Admiral approves), Escalate (stop all work).
Every decision must be assigned to a tier.

Key anti-pattern: Deference Cascading — uncertainty always flows
upward (to Orchestrator or Admiral), never sideways (to a peer agent).
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class DecisionTier(str, Enum):
    """The four tiers of decision authority.

    ENFORCED:   Handled by hooks, not agent judgment. Agent never decides.
    AUTONOMOUS: Proceed without asking. Log the decision.
    PROPOSE:    Draft with rationale. Present alternatives. Wait for approval.
    ESCALATE:   Stop all work. Flag to Admiral immediately.
    """

    ENFORCED = "enforced"
    AUTONOMOUS = "autonomous"
    PROPOSE = "propose"
    ESCALATE = "escalate"


class AuthorityAssignment(BaseModel):
    """A single decision mapped to its authority tier.

    Per Section 09, every decision in the fleet must be assigned to a tier.
    The tier is bound to the agent's identity token at session start —
    it cannot change mid-session (vulnerability 8.3.2 mitigation).
    """

    decision: str = Field(
        ...,
        min_length=1,
        description="The decision being classified (e.g., 'Add new dependency').",
    )
    tier: DecisionTier
    examples: list[str] = Field(
        default_factory=list,
        description="Concrete examples of when this tier applies.",
    )
    rationale: str | None = Field(
        default=None,
        description="Why this decision is at this tier.",
    )


class CalibrationCondition(str, Enum):
    """Project conditions that affect authority calibration.

    From the calibration rubric in Section 09.
    """

    STRONG_TEST_COVERAGE = "strong_test_coverage"
    GREENFIELD = "greenfield"
    ESTABLISHED_PATTERNS = "established_patterns"
    EXTERNAL_FACING = "external_facing"
    SELF_HEALING_HOOKS = "self_healing_hooks"


class CalibrationRule(BaseModel):
    """A calibration rule that adjusts authority tiers based on project conditions."""

    condition: CalibrationCondition
    effect: str = Field(
        ...,
        description="How authority tiers are adjusted (e.g., 'Widen Autonomous').",
    )
    rationale: str


class DecisionAuthority(BaseModel):
    """The complete decision authority table for an agent or fleet.

    Binds at session start. Cannot change mid-session.
    When in doubt between tiers, the more conservative tier prevails
    (Propose over Autonomous, Escalate over Propose).
    """

    assignments: list[AuthorityAssignment] = Field(default_factory=list)
    calibration_rules: list[CalibrationRule] = Field(default_factory=list)

    def get_tier(self, decision: str) -> DecisionTier | None:
        """Look up the authority tier for a given decision."""
        for assignment in self.assignments:
            if assignment.decision == decision:
                return assignment.tier
        return None

    def get_by_tier(self, tier: DecisionTier) -> list[AuthorityAssignment]:
        """Get all decisions at a given tier."""
        return [a for a in self.assignments if a.tier == tier]

    @property
    def enforced(self) -> list[AuthorityAssignment]:
        return self.get_by_tier(DecisionTier.ENFORCED)

    @property
    def autonomous(self) -> list[AuthorityAssignment]:
        return self.get_by_tier(DecisionTier.AUTONOMOUS)

    @property
    def propose(self) -> list[AuthorityAssignment]:
        return self.get_by_tier(DecisionTier.PROPOSE)

    @property
    def escalate(self) -> list[AuthorityAssignment]:
        return self.get_by_tier(DecisionTier.ESCALATE)
