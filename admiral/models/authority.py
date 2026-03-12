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

    @classmethod
    def with_common_defaults(cls) -> DecisionAuthority:
        """Create a DecisionAuthority pre-loaded with common decision examples.

        Per Section 09: every project needs sensible defaults before customization.
        These are starting points — projects should adjust tiers based on maturity.
        """
        return cls(
            assignments=[
                # Enforced — hooks decide, no agent judgment
                AuthorityAssignment(
                    decision="Token budget enforcement",
                    tier=DecisionTier.ENFORCED,
                    examples=["Block tool calls when budget exhausted"],
                    rationale="Budget limits are non-negotiable constraints.",
                ),
                AuthorityAssignment(
                    decision="Loop detection and breaking",
                    tier=DecisionTier.ENFORCED,
                    examples=["Break after 3 identical errors"],
                    rationale="Infinite loops waste budget and produce no value.",
                ),
                # Autonomous — agent decides, logs the decision
                AuthorityAssignment(
                    decision="Code pattern selection",
                    tier=DecisionTier.AUTONOMOUS,
                    examples=[
                        "Choose between for-loop and list comprehension",
                        "Select variable naming within conventions",
                        "Pick standard library utility",
                    ],
                    rationale="Low-risk, easily reversible, within established patterns.",
                ),
                AuthorityAssignment(
                    decision="Test structure decisions",
                    tier=DecisionTier.AUTONOMOUS,
                    examples=[
                        "Organize test files",
                        "Choose assertion style",
                        "Add edge case coverage",
                    ],
                    rationale="Test authoring follows project conventions.",
                ),
                AuthorityAssignment(
                    decision="Documentation updates",
                    tier=DecisionTier.AUTONOMOUS,
                    examples=["Update docstrings", "Add inline comments"],
                    rationale="Documentation follows code changes.",
                ),
                # Propose — agent recommends, Admiral approves
                AuthorityAssignment(
                    decision="Architecture change",
                    tier=DecisionTier.PROPOSE,
                    examples=[
                        "Change module structure",
                        "Introduce new abstraction layer",
                        "Modify public API surface",
                    ],
                    rationale="Architecture changes affect the whole fleet and are hard to reverse.",
                ),
                AuthorityAssignment(
                    decision="Add new dependency",
                    tier=DecisionTier.PROPOSE,
                    examples=[
                        "Add third-party library",
                        "Upgrade major version of existing dependency",
                    ],
                    rationale="Dependencies affect build, security, and maintenance surface.",
                ),
                AuthorityAssignment(
                    decision="Change enforcement level",
                    tier=DecisionTier.PROPOSE,
                    examples=[
                        "Downgrade hook to instruction",
                        "Promote guidance to instruction",
                    ],
                    rationale="Enforcement changes affect safety guarantees.",
                ),
                # Escalate — stop all work, flag immediately
                AuthorityAssignment(
                    decision="Security boundary violation",
                    tier=DecisionTier.ESCALATE,
                    examples=[
                        "Credentials found in code",
                        "Unauthorized access attempt detected",
                    ],
                    rationale="Security violations require immediate human judgment.",
                ),
                AuthorityAssignment(
                    decision="Scope contradiction",
                    tier=DecisionTier.ESCALATE,
                    examples=[
                        "Requirements contradict each other",
                        "Task requires capabilities outside fleet definition",
                    ],
                    rationale="Contradictions cannot be resolved by agents — they need human arbitration.",
                ),
            ],
        )

    @classmethod
    def project_maturity_calibration(
        cls,
        has_strong_tests: bool = False,
        is_greenfield: bool = False,
        has_established_patterns: bool = False,
        is_external_facing: bool = False,
        has_self_healing: bool = False,
    ) -> DecisionAuthority:
        """Create a calibrated DecisionAuthority based on project maturity.

        Per Section 09 calibration rubric:
        - Strong test coverage → widen Autonomous (tests catch mistakes)
        - Greenfield → widen Autonomous (less existing code to break)
        - Established patterns → widen Autonomous (patterns guide decisions)
        - External-facing → narrow Autonomous (user impact is high)
        - Self-healing hooks → widen Autonomous (hooks catch problems)

        Starts from common defaults and adds calibration rules.
        """
        authority = cls.with_common_defaults()
        rules = []

        if has_strong_tests:
            rules.append(CalibrationRule(
                condition=CalibrationCondition.STRONG_TEST_COVERAGE,
                effect="Widen Autonomous — tests catch regressions",
                rationale="Strong test coverage provides a safety net for autonomous decisions.",
            ))

        if is_greenfield:
            rules.append(CalibrationRule(
                condition=CalibrationCondition.GREENFIELD,
                effect="Widen Autonomous — no existing users to break",
                rationale="Greenfield projects have no production users, reducing risk.",
            ))

        if has_established_patterns:
            rules.append(CalibrationRule(
                condition=CalibrationCondition.ESTABLISHED_PATTERNS,
                effect="Widen Autonomous — patterns guide decisions",
                rationale="Established patterns reduce ambiguity in code decisions.",
            ))

        if is_external_facing:
            rules.append(CalibrationRule(
                condition=CalibrationCondition.EXTERNAL_FACING,
                effect="Narrow Autonomous — user impact is high",
                rationale="External-facing changes affect real users; require more oversight.",
            ))

        if has_self_healing:
            rules.append(CalibrationRule(
                condition=CalibrationCondition.SELF_HEALING_HOOKS,
                effect="Widen Autonomous — hooks catch problems automatically",
                rationale="Self-healing hooks provide automated error recovery.",
            ))

        authority.calibration_rules = rules
        return authority
