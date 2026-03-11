"""Schema validation tests.

Validates that Pydantic models produce JSON that conforms to the
authoritative JSON Schema files in aiStrat/.

This catches divergence between spec schemas and implementation models.
"""

from __future__ import annotations

import json
from pathlib import Path

import jsonschema
import pytest

from admiral.models.handoff import HandoffDocument, SessionHandoff
from admiral.hooks.manifest import HookManifest

# Paths to authoritative schemas
SPEC_ROOT = Path(__file__).resolve().parent.parent.parent / "aiStrat"
HANDOFF_SCHEMA_PATH = SPEC_ROOT / "handoff" / "v1.schema.json"
HOOK_MANIFEST_SCHEMA_PATH = SPEC_ROOT / "hooks" / "manifest.schema.json"


@pytest.fixture
def handoff_schema() -> dict:
    """Load the authoritative handoff v1 JSON Schema."""
    with HANDOFF_SCHEMA_PATH.open() as f:
        return json.load(f)


@pytest.fixture
def hook_manifest_schema() -> dict:
    """Load the authoritative hook manifest JSON Schema."""
    with HOOK_MANIFEST_SCHEMA_PATH.open() as f:
        return json.load(f)


# ── Handoff Schema Validation ──────────────────────────────────────────


class TestHandoffSchemaValidation:
    """Validate HandoffDocument instances against v1.schema.json."""

    def test_minimal_handoff_validates(self, handoff_schema: dict) -> None:
        """A minimal HandoffDocument should validate against the schema."""
        doc = HandoffDocument(
            **{
                "from": "Backend Implementer",
                "to": "QA Agent",
                "via": "Orchestrator",
                "task": "Review the API endpoint implementation",
                "deliverable": "Code diff for /api/users endpoint",
                "acceptance_criteria": ["All tests pass", "No lint errors"],
            }
        )
        schema_dict = doc.to_schema_dict()
        jsonschema.validate(instance=schema_dict, schema=handoff_schema)

    def test_full_handoff_validates(self, handoff_schema: dict) -> None:
        """A fully-populated HandoffDocument should validate against the schema."""
        doc = HandoffDocument(
            **{
                "from": "API Designer",
                "to": "Backend Implementer",
                "via": "Orchestrator",
                "task": "Implement the user registration endpoint",
                "deliverable": "OpenAPI spec for POST /api/users",
                "acceptance_criteria": ["Endpoint returns 201", "Validation errors return 422"],
                "context_files": ["src/api/routes.py", "docs/api-spec.yaml"],
                "assumptions": ["Using PostgreSQL as the database"],
                "open_questions": ["Should we support OAuth in v1?"],
                "metadata": {"priority": "high"},
            }
        )
        schema_dict = doc.to_schema_dict()
        jsonschema.validate(instance=schema_dict, schema=handoff_schema)

    def test_session_handoff_validates(self, handoff_schema: dict) -> None:
        """A HandoffDocument with session_handoff should validate."""
        doc = HandoffDocument(
            **{
                "from": "Backend Implementer",
                "to": "Backend Implementer",
                "via": "Orchestrator",
                "task": "Continue API implementation",
                "deliverable": "Partial implementation of /api/users",
                "acceptance_criteria": ["Pick up from checkpoint"],
            }
        )
        doc.session_handoff = SessionHandoff(
            session_id="session-001",
            agent="Backend Implementer",
            completed=["Database schema created"],
            in_progress=["Route handler partially implemented"],
            next_session_should=["Complete route handler", "Add tests"],
        )
        schema_dict = doc.to_schema_dict()
        jsonschema.validate(instance=schema_dict, schema=handoff_schema)

    def test_invalid_via_rejected_by_schema(self, handoff_schema: dict) -> None:
        """The schema restricts 'via' to 'Orchestrator' or 'Direct'."""
        invalid_doc = {
            "$schema": "handoff/v1",
            "from": "Agent A",
            "to": "Agent B",
            "via": "InvalidRoute",
            "task": "Do something",
            "deliverable": "Something",
            "acceptance_criteria": ["Done"],
        }
        with pytest.raises(jsonschema.ValidationError):
            jsonschema.validate(instance=invalid_doc, schema=handoff_schema)

    def test_missing_required_field_rejected(self, handoff_schema: dict) -> None:
        """The schema requires from, to, via, task, deliverable, acceptance_criteria."""
        incomplete_doc = {
            "$schema": "handoff/v1",
            "from": "Agent A",
            "to": "Agent B",
            # missing via, task, deliverable, acceptance_criteria
        }
        with pytest.raises(jsonschema.ValidationError):
            jsonschema.validate(instance=incomplete_doc, schema=handoff_schema)


