"""Tests for mock streaming services."""

from broker.services.mock_services import MockStreamingService


def test_login_success():
    svc = MockStreamingService("Test", max_concurrent=2)
    svc.register_account("a@b.com", "pass")

    result = svc.login("a@b.com", "pass", "device-1")
    assert result["ok"] is True
    assert "token" in result


def test_login_bad_credentials():
    svc = MockStreamingService("Test", max_concurrent=2)
    svc.register_account("a@b.com", "pass")

    result = svc.login("a@b.com", "wrong", "device-1")
    assert result["ok"] is False
    assert result["error"] == "invalid_credentials"


def test_max_concurrent_streams():
    svc = MockStreamingService("Test", max_concurrent=1)
    svc.register_account("a@b.com", "pass")

    r1 = svc.login("a@b.com", "pass", "device-1")
    assert r1["ok"] is True

    r2 = svc.login("a@b.com", "pass", "device-2")
    assert r2["ok"] is False
    assert r2["error"] == "max_streams_reached"


def test_end_stream_frees_slot():
    svc = MockStreamingService("Test", max_concurrent=1)
    svc.register_account("a@b.com", "pass")

    r1 = svc.login("a@b.com", "pass", "device-1")
    assert r1["ok"] is True

    svc.end_stream("a@b.com", r1["token"])
    assert svc.active_session_count("a@b.com") == 0

    r2 = svc.login("a@b.com", "pass", "device-2")
    assert r2["ok"] is True


def test_anti_sharing_detection():
    svc = MockStreamingService(
        "Test",
        max_concurrent=10,
        anti_sharing_enabled=True,
        anti_sharing_threshold=3,
    )
    svc.register_account("a@b.com", "pass")

    # Login from 3 unique devices — fine
    for i in range(3):
        r = svc.login("a@b.com", "pass", f"device-{i}")
        svc.end_stream("a@b.com", r["token"])

    # 4th unique device should trigger sharing detection
    r = svc.login("a@b.com", "pass", "device-new")
    assert r["ok"] is False
    assert r["error"] == "sharing_detected"


def test_no_anti_sharing_when_disabled():
    svc = MockStreamingService(
        "Test",
        max_concurrent=10,
        anti_sharing_enabled=False,
    )
    svc.register_account("a@b.com", "pass")

    for i in range(20):
        r = svc.login("a@b.com", "pass", f"device-{i}")
        assert r["ok"] is True
        svc.end_stream("a@b.com", r["token"])
