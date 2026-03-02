"""Tests for the session broker."""

import time

from broker.core.billing import BillingEngine
from broker.core.broker import SessionBroker
from broker.core.models import ServiceDefinition, ServiceTier, SessionState
from broker.core.store import Store
from broker.core.vault import CredentialVault


def make_broker(max_streams: int = 2, num_creds: int = 1):
    store = Store()
    vault = CredentialVault(store, master_key="test")
    billing = BillingEngine(store)
    broker = SessionBroker(store, vault, billing)

    store.add_service(ServiceDefinition(
        service_id="svc1",
        name="Test Service",
        monthly_cost_cents=1000,
        max_concurrent_streams=max_streams,
        max_session_duration_sec=60,
    ))

    for i in range(num_creds):
        vault.store_credential(
            "svc1", f"cred{i}@test.com", f"pass{i}",
            ServiceTier.STANDARD,  # 2 streams
        )

    return store, vault, billing, broker


def test_session_starts_immediately_when_capacity():
    store, vault, billing, broker = make_broker()
    session = broker.request_session("user1", "svc1")
    assert session.state == SessionState.ACTIVE
    assert session.credential_id != ""
    assert session.started_at is not None


def test_session_queued_when_no_capacity():
    store, vault, billing, broker = make_broker(max_streams=2, num_creds=1)

    # Fill both slots
    s1 = broker.request_session("user1", "svc1")
    s2 = broker.request_session("user2", "svc1")
    assert s1.state == SessionState.ACTIVE
    assert s2.state == SessionState.ACTIVE

    # Third request should queue
    s3 = broker.request_session("user3", "svc1")
    assert s3.state == SessionState.QUEUED
    assert broker.get_queue_position(s3.session_id) == 0


def test_queue_drains_on_session_end():
    store, vault, billing, broker = make_broker(max_streams=2, num_creds=1)

    s1 = broker.request_session("user1", "svc1")
    s2 = broker.request_session("user2", "svc1")
    s3 = broker.request_session("user3", "svc1")  # queued

    assert s3.state == SessionState.QUEUED

    # End s1, s3 should be promoted
    broker.end_session(s1.session_id)
    assert s3.state == SessionState.ACTIVE
    assert s3.credential_id != ""


def test_end_session_produces_usage_record():
    store, vault, billing, broker = make_broker()
    session = broker.request_session("user1", "svc1")

    # Simulate some time passing
    session.started_at = time.time() - 300  # 5 minutes ago

    record = broker.end_session(session.session_id)
    assert record is not None
    assert 299 < record.duration_seconds < 302
    assert record.cost_cents > 0


def test_enforce_max_duration():
    store, vault, billing, broker = make_broker()
    session = broker.request_session("user1", "svc1")

    # Set started_at way in the past (service max is 60s)
    session.started_at = time.time() - 120

    expired = broker.enforce_max_duration()
    assert session.session_id in expired
    assert session.state == SessionState.EXPIRED


def test_service_status():
    store, vault, billing, broker = make_broker(max_streams=2, num_creds=1)

    status = broker.service_status("svc1")
    assert status["total_slots"] == 2
    assert status["used_slots"] == 0
    assert status["available_slots"] == 2
    assert status["queue_depth"] == 0

    broker.request_session("user1", "svc1")

    status = broker.service_status("svc1")
    assert status["used_slots"] == 1
    assert status["available_slots"] == 1


def test_unknown_service_raises():
    store, vault, billing, broker = make_broker()
    try:
        broker.request_session("user1", "nonexistent")
        assert False, "Should have raised ValueError"
    except ValueError:
        pass
