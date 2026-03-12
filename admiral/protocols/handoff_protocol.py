"""Handoff Protocol — Section 38 validation logic.

Provides validation functions for handoff documents beyond what
Pydantic model validation covers. These are semantic checks:
completeness, receiver readiness, and constraint satisfaction.

Per Section 38: validation operates at two levels:
1. Schema validation (Pydantic): required fields, sender ≠ receiver.
2. Semantic validation (this module): warnings for suspicious combinations,
   not hard rejections for missing optional fields.
"""

from __future__ import annotations

from admiral.models.handoff import HandoffDocument, validate_handoff

# Minimum characters for an acceptance criterion to be considered actionable.
# Per spec: "minimum 10 characters to be meaningful."
MIN_CRITERION_LENGTH = 10


def validate_handoff_completeness(doc: HandoffDocument) -> list[str]:
    """Validate a handoff document for completeness.

    Delegates to the core validate_handoff function and adds
    semantic warnings. Returns list of issues (warnings).
    Empty list = no concerns.

    Per Section 38: context_files and constraints are optional by design.
    A warning is issued only when the combination suggests incompleteness
    (e.g., a task description is long but has no supporting context).
    """
    issues = validate_handoff(doc)

    # Warn when task is complex (long description) but has no supporting context.
    # Simple inline tasks don't need context files.
    task_is_complex = len(doc.task) > 200
    if task_is_complex and not doc.context_files and not doc.constraints:
        issues.append(
            "Task description is substantial but no context files or constraints "
            "are specified. Receiver may lack necessary context to proceed."
        )

    return issues


def validate_acceptance(
    doc: HandoffDocument, receiver_role: str
) -> tuple[bool, list[str]]:
    """Pre-check whether a receiver can accept this handoff.

    Validates that:
    - The document is addressed to the receiver
    - The document passes core completeness validation
    - Acceptance criteria are actionable (>= 10 characters)

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

    # Check that acceptance criteria are actionable
    for i, criterion in enumerate(doc.acceptance_criteria):
        if len(criterion.strip()) < MIN_CRITERION_LENGTH:
            reasons.append(
                f"Acceptance criterion {i + 1} is too vague "
                f"(< {MIN_CRITERION_LENGTH} chars): '{criterion}'."
            )

    return (len(reasons) == 0, reasons)
