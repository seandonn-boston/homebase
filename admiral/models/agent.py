"""Agent definition models.

Implements the agent structure from Part 4 (Fleet Composition) and
the prompt anatomy from fleet/prompt-anatomy.md.

Each agent has: Identity, Scope, Boundaries, Authority, Tools, Model Tier.
Agent definitions can be loaded from markdown specs or Python configs.
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

        Per fleet/prompt-anatomy.md: Identity section comes first.
        """
        return (
            f"You are the {self.name}. "
            f"Category: {self.category.value}. "
            f"Model tier: {self.model_tier.value}. "
            f"{self.description}"
        )
