"""
Core data models for the metered service broker.

All models are plain dataclasses backed by an in-memory store (swappable to
SQLite/Postgres later). No ORM — keeps the demo self-contained.
"""

from __future__ import annotations

import hashlib
import secrets
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ServiceTier(Enum):
    """Subscription tier — affects concurrent stream limits."""
    BASIC = "basic"          # 1 concurrent stream
    STANDARD = "standard"    # 2 concurrent streams
    PREMIUM = "premium"      # 4 concurrent streams


class SessionState(Enum):
    QUEUED = "queued"
    ACTIVE = "active"
    ENDED = "ended"
    EXPIRED = "expired"      # killed by max-duration enforcement


class CredentialState(Enum):
    AVAILABLE = "available"
    CHECKED_OUT = "checked_out"
    DISABLED = "disabled"    # flagged by the upstream service


# ---------------------------------------------------------------------------
# Service definition
# ---------------------------------------------------------------------------

@dataclass
class ServiceDefinition:
    """A service the broker pools access to (e.g. 'mock-netflix')."""
    service_id: str
    name: str
    monthly_cost_cents: int              # cost in cents (e.g. 1599 = $15.99)
    max_concurrent_streams: int          # per-credential concurrency cap
    max_session_duration_sec: int = 7200 # 2-hour default cap

    @property
    def cost_per_second(self) -> float:
        """Monthly cost spread across every second of the month (30 days)."""
        seconds_in_month = 30 * 24 * 3600
        return self.monthly_cost_cents / seconds_in_month


# ---------------------------------------------------------------------------
# Credentials
# ---------------------------------------------------------------------------

@dataclass
class Credential:
    """A single set of credentials for a pooled service account."""
    credential_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    service_id: str = ""
    email: str = ""
    password_hash: str = ""            # stored hashed, never plaintext
    tier: ServiceTier = ServiceTier.PREMIUM
    state: CredentialState = CredentialState.AVAILABLE
    active_sessions: int = 0
    last_checked_out: Optional[float] = None

    @staticmethod
    def hash_password(plain: str) -> str:
        salt = secrets.token_hex(8)
        h = hashlib.sha256(f"{salt}:{plain}".encode()).hexdigest()
        return f"{salt}:{h}"

    def verify_password(self, plain: str) -> bool:
        salt, expected = self.password_hash.split(":", 1)
        h = hashlib.sha256(f"{salt}:{plain}".encode()).hexdigest()
        return h == expected

    @property
    def max_streams(self) -> int:
        """Concurrency cap is the lesser of tier limit and service limit."""
        tier_map = {
            ServiceTier.BASIC: 1,
            ServiceTier.STANDARD: 2,
            ServiceTier.PREMIUM: 4,
        }
        return tier_map[self.tier]

    @property
    def has_capacity(self) -> bool:
        return (
            self.state == CredentialState.AVAILABLE
            and self.active_sessions < self.max_streams
        )


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

@dataclass
class User:
    """A broker platform user."""
    user_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    username: str = ""
    created_at: float = field(default_factory=time.time)


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

@dataclass
class Session:
    """A single brokered session — one user connected to one credential."""
    session_id: str = field(default_factory=lambda: uuid.uuid4().hex[:16])
    user_id: str = ""
    service_id: str = ""
    credential_id: str = ""
    state: SessionState = SessionState.QUEUED
    started_at: Optional[float] = None
    ended_at: Optional[float] = None
    queued_at: float = field(default_factory=time.time)

    @property
    def duration_seconds(self) -> float:
        if self.started_at is None:
            return 0.0
        end = self.ended_at or time.time()
        return end - self.started_at


# ---------------------------------------------------------------------------
# Usage / billing records
# ---------------------------------------------------------------------------

@dataclass
class UsageRecord:
    """Immutable ledger entry — one per completed session."""
    record_id: str = field(default_factory=lambda: uuid.uuid4().hex[:16])
    user_id: str = ""
    service_id: str = ""
    session_id: str = ""
    duration_seconds: float = 0.0
    cost_cents: float = 0.0            # user's share for this session
    recorded_at: float = field(default_factory=time.time)


@dataclass
class BillingSummary:
    """Computed view — not stored, generated on the fly."""
    user_id: str = ""
    period_start: float = 0.0
    period_end: float = 0.0
    total_seconds: float = 0.0
    total_cost_cents: float = 0.0
    breakdown: list[UsageRecord] = field(default_factory=list)

    @property
    def total_cost_dollars(self) -> float:
        return self.total_cost_cents / 100
