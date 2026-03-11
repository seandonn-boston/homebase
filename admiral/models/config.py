"""Fleet and project configuration models.

Implements Section 07 — Configuration File Strategy and fleet-level config.

AGENTS.md is the canonical source. 150-line rule. Cross-tool portability.
Tool-specific files (CLAUDE.md, .cursorrules) point to AGENTS.md.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from admiral.models.mission import Mission, Boundaries, SuccessCriteria


class GroundTruth(BaseModel):
    """Section 05 — Ground Truth.

    The project's ontology: naming, tech stack, canonical definitions.
    """

    tech_stack: dict[str, str] = Field(
        default_factory=dict,
        description="Language/framework/tool → version mappings.",
    )
    naming_conventions: dict[str, str] = Field(
        default_factory=dict,
        description="Canonical naming rules (e.g., 'files: kebab-case').",
    )
    terminology: dict[str, str] = Field(
        default_factory=dict,
        description="Project-specific term → definition mappings.",
    )


class ProjectConfig(BaseModel):
    """Complete project configuration.

    Combines Mission + Boundaries + Success Criteria + Ground Truth
    into the single source of truth for a project.
    """

    name: str = Field(..., min_length=1)
    mission: Mission
    boundaries: Boundaries = Field(default_factory=Boundaries)
    success_criteria: SuccessCriteria | None = None
    ground_truth: GroundTruth = Field(default_factory=GroundTruth)

    # Design principles from AGENTS.md
    design_principles: list[str] = Field(
        default_factory=lambda: [
            "Hooks over instructions",
            "Zero-trust",
            "Defense in depth",
            "Context is currency",
            "Progressive adoption",
            "Specification as product",
            "Tool-agnostic by default",
        ],
    )


class FleetConfiguration(BaseModel):
    """Fleet-level configuration.

    Defines the fleet roster bounds, model tier defaults, and
    operational parameters.
    """

    project: ProjectConfig
    min_agents: int = Field(default=5, ge=1, description="Minimum fleet size.")
    max_agents: int = Field(default=12, le=100, description="Maximum fleet size.")
    core_fleet_agents: list[str] = Field(
        default_factory=lambda: [
            "Orchestrator",
            "Triage Agent",
            "Context Curator",
            "Backend Implementer",
            "Frontend Implementer",
            "QA Agent",
            "Security Auditor",
            "Token Budgeter",
            "Drift Monitor",
            "Hallucination Auditor",
            "Technical Writer",
        ],
        description="Core fleet minimum (11 agents per fleet/README.md).",
    )
    default_token_budget: int = Field(
        default=200_000,
        gt=0,
        description="Default per-task token budget.",
    )
    max_retries: int = Field(
        default=3,
        ge=1,
        description="Max self-healing retries per hook.",
    )
    context_health_threshold: float = Field(
        default=0.85,
        gt=0,
        le=1.0,
        description="Context utilization threshold before sacrifice order activates.",
    )
    governance_heartbeat_interval_seconds: int = Field(
        default=60,
        gt=0,
        description="Governance agent heartbeat interval.",
    )
    first_pass_quality_threshold: float = Field(
        default=0.75,
        ge=0,
        le=1.0,
        description="Why 75%: per Section 27, below this triggers investigation.",
    )
