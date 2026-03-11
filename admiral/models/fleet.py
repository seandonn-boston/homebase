"""Fleet Composition and Routing models.

Implements Section 11 — Fleet Composition.

Define every agent role, scope, boundaries, and handoff contracts. Upper bound
8-12 agents. Beyond that, coordination costs dominate. Start at 5; grow only
when routing bottlenecks emerge.

Anti-pattern: Fleet Bloat — more agents ≠ better results.
Anti-pattern: QA by Implementer — never route QA to the agent who wrote the code.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, model_validator

from admiral.models.agent import AgentDefinition


# Spec bounds from Section 11
FLEET_MIN_AGENTS = 1
FLEET_MAX_AGENTS = 12


class RoutingRule(BaseModel):
    """A single routing rule: task type → agent role.

    Priority determines which rule wins when multiple match.
    Fallback is the agent to route to if the primary is unavailable.
    """

    task_type: str = Field(
        ...,
        min_length=1,
        description="Type of task (e.g., 'backend_implementation', 'code_review', 'test_writing').",
    )
    agent_role: str = Field(
        ...,
        min_length=1,
        description="Agent role that handles this task type.",
    )
    priority: int = Field(
        default=50,
        ge=0,
        le=100,
        description="Higher priority wins when multiple rules match. 100 = highest.",
    )
    fallback_role: str | None = Field(
        default=None,
        description="Agent to route to if primary is unavailable.",
    )
    conditions: dict[str, str] = Field(
        default_factory=dict,
        description="Additional conditions (e.g., 'file_pattern': 'src/api/**').",
    )


class RoutingTable(BaseModel):
    """Collection of routing rules with dispatch logic.

    Per Section 11: routing is deterministic. If task_type matches a rule,
    route to that agent. No LLM judgment in routing at Level 2.
    """

    rules: list[RoutingRule] = Field(default_factory=list)

    def route(self, task_type: str) -> str | None:
        """Find the agent role for a given task type.

        Returns the highest-priority matching role, or None if no match.
        """
        matches = [r for r in self.rules if r.task_type == task_type]
        if not matches:
            return None
        matches.sort(key=lambda r: -r.priority)
        return matches[0].agent_role

    def route_with_fallback(self, task_type: str) -> tuple[str | None, str | None]:
        """Find primary and fallback agent for a task type.

        Returns (primary_role, fallback_role).
        """
        matches = [r for r in self.rules if r.task_type == task_type]
        if not matches:
            return None, None
        matches.sort(key=lambda r: -r.priority)
        best = matches[0]
        return best.agent_role, best.fallback_role

    def all_task_types(self) -> list[str]:
        """List all registered task types."""
        return sorted(set(r.task_type for r in self.rules))

    def validate_agents_exist(self, roster_roles: set[str]) -> list[str]:
        """Check that all routing targets exist in the fleet roster.

        Returns list of violations.
        """
        violations = []
        for rule in self.rules:
            if rule.agent_role not in roster_roles:
                violations.append(
                    f"Routing rule '{rule.task_type}' targets '{rule.agent_role}' "
                    f"which is not in the fleet roster."
                )
            if rule.fallback_role and rule.fallback_role not in roster_roles:
                violations.append(
                    f"Routing rule '{rule.task_type}' fallback '{rule.fallback_role}' "
                    f"which is not in the fleet roster."
                )
        return violations


class FleetRoster(BaseModel):
    """Section 11 — The fleet's agent roster.

    Spec bounds: 1-12 agents. Beyond 12, coordination costs dominate.
    """

    agents: list[AgentDefinition] = Field(
        default_factory=list,
        min_length=FLEET_MIN_AGENTS,
    )
    routing: RoutingTable = Field(default_factory=RoutingTable)

    @model_validator(mode="after")
    def validate_fleet_size(self) -> FleetRoster:
        if len(self.agents) > FLEET_MAX_AGENTS:
            raise ValueError(
                f"Fleet has {len(self.agents)} agents, exceeds {FLEET_MAX_AGENTS} limit. "
                f"Coordination costs dominate beyond this point."
            )
        return self

    def get_agent(self, name: str) -> AgentDefinition | None:
        """Look up an agent by name."""
        for agent in self.agents:
            if agent.name == name:
                return agent
        return None

    def get_by_category(self, category: str) -> list[AgentDefinition]:
        """Get all agents in a category."""
        return [a for a in self.agents if a.category.value == category]

    @property
    def core_fleet(self) -> list[AgentDefinition]:
        """Agents marked as core fleet (minimum viable fleet)."""
        return [a for a in self.agents if a.is_core_fleet]

    @property
    def roles(self) -> set[str]:
        """Set of all agent role names."""
        return {a.name for a in self.agents}

    def validate_routing(self) -> list[str]:
        """Check that routing table only references agents in the roster."""
        return self.routing.validate_agents_exist(self.roles)

    def validate_no_self_qa(self) -> list[str]:
        """Check that no agent routes QA output back to itself.

        Per Section 11: Never route QA to the implementer who wrote the code.
        """
        violations = []
        for rule in self.routing.rules:
            if "review" in rule.task_type.lower() or "qa" in rule.task_type.lower():
                # Check if the QA agent is the same as the implementer
                impl_rule = next(
                    (r for r in self.routing.rules
                     if r.task_type.replace("review", "implement").replace("qa", "implement") == rule.task_type
                     and r.agent_role == rule.agent_role),
                    None,
                )
                if impl_rule:
                    violations.append(
                        f"QA task '{rule.task_type}' routes to '{rule.agent_role}' "
                        f"who also implements — conflict of interest."
                    )
        return violations
