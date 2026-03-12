"""Handoff Protocol — Section 38 validation logic.

Provides validation functions for handoff documents beyond what
Pydantic model validation covers. These are semantic checks:
completeness, receiver readiness, and constraint satisfaction.
"""

from __future__ import annotations

from admiral.models.handoff import HandoffDocument, validate_handoff


def validate_handoff_completeness(doc: HandoffDocument) -> list[str]:
    """Validate a handoff document for completeness.

    Delegates to the core validate_handoff function and adds
    additional semantic checks.

    Returns list of issues. Empty list = valid.
    """
    issues = validate_handoff(doc)

    # Additional completeness checks beyond core validation
    if not doc.context_files and not doc.constraints:
        issues.append(
            "No context files or constraints specified. "
            "Receiver may lack necessary context to proceed."
        )

    return issues


def validate_acceptance(doc: HandoffDocument, receiver_role: str) -> tuple[bool, list[str]]:
    """Pre-check whether a receiver can accept this handoff.

    Validates that:
    - The document is addressed to the receiver
    - The document passes completeness validation
    - Acceptance criteria are actionable

    Returns (can_accept, reasons). If can_accept is False, reasons
    explains why.
    """
    reasons = []

    if doc.to_agent != receiver_role:
        reasons.append(
            f"Handoff addressed to '{doc.to_agent}', not '{receiver_role}'."
        )

    completeness_issues = validate_handoff(doc)
    if completeness_issues:
        reasons.extend(completeness_issues)

    # Check that acceptance criteria are substantive
    for i, criterion in enumerate(doc.acceptance_criteria):
        if len(criterion.strip()) < 5:
            reasons.append(
                f"Acceptance criterion {i + 1} is too vague: '{criterion}'."
            )

    return (len(reasons) == 0, reasons)
