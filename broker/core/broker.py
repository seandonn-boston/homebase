"""
Session Broker — the core routing and concurrency engine.

Responsibilities:
  - Route a user request to an available credential (or queue it)
  - Enforce per-credential concurrency limits
  - Enforce max session duration
  - Drain queued users into newly-freed slots
  - Produce usage records on session end
"""

from __future__ import annotations

import time
from typing import Optional

from broker.core.models import (
    Session,
    SessionState,
    UsageRecord,
)
from broker.core.store import Store
from broker.core.vault import CredentialVault
from broker.core.billing import BillingEngine


class SessionBroker:
    """Manages the full lifecycle of brokered sessions."""

    def __init__(
        self,
        store: Store,
        vault: CredentialVault,
        billing: BillingEngine,
    ) -> None:
        self._store = store
        self._vault = vault
        self._billing = billing

    # --- Public API ---------------------------------------------------------

    def request_session(self, user_id: str, service_id: str) -> Session:
        """
        Request access to a service.

        If a credential with capacity exists, the session starts immediately.
        Otherwise the session is queued.
        """
        svc = self._store.get_service(service_id)
        if svc is None:
            raise ValueError(f"Unknown service: {service_id}")

        session = Session(
            user_id=user_id,
            service_id=service_id,
        )

        cred = self._store.find_available_credential(service_id)
        if cred is not None:
            checked = self._vault.checkout(cred.credential_id)
            if checked is not None:
                session.credential_id = cred.credential_id
                session.state = SessionState.ACTIVE
                session.started_at = time.time()
            else:
                session.state = SessionState.QUEUED
        else:
            session.state = SessionState.QUEUED

        self._store.add_session(session)
        return session

    def end_session(self, session_id: str) -> Optional[UsageRecord]:
        """
        End an active session. Produces a usage record and attempts to
        drain the queue for the freed slot.
        """
        session = self._store.get_session(session_id)
        if session is None:
            return None
        if session.state not in (SessionState.ACTIVE, SessionState.QUEUED):
            return None

        record = None

        if session.state == SessionState.ACTIVE:
            session.ended_at = time.time()
            session.state = SessionState.ENDED

            # Return credential to pool
            self._vault.checkin(session.credential_id)

            # Record usage
            record = self._billing.record_session(session)

            # Try to drain queue into freed slot
            self._drain_queue(session.service_id)

        elif session.state == SessionState.QUEUED:
            session.state = SessionState.ENDED

        return record

    def enforce_max_duration(self) -> list[str]:
        """
        Scan active sessions and expire any that exceed the service's
        max_session_duration_sec. Returns list of expired session IDs.

        In production this would be a background timer / cron job.
        """
        expired: list[str] = []
        now = time.time()

        for svc in self._store.list_services():
            for cred in self._store.credentials_for_service(svc.service_id):
                for sess in self._store.active_sessions_for_credential(cred.credential_id):
                    if sess.started_at and (now - sess.started_at) > svc.max_session_duration_sec:
                        sess.ended_at = now
                        sess.state = SessionState.EXPIRED
                        self._vault.checkin(sess.credential_id)
                        self._billing.record_session(sess)
                        expired.append(sess.session_id)

            if expired:
                self._drain_queue(svc.service_id)

        return expired

    def get_queue_position(self, session_id: str) -> Optional[int]:
        """Return 0-based queue position, or None if not queued."""
        session = self._store.get_session(session_id)
        if session is None or session.state != SessionState.QUEUED:
            return None
        queue = self._store.queued_sessions_for_service(session.service_id)
        for i, s in enumerate(queue):
            if s.session_id == session_id:
                return i
        return None

    def service_status(self, service_id: str) -> dict:
        """Return a snapshot of a service's current state."""
        svc = self._store.get_service(service_id)
        if svc is None:
            raise ValueError(f"Unknown service: {service_id}")

        creds = self._store.credentials_for_service(service_id)
        total_slots = sum(c.max_streams for c in creds if c.state.value != "disabled")
        used_slots = sum(c.active_sessions for c in creds)
        queue = self._store.queued_sessions_for_service(service_id)

        return {
            "service_id": service_id,
            "name": svc.name,
            "monthly_cost_cents": svc.monthly_cost_cents,
            "total_slots": total_slots,
            "used_slots": used_slots,
            "available_slots": total_slots - used_slots,
            "queue_depth": len(queue),
            "credential_count": len(creds),
        }

    # --- Internals ----------------------------------------------------------

    def _drain_queue(self, service_id: str) -> None:
        """Promote queued sessions into newly-available slots."""
        queue = self._store.queued_sessions_for_service(service_id)
        for queued_session in queue:
            cred = self._store.find_available_credential(service_id)
            if cred is None:
                break  # no more capacity
            checked = self._vault.checkout(cred.credential_id)
            if checked is None:
                continue
            queued_session.credential_id = cred.credential_id
            queued_session.state = SessionState.ACTIVE
            queued_session.started_at = time.time()
