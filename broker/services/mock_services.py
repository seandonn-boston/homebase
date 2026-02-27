"""
Mock streaming services for demo purposes.

These simulate real services with:
  - Concurrent session limits
  - Session validation
  - Anti-sharing detection (simplified)

No real network calls — everything is in-memory.
"""

from __future__ import annotations

import random
import time
from dataclasses import dataclass, field


@dataclass
class MockSession:
    """A session on the mock upstream service."""
    session_token: str = ""
    email: str = ""
    started_at: float = field(default_factory=time.time)
    device_fingerprint: str = ""


class MockStreamingService:
    """
    Simulates a streaming service with concurrent session enforcement.

    This is what the real Netflix/Hulu/etc API would look like from the
    broker's perspective — login, start stream, check session, end stream.
    """

    def __init__(
        self,
        name: str,
        max_concurrent: int = 4,
        anti_sharing_enabled: bool = False,
        anti_sharing_threshold: int = 5,
    ) -> None:
        self.name = name
        self.max_concurrent = max_concurrent
        self.anti_sharing_enabled = anti_sharing_enabled
        self.anti_sharing_threshold = anti_sharing_threshold

        self._accounts: dict[str, str] = {}          # email -> password
        self._sessions: dict[str, list[MockSession]] = {}  # email -> active sessions
        self._login_history: dict[str, list[str]] = {}     # email -> device fingerprints

    def register_account(self, email: str, password: str) -> None:
        """Set up a mock account."""
        self._accounts[email] = password
        self._sessions[email] = []
        self._login_history[email] = []

    def login(self, email: str, password: str, device_fingerprint: str = "") -> dict:
        """
        Attempt login. Returns session token or error.

        Simulates:
          - Bad credentials
          - Concurrent session limit
          - Anti-sharing detection (too many unique devices)
        """
        if email not in self._accounts or self._accounts[email] != password:
            return {"ok": False, "error": "invalid_credentials"}

        active = self._sessions.get(email, [])
        if len(active) >= self.max_concurrent:
            return {"ok": False, "error": "max_streams_reached"}

        fp = device_fingerprint or f"device-{random.randint(1000, 9999)}"

        # Anti-sharing: flag if too many unique devices in recent history
        if self.anti_sharing_enabled:
            history = self._login_history.get(email, [])
            unique_devices = set(history[-20:])  # last 20 logins
            unique_devices.add(fp)
            if len(unique_devices) > self.anti_sharing_threshold:
                return {"ok": False, "error": "sharing_detected"}

        token = f"tok-{random.randint(100000, 999999)}"
        session = MockSession(
            session_token=token,
            email=email,
            device_fingerprint=fp,
        )
        self._sessions.setdefault(email, []).append(session)
        self._login_history.setdefault(email, []).append(fp)

        return {"ok": True, "token": token}

    def end_stream(self, email: str, token: str) -> bool:
        """End a streaming session."""
        sessions = self._sessions.get(email, [])
        for i, s in enumerate(sessions):
            if s.session_token == token:
                sessions.pop(i)
                return True
        return False

    def active_session_count(self, email: str) -> int:
        return len(self._sessions.get(email, []))

    def is_account_flagged(self, email: str) -> bool:
        """Check if anti-sharing has flagged this account."""
        if not self.anti_sharing_enabled:
            return False
        history = self._login_history.get(email, [])
        unique = set(history[-20:])
        return len(unique) > self.anti_sharing_threshold


def create_mock_services() -> dict[str, MockStreamingService]:
    """Create a standard set of mock services for demo."""
    return {
        "mock-netflix": MockStreamingService(
            name="Mock Netflix",
            max_concurrent=4,
            anti_sharing_enabled=True,
            anti_sharing_threshold=8,
        ),
        "mock-hulu": MockStreamingService(
            name="Mock Hulu",
            max_concurrent=2,
            anti_sharing_enabled=False,
        ),
        "mock-disney": MockStreamingService(
            name="Mock Disney+",
            max_concurrent=4,
            anti_sharing_enabled=True,
            anti_sharing_threshold=6,
        ),
        "mock-hbo": MockStreamingService(
            name="Mock HBO Max",
            max_concurrent=3,
            anti_sharing_enabled=False,
        ),
        "mock-spotify": MockStreamingService(
            name="Mock Spotify",
            max_concurrent=1,    # Spotify is single-stream
            anti_sharing_enabled=True,
            anti_sharing_threshold=4,
        ),
    }
