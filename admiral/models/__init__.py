"""Core data models for the Admiral Framework.

Every model here replicates a specification structure from aiStrat/admiral/.
Models use Pydantic for validation to ensure spec compliance at runtime.

Level 1: Strategy triangle, enforcement spectrum, decision authority, agent definitions.
Level 2: Fleet composition, routing, handoff protocol, work decomposition,
         context profiles, ground truth, checkpoints, institutional memory.
"""

# --- Level 1 ---
from admiral.models.mission import (
    Mission,
    Boundaries,
    SuccessCriteria,
    ResourceBudgets,
    ProjectPhase,
    PipelineEntry,
    LLMLastBoundary,
    CriterionCategory,
    Criterion,
)
from admiral.models.enforcement import (
    EnforcementLevel,
    ConstraintClassification,
    ConstraintCategory,
    Constraint,
)
from admiral.models.authority import (
    DecisionTier,
    DecisionAuthority,
    AuthorityAssignment,
    CalibrationCondition,
    CalibrationRule,
)
from admiral.models.agent import (
    AgentDefinition,
    AgentCategory,
    AgentScope,
    ModelTier,
    ScheduleType,
    ToolPermission,
    InterfaceContractRef,
    GuardrailDef,
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
from admiral.models.tool_registry import (
    FleetToolRegistry,
    AgentToolRegistry,
    ToolEntry,
    MCPServerConfig,
    MCPTrustLevel,
)
from admiral.models.protocol_integration import (
    ProtocolRegistry,
    A2AConnection,
    A2AAuthMethod,
)
from admiral.models.recovery import (
    RecoveryLadder,
    RecoveryRecord,
    RecoveryStep,
    RetryConfig,
    FallbackConfig,
    RECOVERY_LADDER_ORDER,
)

__all__ = [
    # Level 1 — Mission
    "Mission",
    "Boundaries",
    "SuccessCriteria",
    "ResourceBudgets",
    "ProjectPhase",
    "PipelineEntry",
    "LLMLastBoundary",
    "CriterionCategory",
    "Criterion",
    # Level 1 — Enforcement
    "EnforcementLevel",
    "ConstraintClassification",
    "ConstraintCategory",
    "Constraint",
    # Level 1 — Authority
    "DecisionTier",
    "DecisionAuthority",
    "AuthorityAssignment",
    "CalibrationCondition",
    "CalibrationRule",
    # Level 1 — Agent
    "AgentDefinition",
    "AgentCategory",
    "AgentScope",
    "ModelTier",
    "ScheduleType",
    "ToolPermission",
    "InterfaceContractRef",
    "GuardrailDef",
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
    # Level 2 — Tool & Capability Registry
    "FleetToolRegistry",
    "AgentToolRegistry",
    "ToolEntry",
    "MCPServerConfig",
    "MCPTrustLevel",
    # Level 2 — Protocol Integration
    "ProtocolRegistry",
    "A2AConnection",
    "A2AAuthMethod",
    # Level 2 — Failure Recovery
    "RecoveryLadder",
    "RecoveryRecord",
    "RecoveryStep",
    "RetryConfig",
    "FallbackConfig",
    "RECOVERY_LADDER_ORDER",
]
