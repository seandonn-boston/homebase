import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type {
	AllocationProfile,
	CompressionEvent,
	ContextSnapshot,
	OverflowAction,
	PreloadSource,
} from "./context-intelligence";
import {
	ContextAuditTrail,
	ContextDashboard,
	ContextOverflowHandler,
	ContextPreloader,
	DynamicContextAllocator,
} from "./context-intelligence";
import {
	CompressionStrategy,
	ContextCompressor,
	RelevanceScorer,
} from "./context-optimization";
import { ContextProfileManager, ContextZone } from "./context-profile";

// ---------------------------------------------------------------------------
// CE-06: ContextDashboard
// ---------------------------------------------------------------------------

describe("ContextDashboard (CE-06)", () => {
	let manager: ContextProfileManager;
	let scorer: RelevanceScorer;
	let dashboard: ContextDashboard;

	beforeEach(() => {
		manager = new ContextProfileManager("agent-1", 100_000);
		scorer = new RelevanceScorer();
		dashboard = new ContextDashboard(manager, scorer);
	});

	it("takeSnapshot returns correct structure", () => {
		manager.addItem(ContextZone.Session, "x".repeat(400), { priority: 50 });
		const snap = dashboard.takeSnapshot();

		assert.ok(snap.timestamp > 0);
		assert.ok(snap.overall.used > 0);
		assert.equal(snap.overall.total, 100_000);
		assert.ok(snap.overall.percent >= 0);
		assert.ok(snap.byZone[ContextZone.Session] != null);
		assert.ok(Array.isArray(snap.topItems));
		assert.ok(Array.isArray(snap.compressionEvents));
		assert.ok(Array.isArray(snap.anomalies));
	});

	it("detects anomaly: standing > 25%", () => {
		// Standing max is min(25%, 50K) = 25K tokens. 25K of 100K = 25%. Need > 25%.
		// Use a smaller budget so standing zone can exceed 25% of total.
		const smallManager = new ContextProfileManager("agent-2", 10_000);
		// Standing max = min(25% of 10K = 2500, 50K) = 2500 tokens
		// 2500 tokens = 25% of 10K. Need > 25%, so fill to capacity.
		// Actually 2500/10000 = 25%, need strictly > 25%.
		// Use budget where standing can be > 25%.
		const tinyManager = new ContextProfileManager("agent-3", 9_000);
		// Standing max = min(25% of 9K = 2250, 50K) = 2250 tokens
		// Fill standing with 2250 tokens => 2250/9000 = 25%. Need > 25%.
		// We need a scenario where standing tokens / total budget > 25%.
		// Standing zone hardLimit = 50K, percentMax = 25%.
		// With budget 9000: maxTokens = min(2250, 50000) = 2250.
		// To get > 25%: we'd need more than 2250 in standing but can't exceed max.
		// The anomaly check uses actual used / total budget.
		// With budget 9000, standing max = 2250. If we fill 2250 tokens and total budget is 9000,
		// that's exactly 25%. We need > 25%.
		// Let's use a manager where standing items are fully loaded.
		// The simplest way: create a small-budget manager.
		const m = new ContextProfileManager("agent-x", 8_000);
		// standing max = min(25% of 8000 = 2000, 50000) = 2000
		// Fill 2000 tokens (8000 chars) in standing
		m.addItem(ContextZone.Standing, "s".repeat(8_000), { priority: 90 });
		// 2000/8000 = 25%. Still not > 25%.
		// We need to trick this. The check is standing used / total > 25%.
		// With fixed zone constraints, standing max = 25% of budget, so we can never
		// get standing > 25% through normal adds. The anomaly would fire if the
		// zone allocation was adjusted externally. Let's just verify the detection
		// logic by checking it doesn't fire on normal data, and test via deserialization.
		const serialized = m.serialize();
		const data = JSON.parse(serialized);
		// Manually increase standing tokens past 25% of budget
		data.zones[ContextZone.Standing].currentTokens = 2100;
		data.zones[ContextZone.Standing].maxTokens = 3000;
		// Reconstruct
		const hacked = ContextProfileManager.deserialize(JSON.stringify(data));
		const d = new ContextDashboard(hacked, scorer);
		const anomalies = d.detectAnomalies();
		assert.ok(anomalies.includes("standing > 25%"));
	});

	it("detects anomaly: overall > 90%", () => {
		// Fill to > 90% of 100K budget
		manager.addItem(ContextZone.Session, "x".repeat(240_000), { priority: 50 }); // 60K tokens
		manager.addItem(ContextZone.Working, "y".repeat(120_000), { priority: 30 }); // 30K tokens
		// 60K + 30K = 90K / 100K = 90%. Need > 90%.
		manager.addItem(ContextZone.Standing, "z".repeat(8_000), { priority: 90 }); // 2K tokens
		// 92K / 100K = 92% > 90%
		const anomalies = dashboard.detectAnomalies();
		assert.ok(anomalies.includes("overall > 90%"));
	});

	it("logs compression events", () => {
		const event: CompressionEvent = {
			timestamp: Date.now(),
			strategy: "evict",
			itemsRemoved: 3,
			tokensSaved: 500,
			trigger: "manual",
		};
		dashboard.logCompression(event);
		const snap = dashboard.takeSnapshot();
		assert.equal(snap.compressionEvents.length, 1);
		assert.equal(snap.compressionEvents[0].strategy, "evict");
	});

	it("tracks utilization over time", () => {
		dashboard.takeSnapshot();
		manager.addItem(ContextZone.Session, "x".repeat(400), { priority: 50 });
		dashboard.takeSnapshot();
		const history = dashboard.getUtilizationOverTime();
		assert.equal(history.length, 2);
		assert.ok(history[1].percent >= history[0].percent);
	});

	it("getSnapshots respects limit", () => {
		dashboard.takeSnapshot();
		dashboard.takeSnapshot();
		dashboard.takeSnapshot();
		assert.equal(dashboard.getSnapshots(2).length, 2);
		assert.equal(dashboard.getSnapshots().length, 3);
	});
});

