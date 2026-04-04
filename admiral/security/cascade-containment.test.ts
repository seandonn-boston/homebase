import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { CascadeContainment } from "./cascade-containment";

describe("CascadeContainment", () => {
	let cc: CascadeContainment;

	beforeEach(() => {
		cc = new CascadeContainment();

		// Set up usage records
		cc.recordUsage("agent-1", "mcp-brain");
		cc.recordUsage("agent-2", "mcp-brain");
		cc.recordUsage("agent-3", "mcp-fleet");
		cc.recordUsage("agent-1", "mcp-fleet");

		// Set up entry provenance
		cc.recordEntryProvenance({
			entryId: "entry-a",
			writtenBy: "agent-1",
			sourceServer: "mcp-brain",
			readBy: ["agent-3", "agent-4"],
		});
		cc.recordEntryProvenance({
			entryId: "entry-b",
			writtenBy: "agent-2",
			sourceServer: "mcp-brain",
			readBy: [],
		});
		cc.recordEntryProvenance({
			entryId: "entry-c",
			writtenBy: "agent-3",
			readBy: ["agent-1"],
		});

		// Set up delegation
		cc.recordDelegation("agent-1", "agent-5");
	});

	describe("triggerBreaker", () => {
		it("quarantines entries from affected agents", () => {
			cc.triggerBreaker({
				serverId: "mcp-brain",
				detectedAt: new Date().toISOString(),
				reason: "Malicious tool response detected",
				severity: "critical",
			});
			assert.ok(cc.isQuarantined("entry-a"));
			assert.ok(cc.isQuarantined("entry-b"));
			assert.ok(!cc.isQuarantined("entry-c")); // agent-3 didn't use mcp-brain for this entry
		});

		it("suspends A2A connections for affected agents", () => {
			cc.triggerBreaker({
				serverId: "mcp-brain",
				detectedAt: new Date().toISOString(),
				reason: "Compromise detected",
				severity: "critical",
			});
			assert.ok(cc.isSuspended("agent-1"));
			assert.ok(cc.isSuspended("agent-2"));
			assert.ok(!cc.isSuspended("agent-3")); // agent-3 used mcp-fleet, not mcp-brain
		});

		it("returns contamination graph", () => {
			const graph = cc.triggerBreaker({
				serverId: "mcp-brain",
				detectedAt: new Date().toISOString(),
				reason: "Compromise",
				severity: "critical",
			});
			assert.equal(graph.rootServer, "mcp-brain");
			assert.ok(graph.totalAffectedAgents > 0);
			assert.ok(graph.totalAffectedEntries > 0);
			assert.ok(graph.nodes.length > 0);
			assert.ok(graph.edges.length > 0);
		});

		it("includes server node at depth 0", () => {
			const graph = cc.triggerBreaker({
				serverId: "mcp-brain",
				detectedAt: new Date().toISOString(),
				reason: "Compromise",
				severity: "critical",
			});
			const serverNode = graph.nodes.find((n) => n.type === "server");
			assert.ok(serverNode);
			assert.equal(serverNode.depth, 0);
		});

		it("includes directly affected agents at depth 1", () => {
			const graph = cc.triggerBreaker({
				serverId: "mcp-brain",
				detectedAt: new Date().toISOString(),
				reason: "Compromise",
				severity: "critical",
			});
			const agentNodes = graph.nodes.filter((n) => n.type === "agent" && n.depth === 1);
			assert.ok(agentNodes.length >= 2); // agent-1 and agent-2
		});

		it("includes contaminated entries at depth 2", () => {
			const graph = cc.triggerBreaker({
				serverId: "mcp-brain",
				detectedAt: new Date().toISOString(),
				reason: "Compromise",
				severity: "critical",
			});
			const entryNodes = graph.nodes.filter((n) => n.type === "entry");
			assert.ok(entryNodes.length >= 2);
		});

		it("includes secondary agents (readers) at depth 3", () => {
			const graph = cc.triggerBreaker({
				serverId: "mcp-brain",
				detectedAt: new Date().toISOString(),
				reason: "Compromise",
				severity: "critical",
			});
			// agent-3 and agent-4 read entry-a (written by agent-1 who used mcp-brain)
			const secondaryAgents = graph.nodes.filter(
				(n) => n.type === "agent" && n.depth === 3,
			);
			assert.ok(secondaryAgents.length > 0);
		});

		it("includes delegation chain contamination", () => {
			const graph = cc.triggerBreaker({
				serverId: "mcp-brain",
				detectedAt: new Date().toISOString(),
				reason: "Compromise",
				severity: "critical",
			});
			// agent-5 was delegated to by agent-1 (who used mcp-brain)
			const delegatedNode = graph.nodes.find((n) => n.id === "agent-5");
			assert.ok(delegatedNode);
			const delegationEdge = graph.edges.find(
				(e) => e.to === "agent-5" && e.relationship === "delegated_to",
			);
			assert.ok(delegationEdge);
		});
	});

	describe("isCompromised", () => {
		it("returns false before trigger", () => {
			assert.equal(cc.isCompromised("mcp-brain"), false);
		});

		it("returns true after trigger", () => {
			cc.triggerBreaker({
				serverId: "mcp-brain",
				detectedAt: new Date().toISOString(),
				reason: "Test",
				severity: "high",
			});
			assert.equal(cc.isCompromised("mcp-brain"), true);
		});
	});

	describe("restoration", () => {
		it("restores quarantined entry", () => {
			cc.triggerBreaker({
				serverId: "mcp-brain",
				detectedAt: new Date().toISOString(),
				reason: "Test",
				severity: "high",
			});
			assert.ok(cc.isQuarantined("entry-a"));
			cc.restoreEntry("entry-a");
			assert.ok(!cc.isQuarantined("entry-a"));
		});

		it("restores suspended agent", () => {
			cc.triggerBreaker({
				serverId: "mcp-brain",
				detectedAt: new Date().toISOString(),
				reason: "Test",
				severity: "high",
			});
			assert.ok(cc.isSuspended("agent-1"));
			cc.restoreAgent("agent-1");
			assert.ok(!cc.isSuspended("agent-1"));
		});
	});

	describe("getters", () => {
		it("returns quarantined entries", () => {
			cc.triggerBreaker({
				serverId: "mcp-brain",
				detectedAt: new Date().toISOString(),
				reason: "Test",
				severity: "high",
			});
			const entries = cc.getQuarantinedEntries();
			assert.ok(entries.length >= 2);
		});

		it("returns suspended agents", () => {
			cc.triggerBreaker({
				serverId: "mcp-brain",
				detectedAt: new Date().toISOString(),
				reason: "Test",
				severity: "high",
			});
			const agents = cc.getSuspendedAgents();
			assert.ok(agents.length >= 2);
		});
	});
});
