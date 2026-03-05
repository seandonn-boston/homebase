"""MCP JSON-RPC 2.0 transport layer for the Fleet Brain.

Implements the Model Context Protocol (MCP) transport over stdio,
making the Brain discoverable and invokable by any MCP-compatible
client (Claude Code, Cline, Cursor, etc.).

Supports:
- JSON-RPC 2.0 message framing
- tools/list for tool discovery
- tools/call for tool invocation
- initialize / initialized lifecycle
- stdio transport (stdin/stdout)

Usage:
    python -m brain.mcp.transport
    # or pipe from an MCP client
"""

from __future__ import annotations

import json
import logging
import sys
from typing import Any

from .server import BrainServer

logger = logging.getLogger(__name__)

_MAX_MESSAGE_SIZE = 1_048_576  # 1MB

# ── Tool definitions ──────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "name": "brain_record",
        "description": "Record a new entry in the Brain. Requires write scope.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "project": {"type": "string", "description": "Project identifier"},
                "category": {"type": "string", "enum": ["decision", "outcome", "lesson", "context", "failure", "pattern"]},
                "title": {"type": "string", "description": "Brief title for the entry"},
                "content": {"type": "string", "description": "Full content of the entry"},
                "token": {"type": "string", "description": "API authentication token"},
                "metadata": {"type": "object", "description": "Optional metadata"},
                "source_agent": {"type": "string", "description": "Identity of the recording agent"},
                "source_session": {"type": "string", "description": "Session identifier"},
                "provenance": {"type": "string", "enum": ["human", "seed", "system", "agent", "monitor"]},
            },
            "required": ["project", "category", "title", "content", "token"],
        },
    },
    {
        "name": "brain_query",
        "description": "Semantic search across Brain entries. Requires read scope.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Natural language search query"},
                "token": {"type": "string", "description": "API authentication token"},
                "project": {"type": "string", "description": "Filter by project"},
                "category": {"type": "string", "description": "Filter by category"},
                "limit": {"type": "integer", "description": "Max results (default 10)"},
                "min_score": {"type": "number", "description": "Minimum relevance score (default 0.7)"},
            },
            "required": ["query", "token"],
        },
    },
    {
        "name": "brain_retrieve",
        "description": "Fetch a specific entry by ID with its link graph. Requires read scope.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Entry UUID"},
                "token": {"type": "string", "description": "API authentication token"},
                "depth": {"type": "integer", "description": "Link traversal depth (default 1)"},
            },
            "required": ["id", "token"],
        },
    },
    {
        "name": "brain_strengthen",
        "description": "Signal that a retrieved entry was useful (or not). Requires write scope.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Entry UUID"},
                "useful": {"type": "boolean", "description": "True if useful, False if not"},
                "token": {"type": "string", "description": "API authentication token"},
            },
            "required": ["id", "useful", "token"],
        },
    },
    {
        "name": "brain_supersede",
        "description": "Mark an entry as superseded by another. Requires admin scope.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "old_id": {"type": "string", "description": "Entry to supersede"},
                "new_id": {"type": "string", "description": "Replacement entry"},
                "token": {"type": "string", "description": "API authentication token"},
                "reason": {"type": "string", "description": "Why the entry is being superseded"},
            },
            "required": ["old_id", "new_id", "token"],
        },
    },
    {
        "name": "brain_status",
        "description": "Get Brain health and statistics. No authentication required.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "project": {"type": "string", "description": "Filter by project"},
            },
        },
    },
    {
        "name": "brain_audit",
        "description": "Query the audit trail. Requires read scope.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "entry_id": {"type": "string", "description": "Filter by entry ID"},
                "operation": {"type": "string", "description": "Filter by operation type"},
                "limit": {"type": "integer", "description": "Max results (default 100)"},
                "token": {"type": "string", "description": "API authentication token"},
            },
            "required": ["token"],
        },
    },
]


# ── MCP Transport ─────────────────────────────────────────────

class MCPTransport:
    """JSON-RPC 2.0 transport for MCP over stdio.

    Reads JSON-RPC messages from stdin, dispatches to BrainServer,
    and writes responses to stdout.
    """

    PROTOCOL_VERSION = "2024-11-05"
    SERVER_NAME = "fleet-brain"
    SERVER_VERSION = "5.0.0"

    def __init__(self, server: BrainServer) -> None:
        self._server = server
        self._initialized = False

    def handle_message(self, message: dict[str, Any]) -> dict[str, Any] | None:
        """Process a single JSON-RPC 2.0 message and return the response."""
        method = message.get("method", "")
        msg_id = message.get("id")
        params = message.get("params", {})

        if method == "initialize":
            return self._handle_initialize(msg_id, params)
        elif method == "notifications/initialized":
            self._initialized = True
            return None  # Notifications don't get responses
        elif method == "tools/list":
            return self._handle_tools_list(msg_id)
        elif method == "tools/call":
            return self._handle_tools_call(msg_id, params)
        elif method == "ping":
            return _result(msg_id, {})
        else:
            return _error(msg_id, -32601, f"Method not found: {method}")

    def _handle_initialize(self, msg_id: Any, params: dict) -> dict:
        return _result(msg_id, {
            "protocolVersion": self.PROTOCOL_VERSION,
            "capabilities": {
                "tools": {"listChanged": False},
            },
            "serverInfo": {
                "name": self.SERVER_NAME,
                "version": self.SERVER_VERSION,
            },
        })

    def _handle_tools_list(self, msg_id: Any) -> dict:
        return _result(msg_id, {"tools": TOOL_DEFINITIONS})

    def _handle_tools_call(self, msg_id: Any, params: dict) -> dict:
        tool_name = params.get("name", "")
        arguments = params.get("arguments", {})

        handler = getattr(self._server, tool_name, None)
        if handler is None:
            return _error(msg_id, -32602, f"Unknown tool: {tool_name}")

        try:
            result = handler(**arguments)
            return _result(msg_id, {
                "content": [{"type": "text", "text": json.dumps(result, default=str)}],
            })
        except Exception as e:
            return _result(msg_id, {
                "content": [{"type": "text", "text": json.dumps({"error": str(e)})}],
                "isError": True,
            })

    def run_stdio(self) -> None:
        """Run the MCP server on stdio transport.

        Reads newline-delimited JSON from stdin, writes responses to stdout.
        """
        logger.info("MCP transport started on stdio")
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                if len(line) > _MAX_MESSAGE_SIZE:
                    err = _error(None, -32600, f"Message exceeds maximum size of {_MAX_MESSAGE_SIZE} bytes")
                    sys.stdout.write(json.dumps(err) + "\n")
                    sys.stdout.flush()
                    continue
                message = json.loads(line)
                response = self.handle_message(message)
                if response is not None:
                    sys.stdout.write(json.dumps(response) + "\n")
                    sys.stdout.flush()
            except json.JSONDecodeError:
                err = _error(None, -32700, "Parse error")
                sys.stdout.write(json.dumps(err) + "\n")
                sys.stdout.flush()


# ── JSON-RPC helpers ──────────────────────────────────────────

def _result(msg_id: Any, result: Any) -> dict:
    return {"jsonrpc": "2.0", "id": msg_id, "result": result}


def _error(msg_id: Any, code: int, message: str) -> dict:
    return {"jsonrpc": "2.0", "id": msg_id, "error": {"code": code, "message": message}}
