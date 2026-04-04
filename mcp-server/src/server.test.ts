/**
 * Tests for the Admiral MCP Server core modules.
 *
 * Uses Node.js built-in test runner (node --test).
 */

import * as assert from "node:assert/strict";
import * as http from "node:http";
import { after, before, describe, it } from "node:test";

import {
	formatError,
	formatResponse,
	INVALID_REQUEST,
	METHOD_NOT_FOUND,
	PARSE_ERROR,
	parseRequest,
} from "./protocol.js";
import { McpServer } from "./server.js";
import type { ToolContext, ToolDefinition } from "./tool-registry.js";
import { ToolRegistry } from "./tool-registry.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(overrides: Partial<ToolContext> = {}): ToolContext {
	return {
		agentId: "test-agent",
		role: "admiral",
		sessionId: "test-session",
		requestId: "1",
		...overrides,
	};
}

function sampleTool(
	name = "test.echo",
	category: ToolDefinition["category"] = "system",
): ToolDefinition {
	return {
		name,
		description: "Echoes params back",
		inputSchema: { type: "object", properties: { msg: { type: "string" } } },
		category,
	};
}

// ---------------------------------------------------------------------------
// 1. Tool registration and discovery
// ---------------------------------------------------------------------------

describe("ToolRegistry", () => {
	it("registers and lists tools", () => {
		const reg = new ToolRegistry();
		reg.register(sampleTool("a"), async (p) => p);
		reg.register(sampleTool("b"), async (p) => p);

		const tools = reg.listTools();
		assert.equal(tools.length, 2);
		assert.ok(tools.some((t) => t.name === "a"));
		assert.ok(tools.some((t) => t.name === "b"));
	});

	it("throws on duplicate registration", () => {
		const reg = new ToolRegistry();
		reg.register(sampleTool("dup"), async () => null);
		assert.throws(
			() => reg.register(sampleTool("dup"), async () => null),
			/already registered/,
		);
	});

	it("unregisters a tool", () => {
		const reg = new ToolRegistry();
		reg.register(sampleTool("x"), async () => null);
		reg.unregister("x");
		assert.equal(reg.listTools().length, 0);
		assert.equal(reg.getDefinition("x"), undefined);
	});

	it("getDefinition returns the definition", () => {
		const reg = new ToolRegistry();
		const def = sampleTool("gd");
		reg.register(def, async () => null);
		assert.deepEqual(reg.getDefinition("gd"), def);
	});
});

// ---------------------------------------------------------------------------
// 2. JSON-RPC request parsing (valid and invalid)
// ---------------------------------------------------------------------------

describe("parseRequest", () => {
	it("parses a valid request", () => {
		const raw = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" });
		const req = parseRequest(raw);
		assert.equal(req.jsonrpc, "2.0");
		assert.equal(req.id, 1);
		assert.equal(req.method, "tools/list");
	});

	it("parses a request with params", () => {
		const raw = JSON.stringify({
			jsonrpc: "2.0",
			id: "abc",
			method: "tools/call",
			params: { name: "foo" },
		});
		const req = parseRequest(raw);
		assert.equal(req.id, "abc");
		assert.deepEqual(req.params, { name: "foo" });
	});

	it("rejects invalid JSON", () => {
		try {
			parseRequest("not json");
			assert.fail("Should have thrown");
		} catch (err: any) {
			assert.equal(err.code, PARSE_ERROR);
		}
	});

	it("rejects missing jsonrpc field", () => {
		try {
			parseRequest(JSON.stringify({ id: 1, method: "x" }));
			assert.fail("Should have thrown");
		} catch (err: any) {
			assert.equal(err.code, INVALID_REQUEST);
		}
	});

	it("rejects missing id", () => {
		try {
			parseRequest(JSON.stringify({ jsonrpc: "2.0", method: "x" }));
			assert.fail("Should have thrown");
		} catch (err: any) {
			assert.equal(err.code, INVALID_REQUEST);
		}
	});

	it("rejects empty method", () => {
		try {
			parseRequest(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "" }));
			assert.fail("Should have thrown");
		} catch (err: any) {
			assert.equal(err.code, INVALID_REQUEST);
		}
	});
});

// ---------------------------------------------------------------------------
// 3. Tool invocation via registry
// ---------------------------------------------------------------------------

describe("Tool invocation", () => {
	it("invokes a handler and returns result", async () => {
		const reg = new ToolRegistry();
		reg.register(sampleTool("echo"), async (params) => ({ echo: params }));
		const result = await reg.invoke("echo", { msg: "hello" }, makeContext());
		assert.deepEqual(result, { echo: { msg: "hello" } });
	});

	it("wraps handler errors in INTERNAL_ERROR", async () => {
		const reg = new ToolRegistry();
		reg.register(sampleTool("boom"), async () => {
			throw new Error("kaboom");
		});
		try {
			await reg.invoke("boom", {}, makeContext());
			assert.fail("Should have thrown");
		} catch (err: any) {
			assert.equal(err.code, -32603);
			assert.ok(err.message.includes("kaboom"));
		}
	});
});

