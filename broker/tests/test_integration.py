"""Integration tests — full platform lifecycle."""

import time

from broker.services.bootstrap import bootstrap


def test_full_lifecycle():
    """User connects, uses service, disconnects, gets billed."""
    platform = bootstrap()

    # Alice connects to mock-netflix
    session = platform.broker.request_session("user-alice", "mock-netflix")
    assert session.state.value == "active"
    assert session.credential_id != ""

    # Simulate 30 minutes of usage
    session.started_at = time.time() - 1800

    # Disconnect
    record = platform.broker.end_session(session.session_id)
    assert record is not None
    assert 1799 < record.duration_seconds < 1802

    # Check bill
    bill = platform.billing.user_bill("user-alice")
    assert bill.total_cost_cents > 0
    assert len(bill.breakdown) == 1

    # Netflix costs $15.99/mo = 1599 cents / 2592000 sec * 1800 sec ≈ 1.11 cents
    assert 1.0 < bill.total_cost_cents < 1.2


def test_multiple_users_concurrent():
    """Multiple users connect to same service simultaneously."""
    platform = bootstrap()

    sessions = []
    for uid in ["user-alice", "user-bob", "user-carol", "user-dave"]:
        s = platform.broker.request_session(uid, "mock-netflix")
        sessions.append(s)

    # Netflix has 2 premium creds × 4 streams = 8 slots
    active = [s for s in sessions if s.state.value == "active"]
    assert len(active) == 4  # all 4 should fit


def test_queue_and_drain():
    """Spotify is single-stream — test queuing behavior."""
    platform = bootstrap()

    # Spotify has 3 BASIC creds (1 stream each) = 3 total slots
    s1 = platform.broker.request_session("user-alice", "mock-spotify")
    s2 = platform.broker.request_session("user-bob", "mock-spotify")
    s3 = platform.broker.request_session("user-carol", "mock-spotify")
    assert s1.state.value == "active"
    assert s2.state.value == "active"
    assert s3.state.value == "active"

    # 4th should queue
    s4 = platform.broker.request_session("user-dave", "mock-spotify")
    assert s4.state.value == "queued"

    # End one session — queue should drain
    s1.started_at = time.time() - 60
    platform.broker.end_session(s1.session_id)

    assert s4.state.value == "active"


def test_platform_economics():
    """Verify the platform always operates at a loss (by design)."""
    platform = bootstrap()

    # Generate some usage
    sessions = []
    for uid in ["user-alice", "user-bob"]:
        for sid in ["mock-netflix", "mock-hulu"]:
            s = platform.broker.request_session(uid, sid)
            if s.started_at:
                s.started_at -= 3600  # 1 hour
            sessions.append(s)

    for s in sessions:
        platform.broker.end_session(s.session_id)

    summary = platform.billing.platform_summary()
    assert summary["operating_loss_cents"] > 0
    assert summary["cost_recovery_pct"] < 100


def test_credential_vault_roundtrip():
    """Credentials stored encrypted, revealed correctly."""
    platform = bootstrap()

    creds = platform.store.credentials_for_service("mock-netflix")
    assert len(creds) == 2

    for cred in creds:
        password = platform.vault.reveal_password(cred.credential_id)
        assert password is not None
        assert len(password) > 0
