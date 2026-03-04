"""Tests for the MCP JSON-RPC 2.0 transport layer.

Validates that the transport correctly handles MCP protocol messages:
initialize, tools/list, tools/call, and error cases.
"""

from __future__ import annotations

import json
import unittest

from ..core.embeddings import MockEmbeddingProvider
from ..core.store import BrainStore
from ..mcp.auth import Scope
from ..mcp.server import BrainServer
from ..mcp.transport import MCPTransport, TOOL_DEFINITIONS
from ..services.bootstrap import bootstrap


def _make_transport() -> MCPTransport:
    """Create a transport with an unauthenticated test server."""
    brain = bootstrap(
        api_keys={"test-key": ("tester", Scope.ADMIN)},
        strict_mode=False,
    )
    return MCPTransport(brain.server)


class TestMCPInitialize(unittest.TestCase):
    """Test MCP initialize lifecycle."""

    def test_initialize_returns_capabilities(self):
        t = _make_transport()
        resp = t.handle_message({
            "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}
        })
        self.assertEqual(resp["jsonrpc"], "2.0")
        self.assertEqual(resp["id"], 1)
        result = resp["result"]
        self.assertIn("protocolVersion", result)
        self.assertIn("capabilities", result)
        self.assertIn("tools", result["capabilities"])
        self.assertIn("serverInfo", result)
        self.assertEqual(result["serverInfo"]["name"], "fleet-brain")

    def test_initialized_notification_returns_none(self):
        t = _make_transport()
        resp = t.handle_message({
            "jsonrpc": "2.0", "method": "notifications/initialized"
        })
        self.assertIsNone(resp)


class TestMCPToolsList(unittest.TestCase):
    """Test tools/list discovery."""

    def test_tools_list_returns_all_tools(self):
        t = _make_transport()
        resp = t.handle_message({
            "jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}
        })
        tools = resp["result"]["tools"]
        self.assertEqual(len(tools), 7)
        names = {tool["name"] for tool in tools}
        self.assertIn("brain_record", names)
        self.assertIn("brain_query", names)
        self.assertIn("brain_retrieve", names)
        self.assertIn("brain_strengthen", names)
        self.assertIn("brain_supersede", names)
        self.assertIn("brain_status", names)
        self.assertIn("brain_audit", names)

    def test_tools_have_input_schemas(self):
        for tool in TOOL_DEFINITIONS:
            self.assertIn("inputSchema", tool, f"Tool {tool['name']} missing inputSchema")
            self.assertIn("type", tool["inputSchema"])


class TestMCPToolsCall(unittest.TestCase):
    """Test tools/call invocation."""

    def test_brain_status_via_tools_call(self):
        t = _make_transport()
        resp = t.handle_message({
            "jsonrpc": "2.0", "id": 3,
            "method": "tools/call",
            "params": {"name": "brain_status", "arguments": {}},
        })
        result = resp["result"]
        self.assertIn("content", result)
        content = json.loads(result["content"][0]["text"])
        self.assertEqual(content["total_entries"], 0)

    def test_brain_record_via_tools_call(self):
        t = _make_transport()
        resp = t.handle_message({
            "jsonrpc": "2.0", "id": 4,
            "method": "tools/call",
            "params": {
                "name": "brain_record",
                "arguments": {
                    "project": "test",
                    "category": "lesson",
                    "title": "MCP works",
                    "content": "Recorded via JSON-RPC",
                    "token": "test-key",
                },
            },
        })
        result = resp["result"]
        content = json.loads(result["content"][0]["text"])
        self.assertIn("id", content)

    def test_unknown_tool_returns_error(self):
        t = _make_transport()
        resp = t.handle_message({
            "jsonrpc": "2.0", "id": 5,
            "method": "tools/call",
            "params": {"name": "nonexistent_tool", "arguments": {}},
        })
        # Unknown tool returns a JSON-RPC error
        self.assertIn("error", resp)
        self.assertEqual(resp["error"]["code"], -32602)

    def test_tool_error_returns_isError(self):
        t = _make_transport()
        # brain_retrieve with nonexistent ID should produce error
        resp = t.handle_message({
            "jsonrpc": "2.0", "id": 6,
            "method": "tools/call",
            "params": {
                "name": "brain_retrieve",
                "arguments": {"id": "nonexistent", "token": "test-key"},
            },
        })
        result = resp["result"]
        self.assertTrue(result.get("isError"))

    def test_brain_audit_via_tools_call(self):
        t = _make_transport()
        # Record something first
        t.handle_message({
            "jsonrpc": "2.0", "id": 7,
            "method": "tools/call",
            "params": {
                "name": "brain_record",
                "arguments": {
                    "project": "test", "category": "lesson",
                    "title": "T", "content": "C", "token": "test-key",
                },
            },
        })
        # Now query audit
        resp = t.handle_message({
            "jsonrpc": "2.0", "id": 8,
            "method": "tools/call",
            "params": {
                "name": "brain_audit",
                "arguments": {"token": "test-key"},
            },
        })
        result = resp["result"]
        entries = json.loads(result["content"][0]["text"])
        self.assertGreater(len(entries), 0)


class TestMCPErrorHandling(unittest.TestCase):
    """Test JSON-RPC error handling."""

    def test_unknown_method(self):
        t = _make_transport()
        resp = t.handle_message({
            "jsonrpc": "2.0", "id": 10, "method": "unknown/method", "params": {}
        })
        self.assertIn("error", resp)
        self.assertEqual(resp["error"]["code"], -32601)

    def test_ping_returns_empty_result(self):
        t = _make_transport()
        resp = t.handle_message({
            "jsonrpc": "2.0", "id": 11, "method": "ping"
        })
        self.assertEqual(resp["result"], {})


if __name__ == "__main__":
    unittest.main()
