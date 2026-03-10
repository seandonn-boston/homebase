"""Deterministic enforcement layer — the hook runtime engine.

Hooks are the gap between 'should' and 'must'. An instruction can be
forgotten. A hook fires every single time. Any constraint that must hold
with zero exceptions must be a hook, not an instruction.
"""

from admiral.hooks.engine import HookEngine, HookResult, HookChainResult, RegisteredHook
from admiral.hooks.lifecycle import HookEvent
from admiral.hooks.manifest import HookManifest
from admiral.hooks.self_healing import SelfHealingLoop, SelfHealingResult

__all__ = [
    "HookEngine",
    "HookResult",
    "HookChainResult",
    "RegisteredHook",
    "HookEvent",
    "HookManifest",
    "SelfHealingLoop",
    "SelfHealingResult",
]
