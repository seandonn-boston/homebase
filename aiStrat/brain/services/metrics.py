"""Metrics collection and threshold-based alerting for the Fleet Brain.

Provides lightweight, in-process metrics collection for monitoring Brain
health. Counters track key operational signals; alert rules fire when
thresholds are exceeded within time windows.

Counters tracked:
    - brain_records_total: Entries written to the Brain
    - brain_queries_total: Queries executed against the Brain
    - quarantine_rejections_total: Entries rejected by quarantine
    - auth_failures_total: Failed authentication attempts

Alert rules (v4 defaults):
    - auth_failures > 10 in 60s  -> possible brute-force attack
    - quarantine_rejections > 50 in 300s -> possible content flood attack

v4: Added for operational observability — enables detection of anomalous
    patterns and potential attacks in real time.

Reference: admiral/part5-brain.md, Section 15.
"""

from __future__ import annotations

import logging
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


# ── Data structures ──────────────────────────────────────────────

@dataclass
class MetricEvent:
    """A single recorded metric event with a timestamp."""
    name: str
    timestamp: float = field(default_factory=time.time)
    labels: dict = field(default_factory=dict)


@dataclass
class AlertRule:
    """A threshold-based alert rule.

    Fires when the count of events matching `metric_name` exceeds
    `threshold` within the trailing `window_seconds`.

    Attributes:
        name: Human-readable alert name.
        metric_name: The counter name to monitor.
        threshold: Maximum allowed events within the window.
        window_seconds: Sliding time window in seconds.
        severity: Alert severity (info, warning, critical).
        description: Explanation of what this alert detects.
    """
    name: str
    metric_name: str
    threshold: int
    window_seconds: float
    severity: str = "warning"
    description: str = ""


@dataclass
class Alert:
    """A fired alert instance."""
    rule_name: str
    metric_name: str
    current_count: int
    threshold: int
    window_seconds: float
    severity: str
    description: str
    fired_at: float = field(default_factory=time.time)


# ── Default alert rules ─────────────────────────────────────────

DEFAULT_ALERT_RULES: list[AlertRule] = [
    AlertRule(
        name="auth_brute_force",
        metric_name="auth_failures_total",
        threshold=10,
        window_seconds=60.0,
        severity="critical",
        description=(
            "More than 10 authentication failures in 60 seconds. "
            "Possible brute-force attack on Brain API keys."
        ),
    ),
    AlertRule(
        name="quarantine_flood",
        metric_name="quarantine_rejections_total",
        threshold=50,
        window_seconds=300.0,
        severity="warning",
        description=(
            "More than 50 quarantine rejections in 5 minutes. "
            "Possible content flood or automated poisoning attempt."
        ),
    ),
]


# ── MetricsCollector ─────────────────────────────────────────────

class MetricsCollector:
    """Thread-safe metrics collector with counter tracking and alerting.

    Records timestamped events for named counters and evaluates alert
    rules against sliding time windows.

    Usage:
        metrics = MetricsCollector()
        metrics.increment("brain_records_total")
        metrics.increment("auth_failures_total")
        alerts = metrics.check_alerts()
        for alert in alerts:
            print(f"ALERT: {alert.rule_name} - {alert.description}")

    v4: Lightweight in-process metrics for operational observability.
    """

    # Maximum events retained per counter to bound memory usage.
    _MAX_EVENTS_PER_COUNTER = 10_000

    def __init__(
        self,
        alert_rules: Optional[list[AlertRule]] = None,
    ) -> None:
        """Initialize the metrics collector.

        Args:
            alert_rules: Custom alert rules. Defaults to DEFAULT_ALERT_RULES.
        """
        self._lock = threading.Lock()
        self._counters: dict[str, deque[float]] = {}
        self._totals: dict[str, int] = {}
        self._alert_rules = alert_rules if alert_rules is not None else list(DEFAULT_ALERT_RULES)

    def increment(self, name: str, labels: Optional[dict] = None) -> int:
        """Record an event for the named counter.

        Args:
            name: Counter name (e.g., "brain_records_total").
            labels: Optional labels for the event (currently stored
                    for future use with structured logging).

        Returns:
            The new total count for this counter.
        """
        now = time.time()
        with self._lock:
            if name not in self._counters:
                self._counters[name] = deque()
                self._totals[name] = 0

            self._counters[name].append(now)
            self._totals[name] += 1

            # Prune oldest events beyond retention limit
            while len(self._counters[name]) > self._MAX_EVENTS_PER_COUNTER:
                self._counters[name].popleft()

            total = self._totals[name]

        if labels:
            logger.debug("Metric %s incremented (total=%d, labels=%s)", name, total, labels)

        return total

    def get_count(self, name: str, window_seconds: Optional[float] = None) -> int:
        """Get the count for a named counter.

        Args:
            name: Counter name.
            window_seconds: If provided, count only events within this
                           trailing time window. If None, return the
                           all-time total.

        Returns:
            Event count.
        """
        with self._lock:
            if name not in self._counters:
                return 0

            if window_seconds is None:
                return self._totals.get(name, 0)

            cutoff = time.time() - window_seconds
            timestamps = self._counters[name]
            return sum(1 for ts in timestamps if ts >= cutoff)

    def get_all_totals(self) -> dict[str, int]:
        """Get all-time totals for all counters.

        Returns:
            Dict mapping counter name to total count.
        """
        with self._lock:
            return dict(self._totals)

    def check_alerts(self) -> list[Alert]:
        """Evaluate all alert rules and return any that are currently firing.

        Each rule checks its metric's event count within the configured
        time window against the threshold.

        Returns:
            List of Alert instances for rules whose thresholds are exceeded.

        v4: Threshold-based alerting detects anomalous operational patterns.
        """
        fired: list[Alert] = []

        for rule in self._alert_rules:
            count = self.get_count(rule.metric_name, rule.window_seconds)

            if count > rule.threshold:
                alert = Alert(
                    rule_name=rule.name,
                    metric_name=rule.metric_name,
                    current_count=count,
                    threshold=rule.threshold,
                    window_seconds=rule.window_seconds,
                    severity=rule.severity,
                    description=rule.description,
                )
                fired.append(alert)

                logger.warning(
                    "ALERT [%s] %s: %d events in %.0fs (threshold: %d) - %s",
                    rule.severity.upper(),
                    rule.name,
                    count,
                    rule.window_seconds,
                    rule.threshold,
                    rule.description,
                )

        return fired

    def add_alert_rule(self, rule: AlertRule) -> None:
        """Add a new alert rule at runtime.

        Args:
            rule: The AlertRule to add.
        """
        self._alert_rules.append(rule)
        logger.info("Alert rule added: %s (metric=%s, threshold=%d/%ds)",
                     rule.name, rule.metric_name, rule.threshold, rule.window_seconds)

    def reset(self) -> None:
        """Reset all counters and totals. For testing only."""
        with self._lock:
            self._counters.clear()
            self._totals.clear()