// ---------------------------------------------------------------------------
// 4. Error responses for unknown methods
// ---------------------------------------------------------------------------

describe("Unknown tool invocation", () => {
	it("throws METHOD_NOT_FOUND for unregistered tool", async () => {
		const reg = new ToolRegistry();
		try {
			await reg.invoke("nonexistent", {}, makeContext());
			assert.fail("Should have thrown");
		} catch (err: any) {
			assert.equal(err.code, METHOD_NOT_FOUND);
		}
	});
});

// ---------------------------------------------------------------------------
// 5. Health endpoint returns valid JSON
// ---------------------------------------------------------------------------

describe("HTTP health endpoint", () => {
	let server: McpServer;
	const PORT = 31999; // Use a high port to avoid conflicts

	before(async () => {
		server = new McpServer({ port: PORT, transport: "http" });
		await server.start("http");
	});

	after(async () => {
		await server.stop();
	});

	it("returns status ok", async () => {
		const data = await httpGet(`http://127.0.0.1:${PORT}/health`);
		const json = JSON.parse(data);
		assert.equal(json.status, "ok");
		assert.equal(typeof json.uptime, "number");
		assert.equal(typeof json.timestamp, "string");
		assert.equal(json.transport, "http");
	});

	it("GET /tools returns tool list", async () => {
		const data = await httpGet(`http://127.0.0.1:${PORT}/tools`);
		const json = JSON.parse(data);
		assert.ok(Array.isArray(json.tools));
	});
});

// ---------------------------------------------------------------------------
// 6. RBAC role filtering on tool list
// ---------------------------------------------------------------------------

describe("RBAC filtering", () => {
	it("filters tools by role", () => {
		const reg = new ToolRegistry();
		reg.register(
			{ ...sampleTool("pub"), requiredRole: undefined },
			async () => null,
		);
		reg.register(
			{ ...sampleTool("admin-only"), requiredRole: "admiral" },
			async () => null,
		);
		reg.register(
			{ ...sampleTool("agent-level"), requiredRole: "agent" },
			async () => null,
		);

		// Observer should see pub + agent-level (observer >= nothing, but observer < agent)
		const observerTools = reg.listTools("observer");
		assert.ok(observerTools.some((t) => t.name === "pub"));
		assert.ok(!observerTools.some((t) => t.name === "admin-only"));
		assert.ok(!observerTools.some((t) => t.name === "agent-level"));

		// Agent should see pub + agent-level but not admin-only
		const agentTools = reg.listTools("agent");
		assert.ok(agentTools.some((t) => t.name === "pub"));
		assert.ok(agentTools.some((t) => t.name === "agent-level"));
		assert.ok(!agentTools.some((t) => t.name === "admin-only"));

		// Admiral sees everything
		const admiralTools = reg.listTools("admiral");
		assert.equal(admiralTools.length, 3);
	});

	it("blocks invocation when role is insufficient", async () => {
		const reg = new ToolRegistry();
		reg.register(
			{ ...sampleTool("secret"), requiredRole: "admiral" },
			async () => "classified",
		);

		try {
			await reg.invoke("secret", {}, makeContext({ role: "observer" }));
			assert.fail("Should have thrown");
		} catch (err: any) {
			assert.ok(err.message.includes("Insufficient role"));
		}
	});
});

// ---------------------------------------------------------------------------
// Utility: simple HTTP GET using node:http
// ---------------------------------------------------------------------------

function httpGet(url: string): Promise<string> {
	return new Promise((resolve, reject) => {
		http
			.get(url, (res) => {
				const chunks: Buffer[] = [];
				res.on("data", (chunk: Buffer) => chunks.push(chunk));
				res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
				res.on("error", reject);
			})
			.on("error", reject);
	});
}

// ---------------------------------------------------------------------------
// formatResponse / formatError
// ---------------------------------------------------------------------------

describe("formatResponse / formatError", () => {
	it("formatResponse builds a valid response", () => {
		const resp = formatResponse(42, { ok: true });
		assert.equal(resp.jsonrpc, "2.0");
		assert.equal(resp.id, 42);
		assert.deepEqual(resp.result, { ok: true });
		assert.equal(resp.error, undefined);
	});

	it("formatError builds a valid error response", () => {
		const resp = formatError(7, -32600, "bad request", { detail: "x" });
		assert.equal(resp.jsonrpc, "2.0");
		assert.equal(resp.id, 7);
		assert.equal(resp.result, undefined);
		assert.equal(resp.error?.code, -32600);
		assert.equal(resp.error?.message, "bad request");
		assert.deepEqual(resp.error?.data, { detail: "x" });
	});
});
