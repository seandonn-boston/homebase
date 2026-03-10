"""Hook runtime engine.

Implements the hook execution model from Section 08.

The engine:
    1. Discovers hooks from the hooks/ directory tree at SessionStart
    2. Validates all manifests against hooks/manifest.schema.json
    3. Resolves dependencies (topological sort, rejects circular deps)
    4. Executes hooks in declared order per event
    5. First failure stops the chain (fail-fast)
    6. Integrates with self-healing loop for automatic repair

Hook Contract:
    - Format: Any executable (shell, Python, compiled binary)
    - Input: Structured JSON on stdin
    - Output: Exit 0 = pass, non-zero = block
    - Stdout captured and fed back to agent
    - Stderr logged
    - Timeout: configurable per hook (default 30s)
    - Must be idempotent (runtime may invoke multiple times)
"""

from __future__ import annotations

import json
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

from admiral.hooks.lifecycle import HookEvent
from admiral.hooks.manifest import HookManifest
from admiral.hooks.self_healing import SelfHealingLoop, SelfHealingResult


@dataclass
class HookResult:
    """Result of a single hook execution."""

    hook_name: str
    event: HookEvent
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: float
    timed_out: bool = False

    @property
    def passed(self) -> bool:
        return self.exit_code == 0 and not self.timed_out


@dataclass
class HookChainResult:
    """Result of executing a chain of hooks for an event."""

    event: HookEvent
    results: list[HookResult] = field(default_factory=list)
    aborted: bool = False
    abort_reason: str = ""

    @property
    def passed(self) -> bool:
        return all(r.passed for r in self.results) and not self.aborted

    @property
    def failed_hook(self) -> HookResult | None:
        for r in self.results:
            if not r.passed:
                return r
        return None


@dataclass
class RegisteredHook:
    """A hook registered with the engine."""

    manifest: HookManifest
    executable_path: Path
    handler: Callable[[dict[str, Any]], HookResult] | None = None


