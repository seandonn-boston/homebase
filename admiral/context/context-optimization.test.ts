import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { ContextProfileManager, ContextZone } from "./context-profile";
import {
  ContextBudgetTracker,
  ContextCompressor,
  CompressionStrategy,
  RelevanceScorer,
  ContextInjector,
} from "./context-optimization";

describe("ContextBudgetTracker (CE-02)", () => {
  let manager: ContextProfileManager;
  let tracker: ContextBudgetTracker;

  beforeEach(() => {
    manager = new ContextProfileManager("agent-1", 100_000);
    tracker = new ContextBudgetTracker(manager);
  });

  describe("trackUsage", () => {
    it("returns a snapshot with overall and byZone usage", () => {
      manager.addItem(ContextZone.Session, "x".repeat(400), { priority: 50 });
      const snapshot = tracker.trackUsage();
      assert.ok(snapshot.overall.used > 0);
      assert.ok(snapshot.overall.total === 100_000);
      assert.ok(snapshot.byZone[ContextZone.Session].used > 0);
    });

    it("records snapshots in history", () => {
      tracker.trackUsage();
      tracker.trackUsage();
      assert.equal(tracker.getHistorical().length, 2);
    });

    it("sets timestamp on snapshot", () => {
      const before = Date.now();
      const snapshot = tracker.trackUsage();
      assert.ok(snapshot.timestamp >= before);
    });
  });

  describe("checkThresholds", () => {
    it("returns no warnings when usage is low", () => {
      const result = tracker.checkThresholds();
      assert.equal(result.warning, false);
      assert.equal(result.emergency, false);
    });

    it("returns warning at 75%+ usage", () => {
      // Fill session zone significantly — session max is ~65% of 100K = 65K tokens
      // 75% of total budget = 75K tokens, need to fill across zones
      manager.addItem(ContextZone.Session, "x".repeat(240_000), { priority: 50 }); // ~60K tokens
      manager.addItem(ContextZone.Working, "y".repeat(64_000), { priority: 30 }); // ~16K tokens
      const result = tracker.checkThresholds();
      assert.equal(result.warning, true);
    });

    it("returns emergency at 90%+ usage", () => {
      // Session max = 65% of 100K = 65K tokens => need 260K chars
      // Working max = 30% of 100K = 30K tokens => need 120K chars
      // Standing max = min(25K, 50K) = 25K tokens => need 100K chars
      // Total: 65K + 30K + 25K = 120K > 90K threshold
      manager.addItem(ContextZone.Session, "x".repeat(240_000), { priority: 50 }); // 60K tokens
      manager.addItem(ContextZone.Working, "y".repeat(112_000), { priority: 30 }); // 28K tokens
      manager.addItem(ContextZone.Standing, "z".repeat(16_000), { priority: 90 }); // 4K tokens
      const result = tracker.checkThresholds();
      // 60K + 28K + 4K = 92K / 100K = 92%
      assert.equal(result.emergency, true);
    });
  });

  describe("triggerSacrificeOrder", () => {
    it("returns empty when not over budget", () => {
      const evicted = tracker.triggerSacrificeOrder();
      assert.equal(evicted.length, 0);
    });
  });
});

