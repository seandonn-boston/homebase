"""Tests for the billing engine."""

import time

from broker.core.billing import BillingEngine
from broker.core.models import ServiceDefinition, Session, SessionState
from broker.core.store import Store


def make_billing():
    store = Store()
    billing = BillingEngine(store)

    store.add_service(ServiceDefinition(
        service_id="svc1",
        name="Test Service",
        monthly_cost_cents=1000,  # $10.00/month
        max_concurrent_streams=4,
    ))

    return store, billing


def test_record_session_cost():
    store, billing = make_billing()

    session = Session(
        user_id="user1",
        service_id="svc1",
        state=SessionState.ENDED,
        started_at=time.time() - 3600,  # 1 hour ago
        ended_at=time.time(),
    )

    record = billing.record_session(session)

    # 1000 cents / (30 * 86400) * 3600 ≈ 1.389 cents
    assert 1.3 < record.cost_cents < 1.5
    assert 3599 < record.duration_seconds < 3602


def test_user_bill_sums_correctly():
    store, billing = make_billing()

    # Two sessions
    for i in range(2):
        session = Session(
            user_id="user1",
            service_id="svc1",
            state=SessionState.ENDED,
            started_at=time.time() - 3600,
            ended_at=time.time(),
        )
        billing.record_session(session)

    bill = billing.user_bill("user1")
    assert len(bill.breakdown) == 2
    assert bill.total_seconds > 7000
    assert bill.total_cost_cents > 2.5


def test_service_revenue():
    store, billing = make_billing()

    session = Session(
        user_id="user1",
        service_id="svc1",
        state=SessionState.ENDED,
        started_at=time.time() - 3600,
        ended_at=time.time(),
    )
    billing.record_session(session)

    rev = billing.service_revenue("svc1")
    assert rev["monthly_cost_cents"] == 1000
    assert rev["total_billed_cents"] > 0
    assert 0 < rev["cost_recovery_pct"] < 1  # 1 hour out of a month


def test_platform_summary():
    store, billing = make_billing()

    # Add a second service
    store.add_service(ServiceDefinition(
        service_id="svc2",
        name="Test 2",
        monthly_cost_cents=2000,
        max_concurrent_streams=2,
    ))

    session = Session(
        user_id="user1",
        service_id="svc1",
        state=SessionState.ENDED,
        started_at=time.time() - 3600,
        ended_at=time.time(),
    )
    billing.record_session(session)

    summary = billing.platform_summary()
    assert summary["total_monthly_cost_cents"] == 3000
    assert summary["total_billed_cents"] > 0
    assert summary["operating_loss_cents"] > 0
    assert summary["service_count"] == 2


def test_zero_duration_session():
    store, billing = make_billing()

    now = time.time()
    session = Session(
        user_id="user1",
        service_id="svc1",
        state=SessionState.ENDED,
        started_at=now,
        ended_at=now,
    )
    record = billing.record_session(session)
    assert record.cost_cents == 0.0
    assert record.duration_seconds == 0.0
