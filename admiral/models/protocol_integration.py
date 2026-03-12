"""Protocol Integration models.

Implements Section 14 — Protocol Integration.

MCP connects agents to tools (USB-C for AI). A2A connects agents to other
agents. Together they form the protocol layer enabling coordinated fleet
operations.

At Level 2: MCP servers registered and pinned. A2A configured if needed.
Full A2A with signed identity is Level 4.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class A2AAuthMethod(str, Enum):
    """Authentication methods for A2A connections."""

    API_KEY = "api_key"
    OAUTH2 = "oauth2"
    MTLS = "mtls"
    NONE = "none"


class A2AConnection(BaseModel):
    """A configured A2A connection between agents.

    Per Section 14: A2A enables structured communication between agents
    across process, machine, and organizational boundaries.
    """

    agent_a: str = Field(..., min_length=1)
    agent_b: str = Field(..., min_length=1)
    purpose: str = Field(
        default="",
        description="What this connection is used for.",
    )
    auth_method: A2AAuthMethod = Field(default=A2AAuthMethod.NONE)
    timeout_seconds: int = Field(
        default=300,
        ge=1,
        description="Timeout per request. Default 5 minutes per spec.",
    )
    bidirectional: bool = Field(
        default=True,
        description="Whether communication flows both ways.",
    )


class ProtocolRegistry(BaseModel):
    """Fleet-wide protocol registry.

    Tracks A2A connections. MCP servers are tracked in FleetToolRegistry
    (Section 12). This model covers the A2A layer from Section 14.
    """

    a2a_connections: list[A2AConnection] = Field(default_factory=list)
    a2a_enabled: bool = Field(
        default=False,
        description="Whether A2A is configured. False at Level 2 unless cross-process needed.",
    )

    def get_connections_for(self, agent_role: str) -> list[A2AConnection]:
        """Get all A2A connections involving a specific agent."""
        return [
            c for c in self.a2a_connections
            if c.agent_a == agent_role or c.agent_b == agent_role
        ]

    def validate_agents_exist(self, roster_roles: set[str]) -> list[str]:
        """Check that all A2A endpoints exist in the fleet roster."""
        violations = []
        for conn in self.a2a_connections:
            if conn.agent_a not in roster_roles:
                violations.append(
                    f"A2A connection references '{conn.agent_a}' which is not in the roster."
                )
            if conn.agent_b not in roster_roles:
                violations.append(
                    f"A2A connection references '{conn.agent_b}' which is not in the roster."
                )
        return violations
