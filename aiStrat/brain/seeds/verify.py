"""Seed integrity verification for the Fleet Brain.

Computes SHA-256 checksums of the seed_research.py source file and
compares against a known-good hash. If the file has been tampered with,
the verification fails and the Brain should refuse to load seeds.

v4: Added for Vuln 8.1.7 — seed supply chain protection.
"""

from __future__ import annotations

import hashlib
import logging
import os

from ..core.models import Provenance

logger = logging.getLogger(__name__)

# SHA-256 of the seed_research.py file at v4 release.
# Update this value when legitimate seed changes are made.
# To recompute: python -c "import hashlib; print(hashlib.sha256(open('aiStrat/brain/seeds/seed_research.py','rb').read()).hexdigest())"
_EXPECTED_CHECKSUM = "57abaa4b0dee4daa80170d1b24369b8c2192a04ba704323a101e6a2edd13dcb8"
_SEED_FILE = os.path.join(os.path.dirname(__file__), "seed_research.py")

# Known seed entry titles — if any are missing or changed, integrity check fails
EXPECTED_SEED_TITLES = frozenset({
    "Hooks over instructions for hard constraints",
    "LLM-Last design principle",
    "Progressive disclosure via skills",
    "The boring agents win in production",
    "Deterministic backbone with intelligence deployed where it matters",
    "Spec-first workflow for structured development",
    "Self-healing quality checks close the generation-validation loop",
    "Session persistence via ledgers, handoffs, and checkpoints",
    "Git worktree isolation for parallel multi-agent development",
    "Swarm intelligence with queen-worker topology",
    "Configuration is the new code — agent configs are first-class artifacts",
    "Adversarial multi-model workflow for quality",
    "Meta-agent pattern: agents that build agents",
    "Scheduled agents for automated quality maintenance",
    "AI coding agent landscape as of February 2026",
    "MCP and A2A protocols becoming the TCP/IP of agents",
    "LLM model rankings for agent work — February 2026",
    "Agentic AI market size and adoption metrics — February 2026",
    "Enterprise AI agent deployments at scale — February 2026",
    "Agent framework landscape — February 2026",
    "Claude Code configuration ecosystem — February 2026",
    "MCP server ecosystem — production implementations",
    "Context engineering supersedes prompt engineering",
    "Security is the blind spot of the agent ecosystem",
    "Three-pillar production deployment: planning + observability + orchestration",
    "Multi-agent orchestration systems are converging on similar patterns",
    "Vibe coding hits a ceiling at enterprise scale",
    "AI agents are accelerating scientific discovery at unprecedented rates",
    "CTF competitions are a solved game for well-engineered AI agents",
    "Copilot hierarchy enables fine-grained agent scoping",
    "MCP chosen as universal agent-to-tool protocol",
    "Postgres + pgvector chosen for Brain architecture",
    "Four-tier model selection strategy for fleet economics",
    "Memory poisoning persists across all future sessions",
    "Agent supply chain attacks via third-party skills and plugins",
    "Bloated CLAUDE.md causes instruction-ignoring under context pressure",
    "Superuser problem: autonomous agents with broad permissions create security blind spots",
    "'Agents of Chaos' — documented real agent failures in production",
})


def compute_seed_checksum() -> str:
    """Compute the SHA-256 checksum of the seed file."""
    with open(_SEED_FILE, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def verify_seed_titles(brain) -> list[str]:
    """Verify that all expected seed entry titles exist in the Brain.

    Returns a list of missing or unexpected titles. Empty list = all good.
    """
    issues = []

    # Get all entries with provenance="seed"
    entries = brain.store.list_entries(current_only=False)
    seed_titles = {e.title for e in entries if e.provenance == Provenance.SEED}

    # Check for missing expected titles
    missing = EXPECTED_SEED_TITLES - seed_titles
    for title in sorted(missing):
        issues.append(f"MISSING seed entry: {title}")

    return issues


def verify_seeds(warn_only: bool = False) -> bool:
    """Run all seed integrity checks.

    Args:
        warn_only: If True, log warnings but return True. If False,
                   return False on any integrity failure.

    Returns:
        True if all checks pass (or warn_only=True), False otherwise.
    """
    try:
        checksum = compute_seed_checksum()
        logger.info("Seed file checksum: %s", checksum)
        if checksum != _EXPECTED_CHECKSUM:
            msg = (
                f"Seed file integrity check FAILED: "
                f"expected {_EXPECTED_CHECKSUM[:16]}..., "
                f"got {checksum[:16]}..."
            )
            if warn_only:
                logger.warning(msg)
                return True
            logger.error(msg)
            return False
        logger.info("Seed file integrity check passed.")
        return True
    except FileNotFoundError:
        msg = "Seed file not found: %s" % _SEED_FILE
        if warn_only:
            logger.warning(msg)
            return True
        logger.error(msg)
        return False
    except Exception as e:
        msg = f"Seed verification failed: {e}"
        if warn_only:
            logger.warning(msg)
            return True
        logger.error(msg)
        return False
