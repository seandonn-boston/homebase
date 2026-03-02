"""
In-memory data store.

Thread-safe via a single lock. In production you'd swap this for a database,
but the interface stays the same.
"""

from __future__ import annotations

import threading
from typing import Optional

from broker.core.models import (
    Credential,
    CredentialState,
    ServiceDefinition,
    Session,
    SessionState,
    UsageRecord,
    User,
)


class Store:
    """Central in-memory store for all broker state."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._services: dict[str, ServiceDefinition] = {}
        self._credentials: dict[str, Credential] = {}
        self._users: dict[str, User] = {}
        self._sessions: dict[str, Session] = {}
        self._usage: list[UsageRecord] = []

    # --- Services -----------------------------------------------------------

    def add_service(self, svc: ServiceDefinition) -> None:
        with self._lock:
            self._services[svc.service_id] = svc

    def get_service(self, service_id: str) -> Optional[ServiceDefinition]:
        with self._lock:
            return self._services.get(service_id)

    def list_services(self) -> list[ServiceDefinition]:
        with self._lock:
            return list(self._services.values())

    # --- Credentials --------------------------------------------------------

    def add_credential(self, cred: Credential) -> None:
        with self._lock:
            self._credentials[cred.credential_id] = cred

    def get_credential(self, credential_id: str) -> Optional[Credential]:
        with self._lock:
            return self._credentials.get(credential_id)

    def find_available_credential(self, service_id: str) -> Optional[Credential]:
        """Return the first credential with capacity for this service."""
        with self._lock:
            for cred in self._credentials.values():
                if cred.service_id == service_id and cred.has_capacity:
                    return cred
            return None

    def credentials_for_service(self, service_id: str) -> list[Credential]:
        with self._lock:
            return [c for c in self._credentials.values() if c.service_id == service_id]

    # --- Users --------------------------------------------------------------

    def add_user(self, user: User) -> None:
        with self._lock:
            self._users[user.user_id] = user

    def get_user(self, user_id: str) -> Optional[User]:
        with self._lock:
            return self._users.get(user_id)

    def get_user_by_name(self, username: str) -> Optional[User]:
        with self._lock:
            for u in self._users.values():
                if u.username == username:
                    return u
            return None

    # --- Sessions -----------------------------------------------------------

    def add_session(self, session: Session) -> None:
        with self._lock:
            self._sessions[session.session_id] = session

    def get_session(self, session_id: str) -> Optional[Session]:
        with self._lock:
            return self._sessions.get(session_id)

    def active_sessions_for_credential(self, credential_id: str) -> list[Session]:
        with self._lock:
            return [
                s for s in self._sessions.values()
                if s.credential_id == credential_id
                and s.state == SessionState.ACTIVE
            ]

    def active_sessions_for_user(self, user_id: str) -> list[Session]:
        with self._lock:
            return [
                s for s in self._sessions.values()
                if s.user_id == user_id
                and s.state == SessionState.ACTIVE
            ]

    def queued_sessions_for_service(self, service_id: str) -> list[Session]:
        with self._lock:
            return sorted(
                [
                    s for s in self._sessions.values()
                    if s.service_id == service_id
                    and s.state == SessionState.QUEUED
                ],
                key=lambda s: s.queued_at,
            )

    # --- Usage --------------------------------------------------------------

    def add_usage_record(self, record: UsageRecord) -> None:
        with self._lock:
            self._usage.append(record)

    def usage_for_user(
        self, user_id: str, since: float = 0.0
    ) -> list[UsageRecord]:
        with self._lock:
            return [
                r for r in self._usage
                if r.user_id == user_id and r.recorded_at >= since
            ]

    def usage_for_service(
        self, service_id: str, since: float = 0.0
    ) -> list[UsageRecord]:
        with self._lock:
            return [
                r for r in self._usage
                if r.service_id == service_id and r.recorded_at >= since
            ]

    def all_usage(self, since: float = 0.0) -> list[UsageRecord]:
        with self._lock:
            return [r for r in self._usage if r.recorded_at >= since]
