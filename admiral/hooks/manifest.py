"""Hook manifest parser and validator.

Validates hook.manifest.json files against hooks/manifest.schema.json.

Every hook must ship with a manifest conforming to the schema. The manifest
declares capabilities, dependencies, and contract version — enabling the
runtime to discover, validate, and order hooks automatically.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field, field_validator

from admiral.hooks.lifecycle import HookEvent


class HookManifest(BaseModel):
    """Parsed and validated hook manifest.

    Schema: hooks/manifest.schema.json
    Required: name, version, events, timeout_ms, input_contract, description.
    """

    name: str = Field(
        ...,
        pattern=r"^[a-z][a-z0-9_]*$",
        description="Hook identifier. Lowercase alphanumeric with underscores.",
    )
    version: str = Field(
        ...,
        pattern=r"^\d+\.\d+\.\d+$",
        description="Semantic version of the hook implementation.",
    )
    events: list[HookEvent] = Field(
        ...,
        min_length=1,
        description="Lifecycle events this hook binds to.",
    )
    timeout_ms: int = Field(
        ...,
        ge=100,
        le=300_000,
        description="Maximum execution time in milliseconds.",
    )
    requires: list[str] = Field(
        default_factory=list,
        description="Names of hooks that must be active for this hook to function.",
    )
    input_contract: str = Field(
        ...,
        min_length=1,
        description="Contract version string (e.g., 'v1').",
    )
    description: str = Field(
        ...,
        min_length=10,
        description="Human-readable description of what this hook does.",
    )
    is_async: bool = Field(
        default=False,
        alias="async",
        description="If true, hook executes asynchronously.",
    )

    model_config = {"populate_by_name": True}

    @field_validator("events")
    @classmethod
    def events_unique(cls, v: list[HookEvent]) -> list[HookEvent]:
        if len(v) != len(set(v)):
            raise ValueError("Hook events must be unique")
        return v

    @classmethod
    def from_file(cls, path: str | Path) -> HookManifest:
        """Load and validate a hook manifest from a JSON file."""
        path = Path(path)
        with path.open() as f:
            data = json.load(f)
        return cls.model_validate(data)

    @property
    def timeout_seconds(self) -> float:
        """Timeout in seconds for subprocess execution."""
        return self.timeout_ms / 1000.0