# ── Hook Manifest Schema Validation ────────────────────────────────────


class TestHookManifestSchemaValidation:
    """Validate HookManifest instances against manifest.schema.json."""

    def test_minimal_manifest_validates(self, hook_manifest_schema: dict) -> None:
        """A minimal HookManifest should validate against the schema."""
        manifest = HookManifest(
            name="test_hook",
            version="1.0.0",
            events=["PostToolUse"],
            timeout_ms=5000,
            input_contract="v1",
            description="A test hook for validation purposes.",
        )
        # Convert to schema-compatible dict
        schema_dict = manifest.model_dump(by_alias=True, exclude_none=True)
        # Remove fields not in the schema
        schema_dict.pop("is_async", None)
        if not manifest.is_async:
            schema_dict.pop("async", None)
        # Convert enum values to strings
        schema_dict["events"] = [e.value if hasattr(e, "value") else e for e in schema_dict["events"]]
        jsonschema.validate(instance=schema_dict, schema=hook_manifest_schema)

    def test_full_manifest_validates(self, hook_manifest_schema: dict) -> None:
        """A fully-populated HookManifest should validate against the schema."""
        manifest = HookManifest(
            name="context_health_check",
            version="1.0.0",
            events=["PostToolUse"],
            timeout_ms=10000,
            requires=["context_baseline"],
            input_contract="v1",
            description="Checks context window health after every tool use invocation.",
            **{"async": False},
        )
        schema_dict = {
            "name": manifest.name,
            "version": manifest.version,
            "events": [e.value for e in manifest.events],
            "timeout_ms": manifest.timeout_ms,
            "requires": manifest.requires,
            "input_contract": manifest.input_contract,
            "description": manifest.description,
            "async": manifest.is_async,
        }
        jsonschema.validate(instance=schema_dict, schema=hook_manifest_schema)

    def test_all_spec_manifests_validate(self, hook_manifest_schema: dict) -> None:
        """Every hook.manifest.json in aiStrat/hooks/ should validate against the schema."""
        hooks_dir = SPEC_ROOT / "hooks"
        manifest_files = list(hooks_dir.glob("*/hook.manifest.json"))
        assert len(manifest_files) == 8, f"Expected 8 hook manifests, found {len(manifest_files)}"

        for manifest_path in manifest_files:
            with manifest_path.open() as f:
                data = json.load(f)
            jsonschema.validate(instance=data, schema=hook_manifest_schema)

    def test_all_spec_manifests_load_as_pydantic(self) -> None:
        """Every hook.manifest.json should load as a HookManifest Pydantic model."""
        hooks_dir = SPEC_ROOT / "hooks"
        manifest_files = list(hooks_dir.glob("*/hook.manifest.json"))
        assert len(manifest_files) == 8

        for manifest_path in manifest_files:
            manifest = HookManifest.from_file(manifest_path)
            assert manifest.name
            assert manifest.version
            assert len(manifest.events) >= 1
            assert manifest.timeout_ms >= 100


# ── Standing Orders + Escalation (no JSON schema, but structural tests) ──