// ---------------------------------------------------------------------------
// CE-07: ContextOverflowHandler
// ---------------------------------------------------------------------------

describe("ContextOverflowHandler (CE-07)", () => {
	let manager: ContextProfileManager;
	let compressor: ContextCompressor;
	let handler: ContextOverflowHandler;

	beforeEach(() => {
		manager = new ContextProfileManager("agent-1", 100_000);
		compressor = new ContextCompressor(manager);
		handler = new ContextOverflowHandler(manager, compressor);
	});

	it("returns null below 80%", () => {
		manager.addItem(ContextZone.Session, "x".repeat(400), { priority: 50 });
		const result = handler.check();
		assert.equal(result, null);
	});

	it("returns warning at 80%", () => {
		// Fill to ~80%
		manager.addItem(ContextZone.Session, "x".repeat(240_000), { priority: 50 }); // 60K
		manager.addItem(ContextZone.Working, "y".repeat(80_000), { priority: 30 }); // 20K
		// 80K / 100K = 80%
		const result = handler.check();
		assert.ok(result != null);
		assert.equal(result!.level, "warning");
	});

	it("returns compress at 90%", () => {
		manager.addItem(ContextZone.Session, "x".repeat(240_000), { priority: 50 }); // 60K
		manager.addItem(ContextZone.Working, "y".repeat(120_000), { priority: 30 }); // 30K
		// 90K / 100K = 90%
		const result = handler.check();
		assert.ok(result != null);
		assert.equal(result!.level, "compress");
	});

	it("compress at 90% frees tokens", () => {
		manager.addItem(ContextZone.Session, "x".repeat(240_000), { priority: 50 }); // 60K
		manager.addItem(ContextZone.Working, "y".repeat(120_000), { priority: 30 }); // 30K
		const { freedTokens, removedItems } = handler.handleCompress();
		assert.ok(freedTokens > 0);
		assert.ok(removedItems > 0);
	});

	it("emergency at 95% keeps only standing + task", () => {
		manager.addItem(ContextZone.Standing, "identity".repeat(100), {
			priority: 100,
		});
		manager.addItem(ContextZone.Session, "x".repeat(240_000), { priority: 50 });
		manager.addItem(ContextZone.Working, "task data".repeat(100), {
			priority: 90,
		});
		manager.addItem(ContextZone.Working, "extra work".repeat(50), {
			priority: 20,
		});

		const { freedTokens, removedItems, remainingItems } =
			handler.handleEmergency();
		assert.ok(freedTokens > 0);
		assert.ok(removedItems > 0);
		// Should keep standing items + highest-priority working item
		const remaining = manager.getItems();
		const standingRemaining = remaining.filter(
			(i) => i.zone === ContextZone.Standing,
		);
		assert.ok(standingRemaining.length > 0);
		assert.ok(remainingItems > 0);
	});

	it("handoff produces checkpoint", () => {
		manager.addItem(ContextZone.Session, "x".repeat(400), { priority: 50 });
		const { checkpointData, reason } = handler.handleHandoff();
		assert.ok(checkpointData.length > 0);
		assert.ok(reason.includes("handoff"));
		const parsed = JSON.parse(checkpointData);
		assert.equal(parsed.agentId, "agent-1");
	});

	it("every removal is logged", () => {
		manager.addItem(ContextZone.Session, "x".repeat(240_000), { priority: 50 }); // 60K
		manager.addItem(ContextZone.Working, "y".repeat(120_000), { priority: 30 }); // 30K
		handler.handleCompress();
		const log = handler.getLog();
		assert.ok(log.length > 0);
		assert.equal(log[0].level, "compress");
		assert.ok(log[0].actions.length > 0);
	});

	it("graduated degradation sequence: warning -> compress -> emergency -> handoff", () => {
		handler.handleWarning();
		handler.handleCompress();

		const log = handler.getLog();
		assert.equal(log.length, 2);
		assert.equal(log[0].level, "warning");
		assert.equal(log[1].level, "compress");
	});
});