describe("ContextCompressor (CE-03)", () => {
  let manager: ContextProfileManager;
  let compressor: ContextCompressor;

  beforeEach(() => {
    manager = new ContextProfileManager("agent-1", 1000);
    compressor = new ContextCompressor(manager);
  });

  describe("compress with Evict strategy", () => {
    it("evicts items to reach target percent", () => {
      manager.addItem(ContextZone.Session, "a".repeat(800), { priority: 20 }); // 200 tokens
      manager.addItem(ContextZone.Working, "b".repeat(800), { priority: 10 }); // 200 tokens
      // Total: 400 tokens of 1000 budget = 40%
      const result = compressor.compress(CompressionStrategy.Evict, 25);
      assert.ok(result.removed.length > 0);
      assert.ok(result.savedTokens > 0);
    });

    it("returns empty when already under target", () => {
      manager.addItem(ContextZone.Session, "a".repeat(40), { priority: 50 }); // ~10 tokens
      const result = compressor.compress(CompressionStrategy.Evict, 50);
      assert.equal(result.removed.length, 0);
    });
  });

  describe("compress with Prioritize strategy", () => {
    it("removes low-priority items first", () => {
      manager.addItem(ContextZone.Session, "a".repeat(400), { priority: 10 }); // low priority
      manager.addItem(ContextZone.Session, "b".repeat(400), { priority: 80 }); // high priority
      const result = compressor.compress(CompressionStrategy.Prioritize, 15);
      assert.ok(result.removed.length > 0);
      // Low-priority item should have been removed
      assert.ok(result.removed.some((i) => i.priority === 10));
    });
  });

  describe("compress with Summarize strategy", () => {
    it("truncates compressible items", () => {
      manager.addItem(ContextZone.Session, "a".repeat(800), { priority: 20, compressible: true });
      const result = compressor.compress(CompressionStrategy.Summarize, 5);
      assert.ok(result.compressed.length > 0 || result.removed.length > 0);
    });
  });

  describe("autoCompress", () => {
    it("does nothing below 85% utilization", () => {
      manager.addItem(ContextZone.Session, "a".repeat(40), { priority: 50 }); // tiny
      const { result } = compressor.autoCompress();
      assert.equal(result.removed.length, 0);
      assert.equal(result.compressed.length, 0);
    });
  });
});

describe("RelevanceScorer (CE-04)", () => {
  let scorer: RelevanceScorer;

  beforeEach(() => {
    scorer = new RelevanceScorer();
  });

  describe("score", () => {
    it("returns a score between 0 and 100", () => {
      const item = makeItem({ zone: ContextZone.Standing, priority: 80 });
      const result = scorer.score(item);
      assert.ok(result.score >= 0);
      assert.ok(result.score <= 100);
    });

    it("gives higher authority weight to Standing zone items", () => {
      const standing = scorer.score(makeItem({ zone: ContextZone.Standing, priority: 50 }));
      const working = scorer.score(makeItem({ zone: ContextZone.Working, priority: 50 }));
      assert.ok(standing.dimensions.authorityWeight > working.dimensions.authorityWeight);
    });

    it("gives higher dependency score to non-compressible items", () => {
      const required = scorer.score(makeItem({ compressible: false, priority: 50 }));
      const optional = scorer.score(makeItem({ compressible: true, priority: 50 }));
      assert.ok(required.dimensions.dependency >= optional.dimensions.dependency);
    });

    it("scores semantic proximity higher with matching task", () => {
      const item = makeItem({ source: "routing engine", content: "routing engine handles task distribution" });
      const withTask = scorer.score(item, "routing engine distribution");
      const noTask = scorer.score(item);
      assert.ok(withTask.dimensions.semanticProximity >= noTask.dimensions.semanticProximity);
    });

    it("returns neutral semantic score without task", () => {
      const item = makeItem({});
      const result = scorer.score(item);
      assert.equal(result.dimensions.semanticProximity, 10);
    });
  });

  describe("rankItems", () => {
    it("returns items sorted by score descending", () => {
      const items = [
        makeItem({ zone: ContextZone.Working, priority: 10, compressible: true }),
        makeItem({ zone: ContextZone.Standing, priority: 90, compressible: false }),
        makeItem({ zone: ContextZone.Session, priority: 50, compressible: true }),
      ];
      const ranked = scorer.rankItems(items);
      for (let i = 1; i < ranked.length; i++) {
        assert.ok(ranked[i - 1].score >= ranked[i].score);
      }
    });

    it("returns all items", () => {
      const items = [makeItem({}), makeItem({}), makeItem({})];
      const ranked = scorer.rankItems(items);
      assert.equal(ranked.length, 3);
    });

    it("assigns unique itemIds matching input", () => {
      const items = [makeItem({ id: "a" }), makeItem({ id: "b" })];
      const ranked = scorer.rankItems(items);
      const ids = ranked.map((r) => r.itemId);
      assert.ok(ids.includes("a"));
      assert.ok(ids.includes("b"));
    });
  });

  describe("dimension ranges", () => {
    it("recency is 0-20", () => {
      const item = makeItem({});
      const result = scorer.score(item);
      assert.ok(result.dimensions.recency >= 0 && result.dimensions.recency <= 20);
    });

    it("frequency is 0-20", () => {
      const item = makeItem({ priority: 100 });
      const result = scorer.score(item);
      assert.ok(result.dimensions.frequency >= 0 && result.dimensions.frequency <= 20);
    });

    it("authorityWeight is 0-20", () => {
      const item = makeItem({});
      const result = scorer.score(item);
      assert.ok(result.dimensions.authorityWeight >= 0 && result.dimensions.authorityWeight <= 20);
    });

    it("dependency is 0-20", () => {
      const item = makeItem({});
      const result = scorer.score(item);
      assert.ok(result.dimensions.dependency >= 0 && result.dimensions.dependency <= 20);
    });
  });
});

