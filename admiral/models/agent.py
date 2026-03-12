"""Agent definition models.

Implements the agent structure from Part 4 (Fleet Composition) and
the prompt anatomy from Section 04 (Context Engineering).

Each agent has: Identity, Scope, Boundaries, Authority, Tools, Model Tier.
Agent definitions can be loaded from markdown specs or Python configs.

Section 04 defines the five-section prompt anatomy:
    Identity → Authority → Constraints → Knowledge → Task
The ordering maps to LLM attention allocation across context windows.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from admiral.models.authority import DecisionAuthority, DecisionTier


class ModelTier(str, Enum):
    """Model tier assignments from fleet/model-tiers.md.

    FLAGSHIP:  Tier 1 — Deepest reasoning. Orchestrator, Architect, Mediator.
    WORKHORSE: Tier 2 — Solid code generation. Most specialists.
    UTILITY:   Tier 3 — Fast and cheap. Triage, Pattern Enforcer.
    ECONOMY:   Tier 4 — Batch processing. Background tasks.
    """

    FLAGSHIP = "flagship"
    WORKHORSE = "workhorse"
    UTILITY = "utility"
    ECONOMY = "economy"


class AgentCategory(str, Enum):
    """Agent categories from fleet/README.md."""

    COMMAND = "command"
    ENGINEERING_FRONTEND = "engineering/frontend"
    ENGINEERING_BACKEND = "engineering/backend"
    ENGINEERING_INFRASTRUCTURE = "engineering/infrastructure"
    ENGINEERING_CROSS_CUTTING = "engineering/cross-cutting"
    QUALITY = "quality"
    SECURITY = "security"
    GOVERNANCE = "governance"
    DESIGN = "design"
    LIFECYCLE = "lifecycle"
    META = "meta"
    ADVERSARIAL = "adversarial"
    SCALE = "scale"
    EXTRAS_DOMAIN = "extras/domain"
    EXTRAS_DATA = "extras/data"
    EXTRAS_SCALE = "extras/scale-extended"


class ScheduleType(str, Enum):
    """When the agent is active."""

    CONTINUOUS = "continuous"
    TRIGGERED = "triggered"
    PERIODIC = "periodic"


class ToolPermission(BaseModel):
    """A tool permission — what an agent can and cannot use.

    Includes negative tool list (tools the agent must NOT use)
    with hallucination prevention rationale.
    """

    allowed: list[str] = Field(
        default_factory=list,
        description="Tools this agent is authorized to use.",
    )
    denied: list[str] = Field(
        default_factory=list,
        description="Tools this agent must NOT use (negative tool list).",
    )
    rationale: dict[str, str] = Field(
        default_factory=dict,
        description="Rationale for each denied tool (hallucination prevention).",
    )


class AgentScope(BaseModel):
    """What an agent does and does NOT do.

    The 'Does NOT Do' list is a hard constraint, not a suggestion.
    Per Standing Order 3: If you find yourself doing something on your
    'Does NOT Do' list, stop immediately and reroute.
    """

    does: list[str] = Field(
        default_factory=list,
        description="What this agent is responsible for.",
    )
    does_not_do: list[str] = Field(
        default_factory=list,
        description="Hard constraints — things this agent must never do.",
    )
    output_routing: dict[str, str] = Field(
        default_factory=dict,
        description="Where this agent's outputs go (recipient → reason).",
    )


class InterfaceContractRef(BaseModel):
    """Reference to an interface contract with another agent."""

    partner_role: str
    direction: str = Field(description="'sends_to' or 'receives_from'")
    contract_summary: str


class GuardrailDef(BaseModel):
    """A guardrail — a specific constraint or safety mechanism."""

    name: str
    description: str
    enforcement: str = Field(description="How enforced: hook, instruction, or guidance.")


class AgentDefinition(BaseModel):
    """Complete agent definition per fleet/agents/agent-example.md.

    Five-section structure:
        1. Context Profile (identity, tier, schedule)
        2. Interface Contracts (who sends/receives)
        3. Decision Authority (per-decision tier assignments)
        4. Context Discovery (what knowledge to load)
        5. Guardrails (safety mechanisms)
    """

    # Identity
    name: str = Field(..., min_length=1, description="Agent role name.")
    category: AgentCategory
    model_tier: ModelTier
    model_rationale: str = Field(
        default="",
        description="Why this model tier was chosen (e.g., 'Needs deep reasoning for architecture decisions').",
    )
    schedule: ScheduleType = Field(default=ScheduleType.TRIGGERED)
    description: str = Field(default="", description="Brief role description.")
    context_budget_kb: int | None = Field(
        default=None,
        gt=0,
        description="Context window budget in KB. Used to verify context profile fits.",
    )

    # Scope
    scope: AgentScope = Field(default_factory=AgentScope)

    # Tools
    tools: ToolPermission = Field(default_factory=ToolPermission)

    # Interface Contracts
    interface_contracts: list[InterfaceContractRef] = Field(default_factory=list)

    # Decision Authority
    decision_authority: DecisionAuthority = Field(default_factory=DecisionAuthority)

    # Context Discovery
    context_files: list[str] = Field(
        default_factory=list,
        description="Files to load into context at session start.",
    )
    context_keywords: list[str] = Field(
        default_factory=list,
        description="Keywords that trigger progressive disclosure.",
    )

    # Guardrails
    guardrails: list[GuardrailDef] = Field(default_factory=list)

    # Metadata
    is_core_fleet: bool = Field(
        default=False,
        description="Whether this agent is part of the minimum core fleet.",
    )
    is_generalist: bool = Field(
        default=False,
        description="Generalists have system-level view and routing authority.",
    )

    @property
    def prompt_anchor(self) -> str:
        """Generate the identity anchor for system prompt assembly.

        Per Section 04: Identity section comes first in prompt anatomy.
        """
        return (
            f"You are the {self.name}. "
            f"Category: {self.category.value}. "
            f"Model tier: {self.model_tier.value}. "
            f"{self.description}"
        )

    @property
    def non_goals(self) -> list[str]:
        """Shortcut to the agent's 'Does NOT Do' list."""
        return self.scope.does_not_do


