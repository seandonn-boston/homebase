"""Tests for core data models."""

from broker.core.models import (
    Credential,
    CredentialState,
    ServiceDefinition,
    ServiceTier,
    Session,
    SessionState,
)


def test_service_cost_per_second():
    svc = ServiceDefinition(
        service_id="test",
        name="Test",
        monthly_cost_cents=1599,
        max_concurrent_streams=4,
    )
    # 1599 cents / (30 * 86400) seconds = ~0.000617 cents/sec
    assert 0.0006 < svc.cost_per_second < 0.0007


def test_credential_capacity():
    cred = Credential(
        service_id="test",
        tier=ServiceTier.PREMIUM,
        state=CredentialState.AVAILABLE,
        active_sessions=0,
    )
    assert cred.max_streams == 4
    assert cred.has_capacity is True

    cred.active_sessions = 4
    assert cred.has_capacity is False


def test_credential_disabled_no_capacity():
    cred = Credential(
        service_id="test",
        tier=ServiceTier.PREMIUM,
        state=CredentialState.DISABLED,
        active_sessions=0,
    )
    assert cred.has_capacity is False


def test_session_duration():
    import time
    s = Session(
        user_id="u1",
        service_id="s1",
        state=SessionState.ACTIVE,
        started_at=time.time() - 100,
    )
    assert 99 < s.duration_seconds < 102

    # Ended session has fixed duration
    s.ended_at = s.started_at + 50
    assert s.duration_seconds == 50.0


def test_session_duration_not_started():
    s = Session(user_id="u1", service_id="s1", state=SessionState.QUEUED)
    assert s.duration_seconds == 0.0


def test_tier_stream_limits():
    for tier, expected in [
        (ServiceTier.BASIC, 1),
        (ServiceTier.STANDARD, 2),
        (ServiceTier.PREMIUM, 4),
    ]:
        cred = Credential(tier=tier)
        assert cred.max_streams == expected