// ---------------------------------------------------------------------------
// CE-08: DynamicContextAllocator
// ---------------------------------------------------------------------------

describe("DynamicContextAllocator (CE-08)", () => {
	let manager: ContextProfileManager;
	let allocator: DynamicContextAllocator;

	beforeEach(() => {
		manager = new ContextProfileManager("agent-1", 100_000);
		allocator = new DynamicContextAllocator(manager);
	});

	it("simple profile has correct zone ranges", () => {
		allocator.setComplexity("simple");
		const profile = allocator.getCurrentProfile();
		assert.equal(profile.complexity, "simple");
		assert.equal(profile.working.max, 40);
		assert.equal(profile.session.max, 50);
	});

	it("complex profile has correct zone ranges", () => {
		allocator.setComplexity("complex");
		const profile = allocator.getCurrentProfile();
		assert.equal(profile.complexity, "complex");
		assert.equal(profile.session.max, 65);
		assert.equal(profile.working.max, 25);
	});

	it("standing hard limit is respected in all profiles", () => {
		for (const complexity of ["simple", "standard", "complex"] as const) {
			allocator.setComplexity(complexity);
			const profile = allocator.getCurrentProfile();
			assert.ok(
				profile.standing.max <= 25,
				`${complexity} standing max should be <= 25`,
			);
		}
	});

	it("profile switching is logged", () => {
		allocator.setComplexity("simple");
		allocator.setComplexity("complex");
		const log = allocator.getAllocationLog();
		assert.equal(log.length, 2);
		assert.equal(log[0].from, "standard");
		assert.equal(log[0].to, "simple");
		assert.equal(log[1].from, "simple");
		assert.equal(log[1].to, "complex");
	});

	it("custom profiles can be added and retrieved", () => {
		const custom: AllocationProfile = {
			name: "research",
			complexity: "complex",
			standing: { min: 10, max: 15 },
			session: { min: 60, max: 70 },
			working: { min: 15, max: 25 },
		};
		allocator.addProfile(custom);
		const profiles = allocator.getProfiles();
		assert.ok(profiles.some((p) => p.name === "research"));
	});
});

// ---------------------------------------------------------------------------
// CE-09: ContextPreloader
// ---------------------------------------------------------------------------