class HookEngine:
    """The deterministic enforcement runtime.

    Discovers, validates, orders, and executes hooks. Hooks are not
    advisory callbacks — they are deterministic gates.
    """

    def __init__(
        self,
        max_retries: int = 3,
        max_session_retries: int = 10,
    ):
        self._hooks: dict[str, RegisteredHook] = {}
        self._event_hooks: dict[HookEvent, list[str]] = {e: [] for e in HookEvent}
        self._self_healing = SelfHealingLoop(
            max_retries=max_retries,
            max_session_retries=max_session_retries,
        )
        self._initialized = False

    @property
    def registered_hooks(self) -> dict[str, RegisteredHook]:
        return dict(self._hooks)

    def register(
        self,
        manifest: HookManifest,
        executable_path: Path | None = None,
        handler: Callable[[dict[str, Any]], HookResult] | None = None,
    ) -> None:
        """Register a hook with the engine.

        Args:
            manifest: Validated hook manifest.
            executable_path: Path to the hook executable (for subprocess hooks).
            handler: Python callable (for in-process hooks, testing).
                     Takes event payload dict, returns HookResult.
        """
        if manifest.name in self._hooks:
            raise ValueError(f"Hook '{manifest.name}' is already registered")

        if executable_path is None and handler is None:
            raise ValueError(
                f"Hook '{manifest.name}' must have either executable_path or handler"
            )

        self._hooks[manifest.name] = RegisteredHook(
            manifest=manifest,
            executable_path=executable_path or Path("/dev/null"),
            handler=handler,
        )

        for event in manifest.events:
            self._event_hooks[event].append(manifest.name)

    def discover(self, hooks_dir: Path) -> list[str]:
        """Discover hooks from a directory tree.

        Looks for hook.manifest.json files in hooks_dir subdirectories.
        Returns list of discovered hook names.
        """
        discovered = []
        if not hooks_dir.exists():
            return discovered

        for manifest_path in sorted(hooks_dir.rglob("hook.manifest.json")):
            manifest = HookManifest.from_file(manifest_path)
            hook_dir = manifest_path.parent

            # Look for executable (Python script matching hook name)
            executable = hook_dir / f"{manifest.name}.py"
            if not executable.exists():
                # Try any .py file in the directory
                py_files = list(hook_dir.glob("*.py"))
                executable = py_files[0] if py_files else None

            self.register(
                manifest=manifest,
                executable_path=executable,
            )
            discovered.append(manifest.name)

        return discovered

    def validate_dependencies(self) -> list[str]:
        """Validate all hook dependencies are satisfiable.

        Returns list of errors (empty if all dependencies are met).
        Checks for: missing dependencies, circular dependencies.
        """
        errors = []
        registered_names = set(self._hooks.keys())

        # Check missing dependencies
        for name, hook in self._hooks.items():
            for dep in hook.manifest.requires:
                if dep not in registered_names:
                    errors.append(
                        f"Hook '{name}' requires '{dep}' which is not registered"
                    )

        # Check circular dependencies (topological sort)
        if not errors:
            cycle = self._detect_cycles()
            if cycle:
                errors.append(f"Circular dependency detected: {' → '.join(cycle)}")

        return errors

    def _detect_cycles(self) -> list[str] | None:
        """Detect circular dependencies using DFS."""
        WHITE, GRAY, BLACK = 0, 1, 2
        color = {name: WHITE for name in self._hooks}
        path: list[str] = []

        def dfs(node: str) -> list[str] | None:
            color[node] = GRAY
            path.append(node)
            for dep in self._hooks[node].manifest.requires:
                if dep not in color:
                    continue
                if color[dep] == GRAY:
                    cycle_start = path.index(dep)
                    return path[cycle_start:] + [dep]
                if color[dep] == WHITE:
                    result = dfs(dep)
                    if result:
                        return result
            path.pop()
            color[node] = BLACK
            return None

        for name in self._hooks:
            if color[name] == WHITE:
                result = dfs(name)
                if result:
                    return result
        return None

    def resolve_execution_order(self, event: HookEvent) -> list[str]:
        """Resolve hook execution order for an event using topological sort.

        Dependencies execute before dependents. Within the same dependency
        level, hooks execute in registration order.
        """
        event_hooks = set(self._event_hooks.get(event, []))
        if not event_hooks:
            return []

        # Topological sort (Kahn's algorithm)
        in_degree: dict[str, int] = {name: 0 for name in event_hooks}
        for name in event_hooks:
            for dep in self._hooks[name].manifest.requires:
                if dep in event_hooks:
                    in_degree[name] += 1

        queue = sorted(
            [name for name, deg in in_degree.items() if deg == 0]
        )
        order = []

        while queue:
            node = queue.pop(0)
            order.append(node)
            for name in sorted(event_hooks):
                if node in self._hooks[name].manifest.requires:
                    in_degree[name] -= 1
                    if in_degree[name] == 0:
                        queue.append(name)
                        queue.sort()

        return order

    def execute(
        self,
        event: HookEvent,
        payload: dict[str, Any],
    ) -> HookChainResult:
        """Execute all hooks for an event in dependency order.

        Fail-fast: first failure stops the chain.
        """
        order = self.resolve_execution_order(event)
        chain_result = HookChainResult(event=event)

        for hook_name in order:
            hook = self._hooks[hook_name]
            result = self._execute_single(hook, event, payload)
            chain_result.results.append(result)

            if not result.passed:
                chain_result.aborted = True
                chain_result.abort_reason = (
                    f"Hook '{hook_name}' failed with exit code {result.exit_code}"
                )
                break

        return chain_result

    def execute_with_healing(
        self,
        event: HookEvent,
        payload: dict[str, Any],
    ) -> tuple[HookChainResult, SelfHealingResult | None]:
        """Execute hooks with self-healing loop integration.

        On failure, consults the self-healing loop to determine if
        the agent should retry or move to the recovery ladder.
        """
        chain_result = self.execute(event, payload)

        if chain_result.passed:
            # Record success for all hooks
            for result in chain_result.results:
                self._self_healing.record_success(result.hook_name)
            return chain_result, None

        failed = chain_result.failed_hook
        if failed:
            healing = self._self_healing.record_failure(
                failed.hook_name, failed.stdout
            )
            return chain_result, healing

        return chain_result, None

    def _execute_single(
        self,
        hook: RegisteredHook,
        event: HookEvent,
        payload: dict[str, Any],
    ) -> HookResult:
        """Execute a single hook."""
        payload_with_event = {**payload, "event": event.value}
        start = time.monotonic()

        # Use handler if available (in-process execution for testing)
        if hook.handler is not None:
            try:
                result = hook.handler(payload_with_event)
                return HookResult(
                    hook_name=hook.manifest.name,
                    event=event,
                    exit_code=result.exit_code,
                    stdout=result.stdout,
                    stderr=result.stderr,
                    duration_ms=(time.monotonic() - start) * 1000,
                )
            except Exception as e:
                return HookResult(
                    hook_name=hook.manifest.name,
                    event=event,
                    exit_code=1,
                    stdout="",
                    stderr=str(e),
                    duration_ms=(time.monotonic() - start) * 1000,
                )

        # Subprocess execution
        try:
            proc = subprocess.run(
                [sys.executable, str(hook.executable_path)],
                input=json.dumps(payload_with_event),
                capture_output=True,
                text=True,
                timeout=hook.manifest.timeout_seconds,
            )
            return HookResult(
                hook_name=hook.manifest.name,
                event=event,
                exit_code=proc.returncode,
                stdout=proc.stdout,
                stderr=proc.stderr,
                duration_ms=(time.monotonic() - start) * 1000,
            )
        except subprocess.TimeoutExpired:
            return HookResult(
                hook_name=hook.manifest.name,
                event=event,
                exit_code=1,
                stdout="",
                stderr=f"Hook timed out after {hook.manifest.timeout_ms}ms",
                duration_ms=hook.manifest.timeout_ms,
                timed_out=True,
            )
        except FileNotFoundError:
            return HookResult(
                hook_name=hook.manifest.name,
                event=event,
                exit_code=1,
                stdout="",
                stderr=f"Hook executable not found: {hook.executable_path}",
                duration_ms=(time.monotonic() - start) * 1000,
            )

    def reset_session(self) -> None:
        """Reset session state (self-healing counters, etc.)."""
        self._self_healing.reset()
        self._initialized = False

    def get_hooks_for_event(self, event: HookEvent) -> list[HookManifest]:
        """Get all hook manifests registered for a given event."""
        return [
            self._hooks[name].manifest
            for name in self._event_hooks.get(event, [])
            if name in self._hooks
        ]