class PromptSection(str, Enum):
    """The five sections of prompt anatomy per Section 04.

    Ordering is critical — it maps to LLM attention allocation:
    Identity first (primacy), Task last (recency), Knowledge in middle.
    """

    IDENTITY = "identity"
    AUTHORITY = "authority"
    CONSTRAINTS = "constraints"
    KNOWLEDGE = "knowledge"
    TASK = "task"


# Canonical ordering — do not reorder
PROMPT_SECTION_ORDER = [
    PromptSection.IDENTITY,
    PromptSection.AUTHORITY,
    PromptSection.CONSTRAINTS,
    PromptSection.KNOWLEDGE,
    PromptSection.TASK,
]


class PromptAnatomy(BaseModel):
    """Section 04 — Five-section prompt structure for agent system prompts.

    Each section is independently renderable and testable.
    The render() method concatenates in the canonical order:
    Identity → Authority → Constraints → Knowledge → Task.

    At Level 2 this is a data structure and rendering function.
    Runtime prompt injection into agent sessions is Level 3+.
    """

    identity: str = Field(
        default="",
        description="Who this agent is: role, category, tier, hierarchical position.",
    )
    authority: str = Field(
        default="",
        description="Decision tier assignments: what it may decide, propose, or must escalate.",
    )
    constraints: str = Field(
        default="",
        description="Boundaries, non-goals, scope limits, budgets, Standing Orders.",
    )
    knowledge: str = Field(
        default="",
        description="Ground Truth excerpts, tech stack, glossary, interface contracts.",
    )
    task: str = Field(
        default="",
        description="Current work chunk, acceptance criteria, entry/exit states.",
    )

    @classmethod
    def from_agent(cls, agent: AgentDefinition) -> PromptAnatomy:
        """Build a PromptAnatomy from an AgentDefinition.

        Populates Identity, Authority, and Constraints from the agent definition.
        Knowledge and Task are left empty — they are populated at runtime
        from GroundTruth and WorkChunk respectively.
        """
        # Identity section
        identity_lines = [
            f"You are the {agent.name}.",
            f"Category: {agent.category.value}.",
            f"Model tier: {agent.model_tier.value}.",
        ]
        if agent.description:
            identity_lines.append(agent.description)
        if agent.schedule != ScheduleType.TRIGGERED:
            identity_lines.append(f"Schedule: {agent.schedule.value}.")

        # Authority section
        authority_lines = []
        for assignment in agent.decision_authority.assignments:
            authority_lines.append(
                f"[{assignment.tier.value.upper()}] {assignment.decision}"
            )

        # Constraints section
        constraint_lines = []
        if agent.scope.does_not_do:
            constraint_lines.append("You do NOT:")
            for non_goal in agent.scope.does_not_do:
                constraint_lines.append(f"  - {non_goal}")
        if agent.tools.denied:
            constraint_lines.append("Tools you do NOT have:")
            for tool in agent.tools.denied:
                rationale = agent.tools.rationale.get(tool, "")
                suffix = f" — {rationale}" if rationale else ""
                constraint_lines.append(f"  - {tool}{suffix}")

        return cls(
            identity="\n".join(identity_lines),
            authority="\n".join(authority_lines),
            constraints="\n".join(constraint_lines),
        )

    def sections(self) -> list[tuple[PromptSection, str]]:
        """Return all non-empty sections in canonical order."""
        mapping = {
            PromptSection.IDENTITY: self.identity,
            PromptSection.AUTHORITY: self.authority,
            PromptSection.CONSTRAINTS: self.constraints,
            PromptSection.KNOWLEDGE: self.knowledge,
            PromptSection.TASK: self.task,
        }
        return [
            (section, mapping[section])
            for section in PROMPT_SECTION_ORDER
            if mapping[section].strip()
        ]

    def render(self) -> str:
        """Render the full system prompt in canonical section order.

        Sections are separated by blank lines. Empty sections are omitted.
        """
        parts = []
        for section, content in self.sections():
            parts.append(f"## {section.value.upper()}\n{content}")
        return "\n\n".join(parts)


