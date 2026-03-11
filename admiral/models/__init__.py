"""Core data models for the Admiral Framework.

Every model here replicates a specification structure from aiStrat/admiral/.
Models use Pydantic for validation to ensure spec compliance at runtime.
"""

from admiral.models.mission import Mission, Boundaries, SuccessCriteria, ResourceBudgets
from admiral.models.enforcement import (
    EnforcementLevel,
    ConstraintClassification,
    Constraint,
)
from admiral.models.authority import (
    DecisionTier,
    DecisionAuthority,
    AuthorityAssignment,
    CalibrationCondition,
)
from admiral.models.identity import IdentityToken, TokenClaims, TokenVerificationResult
from admiral.models.agent import (
    AgentDefinition,
    AgentScope,
    ModelTier,
    ToolPermission,
)
from admiral.models.handoff import (
    HandoffDocument,
    SessionHandoff,
    HandoffConstraints,
)
from admiral.models.task import (
    Chunk,
    TaskDecomposition,
    FailureScenario,
    VerificationLevel,
)
from admiral.models.config import FleetConfiguration, ProjectConfig

__all__ = [
    "Mission",
    "Boundaries",
    "SuccessCriteria",
    "ResourceBudgets",
    "EnforcementLevel",
    "ConstraintClassification",
    "Constraint",
    "DecisionTier",
    "DecisionAuthority",
    "AuthorityAssignment",
    "CalibrationCondition",
    "IdentityToken",
    "TokenClaims",
    "TokenVerificationResult",
    "AgentDefinition",
    "AgentScope",
    "ModelTier",
    "ToolPermission",
    "HandoffDocument",
    "SessionHandoff",
    "HandoffConstraints",
    "Chunk",
    "TaskDecomposition",
    "FailureScenario",
    "VerificationLevel",
    "FleetConfiguration",
    "ProjectConfig",
]
