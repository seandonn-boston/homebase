"""Ground Truth models.

Implements Section 05 — Ground Truth.

Single source of reality: what words mean, what the stack is, what tools exist,
what's broken. Without it, agents hallucinate capabilities.

Versions must be exact ("React 19.1 with TypeScript 5.7", not "React with TypeScript").
"""

from __future__ import annotations

import re
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class TechStackEntry(BaseModel):
    """A single technology in the project's stack.

    Versions must be exact — vague versions cause phantom capability assumptions.
    """

    name: str = Field(..., min_length=1)
    version: str = Field(
        ...,
        min_length=1,
        description="Exact version (e.g., '19.1', '5.7.2'). Never 'latest'.",
    )
    purpose: str = Field(
        default="",
        description="What this technology is used for in the project.",
    )

    @field_validator("version")
    @classmethod
    def version_must_be_exact(cls, v: str) -> str:
        """Reject vague version strings."""
        vague = {"latest", "stable", "current", "newest", "recent", "lts"}
        if v.strip().lower() in vague:
            raise ValueError(
                f"Version must be exact (e.g., '5.7.2'), not '{v}'. "
                "Vague versions cause phantom capability assumptions."
            )
        return v


class KnownIssueSeverity(str, Enum):
    """Severity of a known issue."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class KnownIssue(BaseModel):
    """A known issue that agents must be aware of."""

    description: str = Field(..., min_length=1)
    severity: KnownIssueSeverity = Field(default=KnownIssueSeverity.MEDIUM)
    workaround: str | None = Field(
        default=None,
        description="How to work around this issue, if known.",
    )
    affects: list[str] = Field(
        default_factory=list,
        description="Components, files, or systems affected.",
    )


class AccessPermission(BaseModel):
    """What a role can access in the project."""

    role: str = Field(..., min_length=1)
    can_read: list[str] = Field(default_factory=list)
    can_write: list[str] = Field(default_factory=list)
    cannot_access: list[str] = Field(default_factory=list)


class ConfigurationStatus(BaseModel):
    """Current state of the Admiral configuration."""

    agents_md_version: str | None = Field(default=None)
    hooks_count: int = Field(default=0, ge=0)
    hooks_last_audit: str | None = Field(default=None)
    skills_count: int = Field(default=0, ge=0)
    skills_domains: list[str] = Field(default_factory=list)
    mcp_servers: list[str] = Field(default_factory=list)


class GroundTruth(BaseModel):
    """Section 05 — The single source of project reality.

    Template:
        DOMAIN ONTOLOGY: glossary, naming, status definitions
        ENVIRONMENTAL FACTS: tech stack, topology, access, known issues
        CONFIGURATION STATUS: AGENTS.md version, hooks, skills, MCP servers
    """

    # Domain Ontology
    glossary: dict[str, str] = Field(
        default_factory=dict,
        description="Project-specific term definitions. Keys are terms, values are definitions.",
    )
    naming_conventions: dict[str, str] = Field(
        default_factory=dict,
        description="Naming rules (e.g., 'files': 'kebab-case', 'components': 'PascalCase').",
    )
    status_definitions: dict[str, str] = Field(
        default_factory=dict,
        description="What status values mean (e.g., 'done': 'tested, reviewed, merged').",
    )

    # Environmental Facts
    tech_stack: list[TechStackEntry] = Field(
        default_factory=list,
        description="Exact technologies and versions.",
    )
    infrastructure_topology: str = Field(
        default="",
        description="How the system is deployed and structured.",
    )
    access_permissions: list[AccessPermission] = Field(
        default_factory=list,
        description="Who can access what.",
    )
    known_issues: list[KnownIssue] = Field(
        default_factory=list,
        description="Issues agents must be aware of.",
    )
    external_dependencies: dict[str, str] = Field(
        default_factory=dict,
        description="External services and their SLAs or constraints.",
    )

    # Configuration Status
    config_status: ConfigurationStatus = Field(
        default_factory=ConfigurationStatus,
    )

    def get_tech(self, name: str) -> TechStackEntry | None:
        """Look up a technology by name (case-insensitive)."""
        lower = name.lower()
        for entry in self.tech_stack:
            if entry.name.lower() == lower:
                return entry
        return None

    def get_critical_issues(self) -> list[KnownIssue]:
        """Return all critical-severity known issues."""
        return [i for i in self.known_issues if i.severity == KnownIssueSeverity.CRITICAL]

    def render(self) -> str:
        """Render Ground Truth as markdown for context injection."""
        lines = ["# Ground Truth", ""]

        if self.glossary:
            lines.append("## Domain Ontology")
            for term, definition in self.glossary.items():
                lines.append(f"- **{term}**: {definition}")
            lines.append("")

        if self.tech_stack:
            lines.append("## Tech Stack")
            for tech in self.tech_stack:
                purpose = f" — {tech.purpose}" if tech.purpose else ""
                lines.append(f"- {tech.name} {tech.version}{purpose}")
            lines.append("")

        if self.known_issues:
            lines.append("## Known Issues")
            for issue in self.known_issues:
                workaround = f" Workaround: {issue.workaround}" if issue.workaround else ""
                lines.append(f"- [{issue.severity.value}] {issue.description}{workaround}")
            lines.append("")

        return "\n".join(lines)
