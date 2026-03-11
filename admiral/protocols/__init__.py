"""Universal operating protocols — Section 36-41.

The concrete, non-negotiable protocols every agent follows.
Standing Orders are loaded into every agent's context.
Escalation is the fleet's mechanism for routing decisions to the right authority.
"""

from admiral.protocols.standing_orders import (
    StandingOrder,
    PriorityCategory,
    load_standing_orders,
    load_standing_orders_by_priority,
    render_standing_orders,
    get_standing_order,
    get_safety_orders,
)
from admiral.protocols.escalation import (
    EscalationReport,
    EscalationSeverity,
    EscalationTrigger,
    ApproachAttempted,
    EmergencyHaltReport,
    EmergencyHaltTrigger,
)

__all__ = [
    "StandingOrder",
    "PriorityCategory",
    "load_standing_orders",
    "load_standing_orders_by_priority",
    "render_standing_orders",
    "get_standing_order",
    "get_safety_orders",
    "EscalationReport",
    "EscalationSeverity",
    "EscalationTrigger",
    "ApproachAttempted",
    "EmergencyHaltReport",
    "EmergencyHaltTrigger",
]