describe("ContextInjector (CE-05)", () => {
  let manager: ContextProfileManager;
  let scorer: RelevanceScorer;
  let injector: ContextInjector;

  beforeEach(() => {
    manager = new ContextProfileManager("agent-1", 100_000);
    scorer = new RelevanceScorer();
    injector = new ContextInjector(manager, scorer);
  });

  describe("assembleContext", () => {
    it("orders Standing first, Session middle, Working last", () => {
      manager.addItem(ContextZone.Working, "task data", { priority: 80, source: "task" });
      manager.addItem(ContextZone.Standing, "identity", { priority: 100, source: "identity" });
      manager.addItem(ContextZone.Session, "reference", { priority: 60, source: "reference" });

      const { ordered } = injector.assembleContext();
      assert.equal(ordered[0].zone, ContextZone.Standing);
      assert.equal(ordered[1].zone, ContextZone.Session);
      assert.equal(ordered[2].zone, ContextZone.Working);
    });

    it("computes correct total tokens", () => {
      manager.addItem(ContextZone.Session, "x".repeat(400), { priority: 50 }); // 100 tokens
      manager.addItem(ContextZone.Working, "y".repeat(200), { priority: 50 }); // 50 tokens
      const { totalTokens } = injector.assembleContext();
      assert.equal(totalTokens, 150);
    });

    it("returns empty when no items", () => {
      const { ordered, totalTokens } = injector.assembleContext();
      assert.equal(ordered.length, 0);
      assert.equal(totalTokens, 0);
    });

    it("sorts within zone by relevance score", () => {
      manager.addItem(ContextZone.Session, "low pri", { priority: 10, source: "low" });
      manager.addItem(ContextZone.Session, "high pri", { priority: 90, source: "high" });
      const { ordered } = injector.assembleContext();
      const sessionItems = ordered.filter((i) => i.zone === ContextZone.Session);
      // Higher priority should come first within zone
      assert.ok(sessionItems[0].priority >= sessionItems[1].priority);
    });

    it("preserves primacy/recency ordering even with task context", () => {
      manager.addItem(ContextZone.Working, "implement routing feature", { priority: 95, source: "task" });
      manager.addItem(ContextZone.Standing, "I am helm", { priority: 100, source: "identity" });
      const { ordered } = injector.assembleContext("routing feature");
      // Standing still comes first (primacy) regardless of semantic match
      assert.equal(ordered[0].zone, ContextZone.Standing);
    });
  });
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let _itemCounter = 0;

function makeItem(overrides: Partial<{
  id: string;
  zone: ContextZone;
  content: string;
  tokenCount: number;
  priority: number;
  source: string;
  addedAt: number;
  lastAccessed: number;
  compressible: boolean;
}>) {
  _itemCounter++;
  return {
    id: overrides.id ?? `item-${_itemCounter}`,
    zone: overrides.zone ?? ContextZone.Session,
    content: overrides.content ?? "test content",
    tokenCount: overrides.tokenCount ?? 10,
    priority: overrides.priority ?? 50,
    source: overrides.source ?? "test",
    addedAt: overrides.addedAt ?? Date.now(),
    lastAccessed: overrides.lastAccessed ?? Date.now(),
    compressible: overrides.compressible ?? true,
  };
}
