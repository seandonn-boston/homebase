"""Tool & Capability Registry models.

Implements Section 12 — Tool & Capability Registry.

Define what each agent CAN do (tool list, MCP servers) and explicitly what
it CANNOT do (negative tool list). Phantom capabilities — agents assuming
access they don't have — is one of the most common and expensive failures.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, model_validator


class MCPTrustLevel(str, Enum):
    """Trust classification for MCP servers."""

    OFFICIAL = "official"
    COMMUNITY = "community"
    INTERNAL = "internal"


class MCPServerConfig(BaseModel):
    """A registered MCP server.

    Per Section 14: MCP servers must be registered, scoped, version-pinned,
    and audited. Never use 'latest' in production.
    """

    name: str = Field(..., min_length=1)
    version: str = Field(
        ...,
        min_length=1,
        description="Pinned version. Never 'latest' in production.",
    )
    capability: str = Field(
        default="",
        description="What this server provides in one sentence.",
    )
    scope_limits: str = Field(
        default="",
        description="What this server cannot do or is restricted from.",
    )
    trust_level: MCPTrustLevel = Field(default=MCPTrustLevel.INTERNAL)
    auth_method: str = Field(
        default="",
        description="Authentication method (e.g., 'OAuth', 'API key', 'none').",
    )
    agent_roles: list[str] = Field(
        default_factory=list,
        description="Agent roles authorized to use this server.",
    )


class ToolEntry(BaseModel):
    """A single tool in an agent's registry.

    Per Section 12: each tool needs name, capability, scope limits,
    and whether outputs are visible to other agents.
    """

    name: str = Field(..., min_length=1)
    capability: str = Field(
        default="",
        description="What this tool does in one sentence.",
    )
    scope_limits: str = Field(
        default="",
        description="What this tool cannot do or is restricted from.",
    )
    shared_state: bool = Field(
        default=False,
        description="Whether outputs are visible to other agents.",
    )


class AgentToolRegistry(BaseModel):
    """Per-agent tool registry.

    Per Section 12: define available tools, MCP servers, and the
    negative tool list (tools the agent explicitly does NOT have).
    The negative list is the primary defense against phantom capabilities.
    """

    agent_role: str = Field(..., min_length=1)
    available_tools: list[ToolEntry] = Field(default_factory=list)
    mcp_servers: list[str] = Field(
        default_factory=list,
        description="Names of MCP servers this agent can access.",
    )
    not_available: list[str] = Field(
        default_factory=list,
        description="Tools/capabilities explicitly denied. Primary phantom capability defense.",
    )
    interaction_contracts: dict[str, str] = Field(
        default_factory=dict,
        description="Shared resource ownership: {resource: 'owned_by:Role, access:level'}.",
    )

    @model_validator(mode="after")
    def no_overlap_available_and_denied(self) -> AgentToolRegistry:
        """Available tools and denied tools must not overlap."""
        available_names = {t.name for t in self.available_tools}
        denied_set = set(self.not_available)
        overlap = available_names & denied_set
        if overlap:
            raise ValueError(
                f"Tools {overlap} appear in both available and not_available lists "
                f"for agent '{self.agent_role}'."
            )
        return self


class FleetToolRegistry(BaseModel):
    """Fleet-wide tool registry aggregating all agents' tools and MCP servers.

    Section 12: the fleet must have a complete picture of what each agent
    can and cannot do. Section 14: MCP servers are registered fleet-wide.
    """

    agent_registries: list[AgentToolRegistry] = Field(default_factory=list)
    mcp_servers: list[MCPServerConfig] = Field(default_factory=list)

    def get_agent_registry(self, role: str) -> AgentToolRegistry | None:
        """Look up a specific agent's tool registry."""
        for reg in self.agent_registries:
            if reg.agent_role == role:
                return reg
        return None

    def get_mcp_server(self, name: str) -> MCPServerConfig | None:
        """Look up an MCP server by name."""
        for srv in self.mcp_servers:
            if srv.name == name:
                return srv
        return None

    def validate_mcp_references(self) -> list[str]:
        """Check that agent MCP server references point to registered servers."""
        registered = {s.name for s in self.mcp_servers}
        violations = []
        for reg in self.agent_registries:
            for server_name in reg.mcp_servers:
                if server_name not in registered:
                    violations.append(
                        f"Agent '{reg.agent_role}' references MCP server '{server_name}' "
                        f"which is not registered in the fleet."
                    )
        return violations

    def validate_mcp_agent_authorization(self) -> list[str]:
        """Check that agents using MCP servers are listed in those servers' authorized roles."""
        violations = []
        for reg in self.agent_registries:
            for server_name in reg.mcp_servers:
                srv = self.get_mcp_server(server_name)
                if srv and srv.agent_roles and reg.agent_role not in srv.agent_roles:
                    violations.append(
                        f"Agent '{reg.agent_role}' uses MCP server '{server_name}' "
                        f"but is not in its authorized roles list."
                    )
        return violations

    def render(self) -> str:
        """Render as structured text for context injection."""
        lines = ["# Fleet Tool Registry", ""]

        if self.mcp_servers:
            lines.append("## MCP Servers")
            for srv in self.mcp_servers:
                roles = f" — Agents: {', '.join(srv.agent_roles)}" if srv.agent_roles else ""
                lines.append(
                    f"- **{srv.name}** {srv.version}: {srv.capability}"
                    f"{roles}"
                )
                if srv.scope_limits:
                    lines.append(f"  Scope: {srv.scope_limits}")
            lines.append("")

        if self.agent_registries:
            lines.append("## Agent Tool Registries")
            for reg in self.agent_registries:
                lines.append(f"### {reg.agent_role}")
                if reg.available_tools:
                    lines.append("Available:")
                    for tool in reg.available_tools:
                        shared = " [shared]" if tool.shared_state else ""
                        lines.append(f"  - {tool.name}: {tool.capability}{shared}")
                if reg.not_available:
                    lines.append(f"NOT Available: {', '.join(reg.not_available)}")
                lines.append("")

        return "\n".join(lines)