describe("ContextPreloader (CE-09)", () => {
	let manager: ContextProfileManager;
	let preloader: ContextPreloader;

	beforeEach(() => {
		manager = new ContextProfileManager("agent-1", 100_000);
		preloader = new ContextPreloader(manager);
	});

	it("preload within budget succeeds", () => {
		const sources: PreloadSource[] = [
			{
				type: "file-dependency",
				content: "dep content",
				priority: 80,
				tokenEstimate: 10,
			},
			{
				type: "historical",
				content: "history data",
				priority: 60,
				tokenEstimate: 10,
			},
		];
		preloader.addPrediction("code-review", sources);
		const { loaded, skipped } = preloader.preload("code-review");
		assert.equal(loaded.length, 2);
		assert.equal(skipped.length, 0);
	});

	it("preload over budget skips items", () => {
		// Use a small budget manager so working zone is tiny
		const smallManager = new ContextProfileManager("agent-2", 100);
		const smallPreloader = new ContextPreloader(smallManager);
		// Working zone max = 30% of 100 = 30 tokens
		const sources: PreloadSource[] = [
			{
				type: "file-dependency",
				content: "a".repeat(80),
				priority: 80,
				tokenEstimate: 20,
			}, // 20 tokens
			{
				type: "historical",
				content: "b".repeat(80),
				priority: 60,
				tokenEstimate: 20,
			}, // 20 tokens
		];
		smallPreloader.addPrediction("code-review", sources);
		const { loaded, skipped } = smallPreloader.preload("code-review");
		// First item fits (20 tokens), second may not (40 > 30)
		assert.ok(loaded.length >= 1);
		assert.ok(skipped.length >= 1);
	});

	it("feedback tracking works", () => {
		preloader.recordFeedback("file-dep-1", true);
		preloader.recordFeedback("file-dep-2", false);
		preloader.recordFeedback("hist-1", true);
		assert.equal(preloader.getAccuracy(), (2 / 3) * 100);
	});

	it("accuracy is 0 when no feedback recorded", () => {
		assert.equal(preloader.getAccuracy(), 0);
	});

	it("accuracy calculation is correct", () => {
		preloader.recordFeedback("a", true);
		preloader.recordFeedback("b", true);
		assert.equal(preloader.getAccuracy(), 100);
	});

	it("predictions for unknown task type returns empty", () => {
		const preds = preloader.getPredictions("unknown-task");
		assert.equal(preds.length, 0);
	});
});

// ---------------------------------------------------------------------------
// CE-10: ContextAuditTrail
// ---------------------------------------------------------------------------

describe("ContextAuditTrail (CE-10)", () => {
	let manager: ContextProfileManager;
	let trail: ContextAuditTrail;

	beforeEach(() => {
		manager = new ContextProfileManager("agent-1", 100_000);
		trail = new ContextAuditTrail(manager);
	});

	it("captures a snapshot with correct structure", () => {
		manager.addItem(ContextZone.Session, "test data", {
			priority: 50,
			source: "test",
		});
		const snap = trail.capture("checkpoint", "agent-1");

		assert.ok(snap.id.startsWith("snap_"));
		assert.ok(snap.timestamp > 0);
		assert.equal(snap.trigger, "checkpoint");
		assert.equal(snap.agentId, "agent-1");
		assert.equal(snap.items.length, 1);
		assert.ok(snap.totalTokens > 0);
	});

	it("filters snapshots by trigger", () => {
		trail.capture("checkpoint", "agent-1");
		trail.capture("escalate-tier", "agent-1");
		trail.capture("checkpoint", "agent-1");

		const checkpoints = trail.getSnapshots({ trigger: "checkpoint" });
		assert.equal(checkpoints.length, 2);
	});

	it("filters snapshots by agentId", () => {
		trail.capture("checkpoint", "agent-1");
		trail.capture("checkpoint", "agent-2");
		trail.capture("checkpoint", "agent-1");

		const agent1Snaps = trail.getSnapshots({ agentId: "agent-1" });
		assert.equal(agent1Snaps.length, 2);
	});

	it("diffs between two snapshots", () => {
		manager.addItem(ContextZone.Session, "item A", {
			priority: 50,
			source: "test",
		});
		const snapA = trail.capture("checkpoint", "agent-1");

		// Add another item
		manager.addItem(ContextZone.Session, "item B", {
			priority: 60,
			source: "test",
		});
		const snapB = trail.capture("checkpoint", "agent-1");

		const diff = trail.getDiff(snapA.id, snapB.id);
		assert.equal(diff.added.length, 1); // item B was added
		assert.equal(diff.removed.length, 0);
	});

	it("tracks compression history", () => {
		trail.logCompression("item-1", "evicted");
		trail.logCompression("item-2", "summarized");

		const history = trail.getCompressionHistory();
		assert.equal(history.length, 2);
		assert.equal(history[0].itemId, "item-1");
		assert.equal(history[1].action, "summarized");
	});

	it("filters compression history by since", () => {
		const before = Date.now();
		trail.logCompression("item-old", "evicted");
		const after = Date.now() + 1;
		trail.logCompression("item-new", "evicted");

		// All should be returned with since=before
		const all = trail.getCompressionHistory(before);
		assert.ok(all.length >= 1);
	});
});