class TestProtocolStructure:
    """Validate that protocol models match Section 36-37 structure."""

    def test_standing_orders_count(self) -> None:
        from admiral.protocols.standing_orders import load_standing_orders
        orders = load_standing_orders()
        assert len(orders) == 15

    def test_standing_orders_by_priority(self) -> None:
        from admiral.protocols.standing_orders import load_standing_orders_by_priority, PriorityCategory
        orders = load_standing_orders_by_priority()
        # Safety orders should come first
        assert orders[0].priority == PriorityCategory.SAFETY

    def test_escalation_report_renders(self) -> None:
        from admiral.protocols.escalation import EscalationReport, EscalationSeverity, EscalationTrigger
        report = EscalationReport(
            agent="Backend Implementer",
            task="Implement user registration",
            severity=EscalationSeverity.HIGH,
            trigger=EscalationTrigger.BUDGET_EXCEEDED,
            blocker="Token budget exceeded at 95% with 3 subtasks remaining",
            context="Implementing POST /api/users endpoint with validation",
            root_cause_assessment="Task was underestimated; validation logic is more complex than expected",
            whats_needed="Additional 50,000 token budget allocation",
            impact="Registration endpoint will be incomplete without budget extension",
        )
        rendered = report.render()
        assert "ESCALATION REPORT" in rendered
        assert "Backend Implementer" in rendered
        assert "High" in rendered

    def test_escalation_routing(self) -> None:
        from admiral.protocols.escalation import EscalationReport, EscalationSeverity, EscalationTrigger
        critical = EscalationReport(
            agent="Security Auditor",
            task="Audit authentication",
            severity=EscalationSeverity.CRITICAL,
            trigger=EscalationTrigger.SECURITY_CONCERN,
            blocker="Credentials exposed in logs",
            context="Reviewing authentication flow",
            root_cause_assessment="Logger captures full request including auth headers",
            whats_needed="Immediate credential rotation and log scrubbing",
            impact="Active credential exposure",
        )
        assert critical.route_to() == "Admiral"

        medium = EscalationReport(
            agent="QA Agent",
            task="Run test suite",
            severity=EscalationSeverity.MEDIUM,
            trigger=EscalationTrigger.BLOCKING_DEPENDENCY,
            blocker="Test database unavailable",
            context="Running integration tests",
            root_cause_assessment="Database migration not applied",
            whats_needed="DBA to run migration",
            impact="Integration tests blocked",
        )
        assert medium.route_to() == "Orchestrator"

    def test_emergency_halt_report_renders(self) -> None:
        """EmergencyHaltReport should render in the Section 37 format."""
        from admiral.protocols.escalation import EmergencyHaltReport, EmergencyHaltTrigger
        report = EmergencyHaltReport(
            agent="Security Auditor",
            trigger=EmergencyHaltTrigger.SECURITY_BREACH,
            what_happened="Discovered credentials in application logs during routine audit",
            current_state="Logs contain plaintext API keys from last 48 hours of requests",
            evidence="grep found 247 instances of Authorization headers in access.log",
        )
        rendered = report.render()
        assert "EMERGENCY HALT" in rendered
        assert "CRITICAL — EMERGENCY HALT" in rendered
        assert "Security Auditor" in rendered
        assert "security_breach" in rendered
        assert "Admiral direction" in rendered

    def test_emergency_halt_all_triggers(self) -> None:
        """All 6 EmergencyHaltTrigger values should be valid."""
        from admiral.protocols.escalation import EmergencyHaltTrigger
        triggers = list(EmergencyHaltTrigger)
        assert len(triggers) == 6
        expected = {
            "data_destruction", "security_breach", "compliance_violation",
            "safety_hazard", "cascade_failure", "access_risk_exceeded",
        }
        assert {t.value for t in triggers} == expected

    def test_all_escalation_triggers(self) -> None:
        """All 8 EscalationTrigger values should match Section 37."""
        from admiral.protocols.escalation import EscalationTrigger
        triggers = list(EscalationTrigger)
        assert len(triggers) == 8
        expected = {
            "scope_change", "budget_exceeded", "security_concern",
            "contradictory_requirements", "authority_exceeded",
            "recovery_exhausted", "blocking_dependency", "safety_concern",
        }
        assert {t.value for t in triggers} == expected
