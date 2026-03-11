"""Core data models for the Admiral Framework.

Every model here replicates a specification structure from aiStrat/admiral/.
Models use Pydantic for validation to ensure spec compliance at runtime.

Level 1: Strategy triangle, enforcement spectrum, decision authority, agent definitions.
Level 2: Fleet composition, routing, handoff protocol, work decomposition,
         context profiles, ground truth, checkpoints, institutional memory.
"""

# --- Level 1 ---
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
from admiral.models.agent import (
    AgentDefinition,
    AgentScope,
    ModelTier,
    ToolPermission,
)

# --- Level 2 ---
from admiral.models.ground_truth import (
    GroundTruth,
    TechStackEntry,
    KnownIssue,
    KnownIssueSeverity,
    AccessPermission,
    ConfigurationStatus,
)
from admiral.models.context import (
    ContextProfile,
    ContextBudget,
    ContextEntry,
    ContextSlot,
    RefreshTrigger,
    SacrificeOrder,
    STANDING_CONTEXT_MAX_LINES,
)
from admiral.models.work import (
    Decomposition,
    WorkChunk,
    ChunkState,
    QualityGate,
    CHUNK_BUDGET_CEILING_PCT,
)
from admiral.models.checkpoint import (
    Checkpoint,
    HandoffBrief,
    DecisionRecord,
    DecisionLog,
    TaskRecord,
    TaskStatus,
    ResourceUsage,
)
from admiral.models.handoff import (
    HandoffDocument,
    HandoffRoute,
    validate_handoff,
)
from admiral.models.fleet import (
    FleetRoster,
    RoutingRule,
    RoutingTable,
    FLEET_MIN_AGENTS,
    FLEET_MAX_AGENTS,
)

__all__ = [
    # Level 1
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
    "AgentDefinition",
    "AgentScope",
    "ModelTier",
    "ToolPermission",
    # Level 2 — Ground Truth
    "GroundTruth",
    "TechStackEntry",
    "KnownIssue",
    "KnownIssueSeverity",
    "AccessPermission",
    "ConfigurationStatus",
    # Level 2 — Context
    "ContextProfile",
    "ContextBudget",
    "ContextEntry",
    "ContextSlot",
    "RefreshTrigger",
    "SacrificeOrder",
    "STANDING_CONTEXT_MAX_LINES",
    # Level 2 — Work Decomposition
    "Decomposition",
    "WorkChunk",
    "ChunkState",
    "QualityGate",
    "CHUNK_BUDGET_CEILING_PCT",
    # Level 2 — Checkpoint / Institutional Memory
    "Checkpoint",
    "HandoffBrief",
    "DecisionRecord",
    "DecisionLog",
    "TaskRecord",
    "TaskStatus",
    "ResourceUsage",
    # Level 2 — Handoff Protocol
    "HandoffDocument",
    "HandoffRoute",
    "validate_handoff",
    # Level 2 — Fleet Composition
    "FleetRoster",
    "RoutingRule",
    "RoutingTable",
    "FLEET_MIN_AGENTS",
    "FLEET_MAX_AGENTS",
]
