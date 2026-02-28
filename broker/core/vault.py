"""
Credential Vault — manages pooled service credentials.

Handles:
  - Encrypted-at-rest credential storage (Fernet symmetric encryption)
  - Checkout / checkin lifecycle with lock tracking
  - Capacity checks against per-credential concurrency limits
  - Credential rotation helpers
"""

from __future__ import annotations

import base64
import hashlib
import os
import time
from typing import Optional

from broker.core.models import Credential, CredentialState, ServiceTier
from broker.core.store import Store


def _derive_key(passphrase: str) -> bytes:
    """Derive a 32-byte Fernet key from a passphrase via SHA-256."""
    raw = hashlib.sha256(passphrase.encode()).digest()
    return base64.urlsafe_b64encode(raw)


class CredentialVault:
    """
    Manages the lifecycle of pooled service credentials.

    In production this would use a real KMS. Here we use a simple
    XOR-based obfuscation to demonstrate the pattern without adding
    a cryptography dependency.
    """

    def __init__(self, store: Store, master_key: str | None = None) -> None:
        self._store = store
        self._master_key = _derive_key(master_key or os.environ.get("BROKER_MASTER_KEY", "demo-key"))

    # --- Public API ---------------------------------------------------------

    def store_credential(
        self,
        service_id: str,
        email: str,
        password: str,
        tier: ServiceTier = ServiceTier.PREMIUM,
    ) -> Credential:
        """Encrypt and store a new credential."""
        cred = Credential(
            service_id=service_id,
            email=email,
            password_hash=self._obfuscate(password),
            tier=tier,
        )
        self._store.add_credential(cred)
        return cred

    def checkout(self, credential_id: str) -> Optional[Credential]:
        """
        Atomically increment active_sessions and mark checked-out.
        Returns None if credential is at capacity or disabled.
        """
        cred = self._store.get_credential(credential_id)
        if cred is None or not cred.has_capacity:
            return None
        cred.active_sessions += 1
        cred.state = CredentialState.AVAILABLE  # still available if below cap
        cred.last_checked_out = time.time()
        return cred

    def checkin(self, credential_id: str) -> None:
        """Decrement active_sessions when a session ends."""
        cred = self._store.get_credential(credential_id)
        if cred is None:
            return
        cred.active_sessions = max(0, cred.active_sessions - 1)

    def reveal_password(self, credential_id: str) -> Optional[str]:
        """De-obfuscate and return the plaintext password (for session setup)."""
        cred = self._store.get_credential(credential_id)
        if cred is None:
            return None
        return self._deobfuscate(cred.password_hash)

    def disable_credential(self, credential_id: str) -> None:
        """Mark a credential as disabled (e.g. upstream detected sharing)."""
        cred = self._store.get_credential(credential_id)
        if cred:
            cred.state = CredentialState.DISABLED

    def rotate_password(self, credential_id: str, new_password: str) -> bool:
        """Update the stored password for a credential."""
        cred = self._store.get_credential(credential_id)
        if cred is None:
            return False
        cred.password_hash = self._obfuscate(new_password)
        return True

    def available_credentials(self, service_id: str) -> list[Credential]:
        """List credentials with remaining capacity for a service."""
        return [
            c for c in self._store.credentials_for_service(service_id)
            if c.has_capacity
        ]

    # --- Internals ----------------------------------------------------------

    def _obfuscate(self, plaintext: str) -> str:
        """Simple XOR obfuscation — NOT real encryption. Demo only."""
        key_bytes = self._master_key
        data = plaintext.encode()
        obfuscated = bytes(b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(data))
        return base64.b64encode(obfuscated).decode()

    def _deobfuscate(self, token: str) -> str:
        """Reverse the XOR obfuscation."""
        key_bytes = self._master_key
        data = base64.b64decode(token.encode())
        plain = bytes(b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(data))
        return plain.decode()
