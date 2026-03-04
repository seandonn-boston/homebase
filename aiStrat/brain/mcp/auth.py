"""Authentication and authorization for the Brain MCP server.

Provides API key-based authentication with scoped authorization.
Every Brain tool (except brain_status) requires a valid token.

Scopes:
  read  — Query, retrieve, audit
  write — Record, strengthen (includes read)
  admin — Supersede, halt (includes write)
"""

from __future__ import annotations

import hashlib
import logging
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Protocol

logger = logging.getLogger(__name__)


class Scope(Enum):
    """Authorization scope for Brain operations."""

    READ = "read"
    WRITE = "write"
    ADMIN = "admin"

    def includes(self, required: Scope) -> bool:
        """Check if this scope satisfies the required scope.

        admin includes write includes read.
        """
        hierarchy = {Scope.READ: 0, Scope.WRITE: 1, Scope.ADMIN: 2}
        return hierarchy[self] >= hierarchy[required]


@dataclass(frozen=True)
class AuthContext:
    """Authenticated caller context attached to every authorized request."""

    identity: str
    scope: Scope
    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    authenticated_at: float = field(default_factory=time.time)


class AuthProvider(Protocol):
    """Protocol for authentication backends."""

    def authenticate(self, token: str) -> AuthContext:
        """Validate token and return context.

        Raises:
            AuthenticationError: If token is invalid.
        """
        ...


class AuthenticationError(Exception):
    """Raised when authentication fails."""


class AuthorizationError(Exception):
    """Raised when an authenticated caller lacks required scope."""


class APIKeyAuthProvider:
    """Simple API key authentication.

    Keys are stored as SHA-256 hashes to avoid plaintext exposure in memory.
    Each key maps to an identity and scope.
    """

    def __init__(self, keys: dict[str, tuple[str, Scope]]) -> None:
        """Initialize with key → (identity, scope) mapping.

        Args:
            keys: Mapping of plaintext API keys to (identity, scope) tuples.
                  Keys are hashed immediately; plaintext is not retained.
        """
        self._keys: dict[str, tuple[str, Scope]] = {}
        for key, (identity, scope) in keys.items():
            key_hash = hashlib.sha256(key.encode()).hexdigest()
            self._keys[key_hash] = (identity, scope)

    def authenticate(self, token: str) -> AuthContext:
        """Validate an API key and return auth context."""
        if not token:
            raise AuthenticationError("No authentication token provided")

        token_hash = hashlib.sha256(token.encode()).hexdigest()
        entry = self._keys.get(token_hash)

        if entry is None:
            logger.warning("Authentication failed: invalid token")
            raise AuthenticationError("Invalid authentication token")

        identity, scope = entry
        return AuthContext(identity=identity, scope=scope)


class NoAuthProvider:
    """Allows all requests without authentication.

    ONLY for isolated testing with strict_mode=False.
    Logs a warning on every call. Grants READ scope only — never ADMIN.
    """

    _warned = False

    def authenticate(self, token: str) -> AuthContext:
        if not NoAuthProvider._warned:
            logger.warning(
                "NoAuthProvider in use — grants READ only. "
                "Do NOT use in production. Configure APIKeyAuthProvider instead."
            )
            NoAuthProvider._warned = True
        return AuthContext(identity="anonymous", scope=Scope.READ)
