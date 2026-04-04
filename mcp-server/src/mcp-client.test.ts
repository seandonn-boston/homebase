/**
 * Tests for McpClient (M-08).
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { McpClient } from "./mcp-client.js";

describe("McpClient", () => {
	it("starts disconnected", () => {
		const client = new McpClient({ transport: "http" });
		assert.equal(client.isConnected(), false);
	});

	it("throws when calling listTools while disconnected", async () => {
		const client = new McpClient({ transport: "http" });
		await assert.rejects(
			() => client.listTools(),
			(err: any) => err.message.includes("not connected"),
		);
	});

	it("throws when calling callTool while disconnected", async () => {
		const client = new McpClient({ transport: "http" });
		await assert.rejects(
			() => client.callTool("test", {}),
			(err: any) => err.message.includes("not connected"),
		);
	});

	it("disconnect sets connected to false", async () => {
		const client = new McpClient({ transport: "http" });
		// Manually set connected for testing without a server
		(client as any).connected = true;
		assert.equal(client.isConnected(), true);
		await client.disconnect();
		assert.equal(client.isConnected(), false);
	});

	it("callTool throws for stdio transport", async () => {
		const client = new McpClient({ transport: "stdio" });
		(client as any).connected = true;
		await assert.rejects(
			() => client.callTool("test", {}),
			(err: any) => err.message.includes("stdio transport not implemented"),
		);
	});

	it("listTools returns empty array for stdio transport", async () => {
		const client = new McpClient({ transport: "stdio" });
		(client as any).connected = true;
		const tools = await client.listTools();
		assert.deepEqual(tools, []);
	});
});
