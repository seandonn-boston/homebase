"""Identity token models.

Implements the zero-trust identity system from Sections 09-10 and
the Brain's identity token lifecycle.

Key properties:
    - Cryptographically signed (HMAC-SHA256)
    - Session-scoped (cannot outlive the session)
    - Non-delegable (one agent, one token, no forwarding)
    - Authority tier bound at creation (cannot change mid-session)
    - Verifiable by any component without trusting the agent
"""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import time
from enum import Enum

from pydantic import BaseModel, Field


class AuthorityTierLevel(str, Enum):
    """Authority tier levels for identity tokens.

    Determines what Brain operations and fleet actions the agent can perform.
    """

    ADMIRAL = "admiral"
    ORCHESTRATOR = "orchestrator"
    SPECIALIST = "specialist"
    UTILITY = "utility"


class TokenClaims(BaseModel):
    """Claims embedded in an identity token.

    These are bound at session start and cannot change mid-session
    (vulnerability 8.3.2 mitigation: runtime authority binding).
    """

    agent_id: str = Field(
        ...,
        min_length=1,
        description="Unique agent identifier matching the fleet roster.",
    )
    agent_role: str = Field(
        ...,
        min_length=1,
        description="Agent role (e.g., 'Backend Implementer', 'QA Agent').",
    )
    authority_tier: AuthorityTierLevel = Field(
        ...,
        description="Authority tier — bound at creation, immutable.",
    )
    session_id: str = Field(
        ...,
        min_length=1,
        description="Session identifier — token cannot outlive this session.",
    )
    project: str = Field(
        ...,
        min_length=1,
        description="Project scope — agent can only access this project's resources.",
    )
    issued_at: float = Field(
        ...,
        description="Unix timestamp when the token was created.",
    )
    expires_at: float = Field(
        ...,
        description="Unix timestamp when the token expires.",
    )
    allowed_projects: list[str] = Field(
        default_factory=list,
        description="Additional projects this agent can read (cross-project access).",
    )


class IdentityToken(BaseModel):
    """A cryptographically signed identity token.

    Tokens are created by the Admiral/Orchestrator at session start.
    Every Brain operation, every fleet interaction verifies the token.

    Signing: HMAC-SHA256 over the canonical JSON of claims.
    The signing key is held by the runtime, never exposed to agents.
    """

    claims: TokenClaims
    signature: str = Field(
        ...,
        min_length=1,
        description="HMAC-SHA256 hex digest of the canonical claims JSON.",
    )
    token_id: str = Field(
        default_factory=lambda: secrets.token_hex(16),
        description="Unique token identifier for audit trails.",
    )

    @staticmethod
    def _canonical_claims(claims: TokenClaims) -> str:
        """Produce canonical JSON for signing (sorted keys, no whitespace)."""
        return json.dumps(claims.model_dump(), sort_keys=True, separators=(",", ":"))

    @classmethod
    def create(
        cls,
        claims: TokenClaims,
        signing_key: str,
    ) -> IdentityToken:
        """Create a new signed identity token.

        Args:
            claims: The token claims to sign.
            signing_key: HMAC signing key (held by runtime, never exposed to agents).

        Returns:
            A signed IdentityToken.
        """
        canonical = cls._canonical_claims(claims)
        signature = hmac.new(
            signing_key.encode("utf-8"),
            canonical.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return cls(claims=claims, signature=signature)

    def verify(self, signing_key: str) -> TokenVerificationResult:
        """Verify this token's signature and expiry.

        Args:
            signing_key: The same key used to create the token.

        Returns:
            TokenVerificationResult with valid flag and any errors.
        """
        errors = []

        # Verify signature
        canonical = self._canonical_claims(self.claims)
        expected = hmac.new(
            signing_key.encode("utf-8"),
            canonical.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(self.signature, expected):
            errors.append("SIGNATURE_INVALID: Token signature does not match claims.")

        # Verify expiry
        now = time.time()
        if now > self.claims.expires_at:
            errors.append(
                f"TOKEN_EXPIRED: Token expired at {self.claims.expires_at}, "
                f"current time is {now}."
            )

        # Verify issued_at is not in the future
        if self.claims.issued_at > now + 60:  # 60s clock skew tolerance
            errors.append(
                f"TOKEN_NOT_YET_VALID: Token issued at {self.claims.issued_at}, "
                f"current time is {now}."
            )

        return TokenVerificationResult(
            valid=len(errors) == 0,
            errors=errors,
            token_id=self.token_id,
            agent_id=self.claims.agent_id,
            authority_tier=self.claims.authority_tier,
        )

    @property
    def is_admiral(self) -> bool:
        return self.claims.authority_tier == AuthorityTierLevel.ADMIRAL

    @property
    def is_orchestrator(self) -> bool:
        return self.claims.authority_tier in (
            AuthorityTierLevel.ADMIRAL,
            AuthorityTierLevel.ORCHESTRATOR,
        )

    def can_access_project(self, project: str) -> bool:
        """Check if this token grants access to a given project."""
        if self.claims.project == project:
            return True
        return project in self.claims.allowed_projects


class TokenVerificationResult(BaseModel):
    """Result of verifying an identity token."""

    valid: bool
    errors: list[str] = Field(default_factory=list)
    token_id: str
    agent_id: str
    authority_tier: AuthorityTierLevel
