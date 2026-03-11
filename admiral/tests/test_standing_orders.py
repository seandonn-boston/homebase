"""Tests for Standing Orders — Section 36.

Validates that all 15 Standing Orders load correctly, are properly
categorized, and render for agent context injection.
"""

from __future__ import annotations

import pytest

from admiral.protocols.standing_orders import (
    PriorityCategory,
    StandingOrder,
    get_safety_orders,
    get_standing_order,
    load_standing_orders,
    load_standing_orders_by_priority,
    render_standing_orders,
)


class TestStandingOrdersLoad:
    """Test that Standing Orders load correctly."""

    def test_load_returns_15_orders(self) -> None:
        orders = load_standing_orders()
        assert len(orders) == 15

    def test_orders_numbered_1_through_15(self) -> None:
        orders = load_standing_orders()
        numbers = [so.number for so in orders]
        assert numbers == list(range(1, 16))

    def test_every_order_has_rules(self) -> None:
        orders = load_standing_orders()
        for so in orders:
            assert len(so.rules) >= 1, f"SO {so.number} has no rules"

    def test_every_order_has_title(self) -> None:
        orders = load_standing_orders()
        for so in orders:
            assert so.title, f"SO {so.number} has no title"


class TestStandingOrderPriority:
    """Test priority categorization matches Section 36."""

    def test_safety_orders(self) -> None:
        """SO 10, 12, 14 are Safety priority."""
        orders = load_standing_orders()
        safety_numbers = {so.number for so in orders if so.priority == PriorityCategory.SAFETY}
        assert safety_numbers == {10, 12, 14}

    def test_authority_orders(self) -> None:
        """SO 5, 6 are Authority priority."""
        orders = load_standing_orders()
        authority_numbers = {so.number for so in orders if so.priority == PriorityCategory.AUTHORITY}
        assert authority_numbers == {5, 6}

    def test_process_orders(self) -> None:
        """SO 7, 8, 15 are Process priority."""
        orders = load_standing_orders()
        process_numbers = {so.number for so in orders if so.priority == PriorityCategory.PROCESS}
        assert process_numbers == {7, 8, 15}

    def test_communication_orders(self) -> None:
        """SO 2, 4, 9 are Communication priority."""
        orders = load_standing_orders()
        comm_numbers = {so.number for so in orders if so.priority == PriorityCategory.COMMUNICATION}
        assert comm_numbers == {2, 4, 9}

    def test_scope_orders(self) -> None:
        """SO 1, 3, 11, 13 are Scope priority."""
        orders = load_standing_orders()
        scope_numbers = {so.number for so in orders if so.priority == PriorityCategory.SCOPE}
        assert scope_numbers == {1, 3, 11, 13}

    def test_by_priority_sorts_safety_first(self) -> None:
        orders = load_standing_orders_by_priority()
        # First orders should be Safety
        assert orders[0].priority == PriorityCategory.SAFETY
        # Last orders should be Scope
        assert orders[-1].priority == PriorityCategory.SCOPE


class TestStandingOrderTitles:
    """Verify Standing Order titles match Section 36."""

    EXPECTED_TITLES = {
        1: "Identity Discipline",
        2: "Output Routing",
        3: "Scope Boundaries",
        4: "Context Honesty",
        5: "Decision Authority",
        6: "Recovery Protocol",
        7: "Checkpointing",
        8: "Quality Standards",
        9: "Communication Format",
        10: "Prohibitions",
        11: "Context Discovery",
        12: "Zero-Trust Self-Protection",
        13: "Bias Awareness",
        14: "Compliance and Ethics",
        15: "Pre-Work Validation",
    }

    def test_all_titles_match(self) -> None:
        orders = load_standing_orders()
        for so in orders:
            expected = self.EXPECTED_TITLES[so.number]
            assert so.title == expected, f"SO {so.number}: expected '{expected}', got '{so.title}'"


class TestStandingOrderAccess:
    """Test individual order access and filtering."""

    def test_get_standing_order_by_number(self) -> None:
        so5 = get_standing_order(5)
        assert so5.number == 5
        assert so5.title == "Decision Authority"

    def test_get_standing_order_invalid_number(self) -> None:
        with pytest.raises(ValueError, match="must be 1-15"):
            get_standing_order(0)
        with pytest.raises(ValueError, match="must be 1-15"):
            get_standing_order(16)

    def test_get_safety_orders(self) -> None:
        safety = get_safety_orders()
        assert len(safety) == 3
        numbers = {so.number for so in safety}
        assert numbers == {10, 12, 14}


class TestStandingOrderRendering:
    """Test rendering for agent context injection."""

    def test_single_order_render(self) -> None:
        so1 = get_standing_order(1)
        rendered = so1.render()
        assert "SO 1: Identity Discipline [scope]" in rendered
        assert "one role" in rendered.lower()

    def test_full_render_has_header(self) -> None:
        rendered = render_standing_orders()
        assert "STANDING ORDERS (Non-Negotiable)" in rendered
        assert "SO 1:" in rendered
        assert "SO 15:" in rendered

    def test_render_all_15_present(self) -> None:
        rendered = render_standing_orders()
        for i in range(1, 16):
            assert f"SO {i}:" in rendered

    def test_render_custom_subset(self) -> None:
        orders = [get_standing_order(10), get_standing_order(12)]
        rendered = render_standing_orders(orders)
        assert "SO 10:" in rendered
        assert "SO 12:" in rendered
        assert "SO 1:" not in rendered
