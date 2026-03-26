import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { ContextProfileManager, ContextZone } from "./context-profile";

describe("ContextProfileManager", () => {
	// Budget of 100_000 tokens gives us:
	//   Standing: max 25_000 (25% of 100K, under 50K hard limit)
	//   Session:  max 65_000 (65%)
	//   Working:  max 30_000 (30%)
	let manager: ContextProfileManager;

	beforeEach(() => {
		manager = new ContextProfileManager("agent-1", 100_000);
	});

	describe("zone allocation math", () => {
		it("computes correct max tokens for each zone", () => {
			const util = manager.getZoneUtilization();
			assert.equal(util[ContextZone.Standing].max, 25_000);
			assert.equal(util[ContextZone.Session].max, 65_000);
			assert.equal(util[ContextZone.Working].max, 30_000);
		});

		it("all zones start at 0% utilization", () => {
			const util = manager.getZoneUtilization();
			assert.equal(util[ContextZone.Standing].used, 0);
			assert.equal(util[ContextZone.Session].used, 0);
			assert.equal(util[ContextZone.Working].used, 0);
		});
	});

	describe("standing zone hard limit", () => {
		it("enforces 50K hard limit even with large budget", () => {
			const bigManager = new ContextProfileManager("agent-2", 1_000_000);
			const util = bigManager.getZoneUtilization();
			// 25% of 1M = 250K, but hard limit is 50K
			assert.equal(util[ContextZone.Standing].max, 50_000);
		});
	});

	describe("addItem", () => {
		it("adds item within budget", () => {
			const item = manager.addItem(ContextZone.Working, "hello world", {
				priority: 80,
				source: "test",
			});
			assert.ok(item.id.startsWith("ctx_"));
			assert.equal(item.zone, ContextZone.Working);
			assert.equal(item.priority, 80);
			assert.ok(item.tokenCount > 0);
		});

		it("updates zone utilization after adding", () => {
			manager.addItem(ContextZone.Working, "test content");
			const util = manager.getZoneUtilization();
			assert.ok(util[ContextZone.Working].used > 0);
			assert.ok(util[ContextZone.Working].percent > 0);
		});

		it("rejects item that would exceed zone budget", () => {
			// Standing zone max is 25K tokens. 25K * 4 chars/token = 100K chars
			const hugeContent = "x".repeat(100_001);
			assert.throws(
				() => manager.addItem(ContextZone.Standing, hugeContent),
				/would exceed budget/,
			);
		});

		it("defaults priority to 50 and compressible to true", () => {
			const item = manager.addItem(ContextZone.Session, "data");
			assert.equal(item.priority, 50);
			assert.equal(item.compressible, true);
		});

		it("standing zone items are NEVER compressible regardless of option", () => {
			const item = manager.addItem(ContextZone.Standing, "identity", {
				compressible: true,
			});
			assert.equal(item.compressible, false);
		});
	});

	describe("removeItem", () => {
		it("removes existing item and updates utilization", () => {
			const item = manager.addItem(ContextZone.Working, "temp data");
			const usedBefore = manager.getZoneUtilization()[ContextZone.Working].used;
			assert.ok(usedBefore > 0);

			const removed = manager.removeItem(item.id);
			assert.equal(removed, true);
			assert.equal(manager.getZoneUtilization()[ContextZone.Working].used, 0);
		});

		it("returns false for non-existent item", () => {
			assert.equal(manager.removeItem("nonexistent"), false);
		});
	});

	describe("overall utilization", () => {
		it("sums usage across all zones", () => {
			manager.addItem(ContextZone.Standing, "identity");
			manager.addItem(ContextZone.Session, "project context");
			manager.addItem(ContextZone.Working, "current task");

			const overall = manager.getOverallUtilization();
			assert.ok(overall.used > 0);
			assert.equal(overall.total, 100_000);
			assert.ok(overall.percent > 0);
		});

		it("isOverBudget returns false when within limits", () => {
			manager.addItem(ContextZone.Working, "small");
			assert.equal(manager.isOverBudget(), false);
		});
	});

	describe("sacrifice order", () => {
		it("never includes standing zone items", () => {
			manager.addItem(ContextZone.Standing, "identity", { priority: 1 });
			manager.addItem(ContextZone.Working, "work", { priority: 50 });
			manager.addItem(ContextZone.Session, "session", { priority: 50 });

			const order = manager.getSacrificeOrder();
			assert.ok(order.every((i) => i.zone !== ContextZone.Standing));
		});

		it("orders working zone before session zone", () => {
			manager.addItem(ContextZone.Session, "session data", { priority: 10 });
			manager.addItem(ContextZone.Working, "working data", { priority: 10 });

			const order = manager.getSacrificeOrder();
			assert.equal(order[0].zone, ContextZone.Working);
			assert.equal(order[1].zone, ContextZone.Session);
		});

		it("orders compressible before non-compressible within same zone", () => {
			manager.addItem(ContextZone.Working, "non-comp", {
				priority: 10,
				compressible: false,
			});
			manager.addItem(ContextZone.Working, "comp", {
				priority: 10,
				compressible: true,
			});

			const order = manager.getSacrificeOrder();
			assert.equal(order[0].compressible, true);
			assert.equal(order[1].compressible, false);
		});

		it("orders lowest priority first within same zone and compressibility", () => {
			manager.addItem(ContextZone.Working, "high", { priority: 90 });
			manager.addItem(ContextZone.Working, "low", { priority: 10 });

			const order = manager.getSacrificeOrder();
			assert.equal(order[0].priority, 10);
			assert.equal(order[1].priority, 90);
		});

		it("orders oldest first on tie", () => {
			const item1 = manager.addItem(ContextZone.Working, "first", {
				priority: 50,
			});
			const item2 = manager.addItem(ContextZone.Working, "second", {
				priority: 50,
			});

			const order = manager.getSacrificeOrder();
			assert.equal(order[0].id, item1.id);
			assert.equal(order[1].id, item2.id);
		});
	});

	describe("evictToFit", () => {
		it("evicts items until under target", () => {
			// Add several items to working zone
			for (let i = 0; i < 10; i++) {
				manager.addItem(ContextZone.Working, "x".repeat(400), {
					priority: i * 10,
				});
			}

			const usedBefore = manager.getOverallUtilization().used;
			assert.ok(usedBefore > 0);

			const evicted = manager.evictToFit(0);
			assert.ok(evicted.length > 0);
			assert.equal(manager.getOverallUtilization().used, 0);
		});

		it("evicts nothing if already under target", () => {
			manager.addItem(ContextZone.Working, "small");
			const evicted = manager.evictToFit(100_000);
			assert.equal(evicted.length, 0);
		});

		it("does not evict standing zone items", () => {
			manager.addItem(ContextZone.Standing, "identity", { priority: 1 });
			manager.addItem(ContextZone.Working, "work", { priority: 50 });

			const evicted = manager.evictToFit(0);
			// Only the working item should be evicted
			assert.ok(evicted.every((i) => i.zone !== ContextZone.Standing));
			// Standing item still exists
			assert.equal(manager.getItems(ContextZone.Standing).length, 1);
		});
	});

	describe("getItems", () => {
		it("returns all items without zone filter", () => {
			manager.addItem(ContextZone.Standing, "a");
			manager.addItem(ContextZone.Session, "b");
			manager.addItem(ContextZone.Working, "c");
			assert.equal(manager.getItems().length, 3);
		});

		it("returns only items for specified zone", () => {
			manager.addItem(ContextZone.Standing, "a");
			manager.addItem(ContextZone.Session, "b");
			manager.addItem(ContextZone.Working, "c");
			assert.equal(manager.getItems(ContextZone.Session).length, 1);
			assert.equal(
				manager.getItems(ContextZone.Session)[0].zone,
				ContextZone.Session,
			);
		});
	});

	describe("serialization", () => {
		it("round-trips through serialize/deserialize", () => {
			manager.addItem(ContextZone.Standing, "identity data", {
				priority: 100,
				source: "init",
			});
			manager.addItem(ContextZone.Session, "project context", {
				priority: 70,
			});
			manager.addItem(ContextZone.Working, "current task", {
				priority: 60,
			});

			const json = manager.serialize();
			const restored = ContextProfileManager.deserialize(json);

			const originalUtil = manager.getOverallUtilization();
			const restoredUtil = restored.getOverallUtilization();
			assert.equal(restoredUtil.used, originalUtil.used);
			assert.equal(restoredUtil.total, originalUtil.total);

			assert.equal(restored.getItems().length, 3);
			assert.equal(
				restored.getItems(ContextZone.Standing)[0].compressible,
				false,
			);
		});

		it("preserves zone allocations through serialization", () => {
			const json = manager.serialize();
			const restored = ContextProfileManager.deserialize(json);
			const util = restored.getZoneUtilization();
			assert.equal(util[ContextZone.Standing].max, 25_000);
			assert.equal(util[ContextZone.Session].max, 65_000);
			assert.equal(util[ContextZone.Working].max, 30_000);
		});
	});

	describe("edge cases", () => {
		it("handles empty manager", () => {
			assert.equal(manager.getItems().length, 0);
			assert.equal(manager.getSacrificeOrder().length, 0);
			assert.equal(manager.isOverBudget(), false);
			assert.equal(manager.getOverallUtilization().percent, 0);
		});

		it("handles zero budget", () => {
			const zeroBudget = new ContextProfileManager("agent-0", 0);
			assert.equal(zeroBudget.getOverallUtilization().total, 0);
			assert.equal(zeroBudget.isOverBudget(), false);
		});
	});
});
