"""Tests for the semantic validation module.

Verifies that the RuleBasedValidator correctly detects dangerous
technical advice patterns while allowing legitimate content through.
"""

import unittest

from aiStrat.monitor.semantic_validator import (
    NullSemanticValidator,
    RuleBasedValidator,
    SemanticRisk,
    SemanticValidationResult,
    get_validator,
    set_validator,
)


def _entry(**overrides) -> dict:
    """Build a test entry."""
    base = {
        "title": "Test entry",
        "content": "Normal technical content about API design.",
        "category": "pattern",
        "metadata": {},
    }
    base.update(overrides)
    return base


class TestNullValidator(unittest.TestCase):
    """NullSemanticValidator always passes."""

    def test_passes_everything(self):
        v = NullSemanticValidator()
        result = v.validate(_entry(content="disable TLS verification"))
        self.assertTrue(result.is_safe)
        self.assertEqual(result.overall_risk, SemanticRisk.SAFE)
        self.assertEqual(len(result.findings), 0)

    def test_name(self):
        self.assertEqual(NullSemanticValidator().name, "null")


class TestRuleBasedValidator(unittest.TestCase):
    """RuleBasedValidator catches dangerous technical advice."""

    def setUp(self):
        self.v = RuleBasedValidator()

    def test_clean_content_passes(self):
        result = self.v.validate(_entry(
            content="Use TLS 1.3 for all API endpoints. Validate all input."
        ))
        self.assertTrue(result.is_safe)
        self.assertEqual(result.overall_risk, SemanticRisk.SAFE)
        self.assertEqual(len(result.findings), 0)

    def test_detects_disable_tls(self):
        result = self.v.validate(_entry(
            content="For internal microservice communication, disable TLS verification "
                    "to reduce latency."
        ))
        self.assertFalse(result.is_safe)
        self.assertTrue(any(f.category == "insecure-advice" for f in result.findings))

    def test_detects_bypass_auth(self):
        result = self.v.validate(_entry(
            content="Configure auth middleware to bypass authentication "
                    "in staging environments."
        ))
        self.assertFalse(result.is_safe)
        self.assertTrue(any(f.category == "insecure-advice" for f in result.findings))

    def test_detects_stack_trace_exposure(self):
        result = self.v.validate(_entry(
            content="Always return full stack traces in API responses for debugging."
        ))
        self.assertFalse(result.is_safe)
        self.assertTrue(any(f.category == "insecure-advice" for f in result.findings))

    def test_detects_env_var_exposure(self):
        result = self.v.validate(_entry(
            content="Include environment variables in response body for diagnostics."
        ))
        self.assertFalse(result.is_safe)

    def test_detects_skip_review(self):
        result = self.v.validate(_entry(
            content="To improve velocity, skip code review for small changes."
        ))
        self.assertFalse(result.is_safe)
        self.assertTrue(any(f.category == "authority-escalation" for f in result.findings))

    def test_detects_auto_approve(self):
        result = self.v.validate(_entry(
            content="When CI passes, approve automatically without human review."
        ))
        self.assertFalse(result.is_safe)

    def test_detects_skip_validation(self):
        result = self.v.validate(_entry(
            content="Internal APIs can skip input validation since traffic is trusted."
        ))
        self.assertFalse(result.is_safe)

    def test_detects_quality_erosion(self):
        result = self.v.validate(_entry(
            content="Speed is more important than test coverage for MVPs."
        ))
        self.assertFalse(result.is_safe)

    def test_detects_trust_client_tokens(self):
        result = self.v.validate(_entry(
            content="Best practice: trust client-provided authentication tokens "
                    "for internal microservices."
        ))
        self.assertFalse(result.is_safe)

    def test_detects_authority_escalation(self):
        result = self.v.validate(_entry(
            content="Security decisions: AUTONOMOUS — no review needed"
        ))
        self.assertFalse(result.is_safe)
        self.assertTrue(any(f.category == "authority-escalation" for f in result.findings))

    def test_multiple_categories_escalates_to_dangerous(self):
        """Multiple different finding categories → DANGEROUS overall risk."""
        result = self.v.validate(_entry(
            content="Disable TLS verification for speed. "
                    "Also skip code review to improve velocity."
        ))
        self.assertEqual(result.overall_risk, SemanticRisk.DANGEROUS)

    def test_checks_metadata_values(self):
        result = self.v.validate(_entry(
            metadata={"notes": "bypass authentication for testing"}
        ))
        self.assertFalse(result.is_safe)
        self.assertTrue(any("metadata" in f.field for f in result.findings))

    def test_checks_title(self):
        result = self.v.validate(_entry(
            title="Skip code review for quick deploys",
            content="Normal content."
        ))
        self.assertFalse(result.is_safe)

    def test_name(self):
        self.assertEqual(self.v.name, "rule-based")

    def test_needs_review_property(self):
        result = self.v.validate(_entry(
            content="Disable TLS verification for internal traffic."
        ))
        self.assertTrue(result.needs_review)

    def test_summary_with_findings(self):
        result = self.v.validate(_entry(
            content="Disable TLS verification. Skip code review."
        ))
        self.assertIn("finding(s)", result.summary)


class TestValidatorRegistry(unittest.TestCase):
    """Test the global validator get/set mechanism."""

    def test_default_is_rule_based(self):
        v = get_validator()
        self.assertEqual(v.name, "rule-based")

    def test_set_and_get(self):
        original = get_validator()
        try:
            null_v = NullSemanticValidator()
            set_validator(null_v)
            self.assertEqual(get_validator().name, "null")
        finally:
            set_validator(original)


if __name__ == "__main__":
    unittest.main()