class ProbeType(str, Enum):
    """Types of prompt probes from Section 04 testing protocol.

    Each probe type tests a different failure mode:
    BOUNDARY:  Does the agent refuse tasks outside scope?
    AUTHORITY: Does the agent escalate decisions above its tier?
    AMBIGUITY: Does the agent invent, ask, or escalate on underspecified input?
    CONFLICT:  When instructions conflict, does the right one win?
    REGRESSION: After prompt modification, do previous probes still pass?
    """

    BOUNDARY = "boundary"
    AUTHORITY = "authority"
    AMBIGUITY = "ambiguity"
    CONFLICT = "conflict"
    REGRESSION = "regression"


class ExpectedBehavior(str, Enum):
    """Expected agent behavior in response to a probe."""

    REFUSE = "refuse"
    COMPLY = "comply"
    ESCALATE = "escalate"
    ASK = "ask"
    PROPOSE = "propose"


class PromptProbe(BaseModel):
    """A test probe for validating prompt behavior per Section 04.

    At Level 2 this is a data definition — the probe execution harness
    (sending to an LLM, grading responses) is Level 3+.

    Example:
        PromptProbe(
            probe_type=ProbeType.BOUNDARY,
            description="Ask Backend Implementer to modify frontend CSS",
            input_text="Please update the CSS in src/styles/main.css",
            expected=ExpectedBehavior.REFUSE,
            rationale="Backend Implementer scope excludes frontend files",
        )
    """

    probe_type: ProbeType
    description: str = Field(..., min_length=1, description="What this probe tests.")
    input_text: str = Field(
        ...,
        min_length=1,
        description="The message to send to the agent.",
    )
    expected: ExpectedBehavior = Field(
        description="What the agent should do in response.",
    )
    rationale: str = Field(
        default="",
        description="Why this is the correct response.",
    )
    agent_role: str = Field(
        default="",
        description="Which agent role this probe targets.",
    )
