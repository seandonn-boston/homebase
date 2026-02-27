"""
Billing Engine — per-second metered billing with fair cost splitting.

The philosophy: the monthly subscription cost is a fixed pool. Users who
consume the service split that cost in proportion to their usage. Nobody
pays more than the retail price, and most pay far less.

Calculation:
  cost_for_session = session_duration_sec × service.cost_per_second

  Where cost_per_second = monthly_cost_cents / (30 * 86400)

This means if a service costs $15.99/month and a user watches for 2 hours,
they pay:  7200 × (1599 / 2592000) ≈ 4.44 cents.
"""

from __future__ import annotations

import time
from typing import Optional

from broker.core.models import (
    BillingSummary,
    Session,
    SessionState,
    UsageRecord,
)
from broker.core.store import Store


class BillingEngine:
    """Per-second usage billing with proportional cost splitting."""

    def __init__(self, store: Store) -> None:
        self._store = store

    def record_session(self, session: Session) -> UsageRecord:
        """
        Create a usage record for a completed/expired session.
        Cost = duration × cost_per_second for the service.
        """
        svc = self._store.get_service(session.service_id)
        if svc is None:
            raise ValueError(f"Unknown service: {session.service_id}")

        duration = session.duration_seconds
        cost = duration * svc.cost_per_second

        record = UsageRecord(
            user_id=session.user_id,
            service_id=session.service_id,
            session_id=session.session_id,
            duration_seconds=duration,
            cost_cents=cost,
        )
        self._store.add_usage_record(record)
        return record

    def user_bill(
        self,
        user_id: str,
        period_start: Optional[float] = None,
        period_end: Optional[float] = None,
    ) -> BillingSummary:
        """
        Generate a billing summary for a user over a time period.
        Defaults to the current calendar month (approximated as last 30 days).
        """
        now = time.time()
        start = period_start or (now - 30 * 86400)
        end = period_end or now

        records = [
            r for r in self._store.usage_for_user(user_id, since=start)
            if r.recorded_at <= end
        ]

        return BillingSummary(
            user_id=user_id,
            period_start=start,
            period_end=end,
            total_seconds=sum(r.duration_seconds for r in records),
            total_cost_cents=sum(r.cost_cents for r in records),
            breakdown=records,
        )

    def service_revenue(
        self, service_id: str, since: float = 0.0
    ) -> dict:
        """
        How much of this service's cost has been recouped by usage billing.
        """
        svc = self._store.get_service(service_id)
        if svc is None:
            raise ValueError(f"Unknown service: {service_id}")

        records = self._store.usage_for_service(service_id, since=since)
        total_billed = sum(r.cost_cents for r in records)
        total_seconds = sum(r.duration_seconds for r in records)

        return {
            "service_id": service_id,
            "monthly_cost_cents": svc.monthly_cost_cents,
            "total_billed_cents": total_billed,
            "total_usage_seconds": total_seconds,
            "cost_recovery_pct": (total_billed / svc.monthly_cost_cents * 100)
            if svc.monthly_cost_cents > 0
            else 0.0,
        }

    def platform_summary(self, since: float = 0.0) -> dict:
        """
        Platform-wide billing summary — total cost vs total revenue,
        showing the expected operating loss.
        """
        services = self._store.list_services()
        total_cost = sum(s.monthly_cost_cents for s in services)
        records = self._store.all_usage(since=since)
        total_billed = sum(r.cost_cents for r in records)
        total_seconds = sum(r.duration_seconds for r in records)

        return {
            "total_monthly_cost_cents": total_cost,
            "total_billed_cents": total_billed,
            "operating_loss_cents": total_cost - total_billed,
            "total_usage_seconds": total_seconds,
            "service_count": len(services),
            "cost_recovery_pct": (total_billed / total_cost * 100)
            if total_cost > 0
            else 0.0,
        }
