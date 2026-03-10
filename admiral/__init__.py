"""Admiral Framework — Governance for Autonomous AI Agent Fleets.

Admiral is not an orchestration framework. It is a governance framework.
It tells you how to run a fleet, not how to build one.

Architecture:
    admiral.models    — Core data models (Mission, Agent, Handoff, Identity, etc.)
    admiral.hooks     — Deterministic enforcement layer (hook runtime engine)
    admiral.fleet     — Fleet composition, routing, and interface contracts
    admiral.execution — Work decomposition and parallel execution
    admiral.quality   — Quality assurance and failure recovery
    admiral.governance — Governance agents (7 agents for 20 failure modes)
    admiral.brain     — Persistent semantic memory (Level 1/2/3)
    admiral.monitor   — Continuous AI landscape monitor with 5-layer immune system
    admiral.security  — Attack corpus and red team integration
    admiral.protocols — Universal operating protocols (15 Standing Orders)
"""

__version__ = "0.1.0"
__framework_version__ = "0.2.0-alpha"
