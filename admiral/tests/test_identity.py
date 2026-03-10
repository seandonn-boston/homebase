"""Tests for identity token system.

Phase 1: Token creation, signing, verification, expiry, non-delegability.
"""

from __future__ import annotations

import time

import pytest

from admiral.models.identity import (
    IdentityToken,
    TokenClaims,
    AuthorityTierLevel,
    TokenVerificationResult,
)


@pytest.mark.phase1
class TestIdentityToken:
    def test_create_and_verify(self, sample_token, signing_key):
        result = sample_token.verify(signing_key)
        assert result.valid is True
        assert result.errors == []
        assert result.agent_id == "backend-implementer-001"
        assert result.authority_tier == AuthorityTierLevel.SPECIALIST

    def test_wrong_signing_key_fails(self, sample_token):
        result = sample_token.verify("wrong-key")
        assert result.valid is False
        assert any("SIGNATURE_INVALID" in e for e in result.errors)

    def test_tampered_claims_fail(self, sample_token, signing_key):
        # Tamper with the claims after signing
        sample_token.claims.agent_id = "hacked-agent"
        result = sample_token.verify(signing_key)
        assert result.valid is False
        assert any("SIGNATURE_INVALID" in e for e in result.errors)

    def test_expired_token_fails(self, signing_key):
        claims = TokenClaims(
            agent_id="expired-agent",
            agent_role="Test Agent",
            authority_tier=AuthorityTierLevel.SPECIALIST,
            session_id="session-expired",
            project="test",
            issued_at=time.time() - 7200,
            expires_at=time.time() - 3600,  # Expired 1 hour ago
        )
        token = IdentityToken.create(claims=claims, signing_key=signing_key)
        result = token.verify(signing_key)
        assert result.valid is False
        assert any("TOKEN_EXPIRED" in e for e in result.errors)

    def test_future_token_fails(self, signing_key):
        claims = TokenClaims(
            agent_id="future-agent",
            agent_role="Test Agent",
            authority_tier=AuthorityTierLevel.SPECIALIST,
            session_id="session-future",
            project="test",
            issued_at=time.time() + 3600,  # 1 hour in the future
            expires_at=time.time() + 7200,
        )
        token = IdentityToken.create(claims=claims, signing_key=signing_key)
        result = token.verify(signing_key)
        assert result.valid is False
        assert any("TOKEN_NOT_YET_VALID" in e for e in result.errors)

    def test_authority_tier_levels(self, signing_key):
        for tier in AuthorityTierLevel:
            claims = TokenClaims(
                agent_id=f"agent-{tier.value}",
                agent_role="Test Agent",
                authority_tier=tier,
                session_id="session-test",
                project="test",
                issued_at=time.time(),
                expires_at=time.time() + 3600,
            )
            token = IdentityToken.create(claims=claims, signing_key=signing_key)
            result = token.verify(signing_key)
            assert result.valid is True
            assert result.authority_tier == tier

    def test_is_admiral(self, signing_key):
        claims = TokenClaims(
            agent_id="admiral",
            agent_role="Admiral",
            authority_tier=AuthorityTierLevel.ADMIRAL,
            session_id="session-test",
            project="test",
            issued_at=time.time(),
            expires_at=time.time() + 3600,
        )
        token = IdentityToken.create(claims=claims, signing_key=signing_key)
        assert token.is_admiral is True
        assert token.is_orchestrator is True

    def test_is_orchestrator(self, signing_key):
        claims = TokenClaims(
            agent_id="orchestrator",
            agent_role="Orchestrator",
            authority_tier=AuthorityTierLevel.ORCHESTRATOR,
            session_id="session-test",
            project="test",
            issued_at=time.time(),
            expires_at=time.time() + 3600,
        )
        token = IdentityToken.create(claims=claims, signing_key=signing_key)
        assert token.is_admiral is False
        assert token.is_orchestrator is True

    def test_project_access(self, sample_token):
        assert sample_token.can_access_project("admiral-self-build") is True
        assert sample_token.can_access_project("other-project") is False

    def test_cross_project_access(self, signing_key):
        claims = TokenClaims(
            agent_id="orchestrator",
            agent_role="Orchestrator",
            authority_tier=AuthorityTierLevel.ORCHESTRATOR,
            session_id="session-test",
            project="project-a",
            issued_at=time.time(),
            expires_at=time.time() + 3600,
            allowed_projects=["project-b", "project-c"],
        )
        token = IdentityToken.create(claims=claims, signing_key=signing_key)
        assert token.can_access_project("project-a") is True
        assert token.can_access_project("project-b") is True
        assert token.can_access_project("project-c") is True
        assert token.can_access_project("project-d") is False

    def test_unique_token_ids(self, sample_claims, signing_key):
        t1 = IdentityToken.create(claims=sample_claims, signing_key=signing_key)
        t2 = IdentityToken.create(claims=sample_claims, signing_key=signing_key)
        assert t1.token_id != t2.token_id
