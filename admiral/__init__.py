"""Admiral Framework — Governance for Autonomous AI Agent Fleets.

Admiral is not an orchestration framework. It is a governance framework.
It tells you how to run a fleet, not how to build one.

Level 1 (Disciplined Solo):
    admiral.models    — Core data models (Mission, Agent, Authority, Enforcement)
    admiral.hooks     — Deterministic enforcement layer (hook runtime engine)
    admiral.runtime   — Claude Code hook adapter (live enforcement bridge)
    admiral.protocols — Universal operating protocols (15 Standing Orders)

Level 2 (Core Fleet):
    admiral.models    — Fleet composition, routing, handoff, work decomposition,
                        context profiles, ground truth, checkpoints
    admiral.protocols — Handoff protocol validation (completeness, acceptance)
"""

__version__ = "0.2.0"
__framework_version__ = "0.2.0-alpha"
