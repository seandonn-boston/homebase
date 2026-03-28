/**
 * Tests for Alert Routing (OB-05)
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AlertRouter } from "./alerting";

describe("AlertRouter", () => {
  let router: AlertRouter;

  beforeEach(() => {
    router = new AlertRouter({ dedupWindowMs: 100 });
  });

  it("fires alerts with all required fields", () => {
    const alert = router.fire("high", "test_hook", "Hook failed", {
      hook: "zero_trust",
    });
    assert.ok(alert !== null);
    assert.ok(alert!.id.match(/^alert-/));
    assert.strictEqual(alert!.severity, "high");
    assert.strictEqual(alert!.component, "test_hook");
    assert.strictEqual(alert!.message, "Hook failed");
    assert.strictEqual(alert!.acknowledged, false);
    assert.strictEqual(alert!.resolved, false);
  });

  it("deduplicates identical alerts within window", () => {
    const a1 = router.fire("high", "comp", "msg");
    const a2 = router.fire("high", "comp", "msg");
    assert.ok(a1 !== null);
    assert.strictEqual(a2, null); // Suppressed
  });

  it("allows same alert after dedup window expires", async () => {
    const router2 = new AlertRouter({ dedupWindowMs: 50 });
    router2.fire("high", "comp", "msg");
    await new Promise((r) => setTimeout(r, 60));
    const a2 = router2.fire("high", "comp", "msg");
    assert.ok(a2 !== null);
  });

  it("acknowledges alerts", () => {
    const alert = router.fire("high", "comp", "msg")!;
    assert.strictEqual(router.acknowledge(alert.id), true);
    assert.strictEqual(router.getAll()[0].acknowledged, true);
  });

  it("resolves alerts", () => {
    const alert = router.fire("high", "comp", "msg")!;
    router.resolve(alert.id);
    assert.strictEqual(router.getActive().length, 0);
  });

  it("sorts active alerts by severity", () => {
    router.fire("low", "c", "low alert");
    router.fire("critical", "c", "critical alert");
    router.fire("medium", "c", "medium alert");

    const active = router.getActive();
    assert.strictEqual(active[0].severity, "critical");
    assert.strictEqual(active[1].severity, "medium");
    assert.strictEqual(active[2].severity, "low");
  });

  it("filters by severity", () => {
    router.fire("high", "c", "h1");
    router.fire("low", "c", "l1");
    router.fire("high", "c2", "h2");

    assert.strictEqual(router.getBySeverity("high").length, 2);
    assert.strictEqual(router.getBySeverity("low").length, 1);
    assert.strictEqual(router.getBySeverity("critical").length, 0);
  });

  it("checks escalation for unacknowledged alerts", () => {
    const router2 = new AlertRouter({
      dedupWindowMs: 100,
      rules: [
        {
          severity: "critical",
          channels: ["immediate"],
          escalateAfterMs: 0,
          suppressDuringMaintenance: false,
        },
      ],
    });
    router2.fire("critical", "c", "urgent");
    const escalated = router2.checkEscalation();
    assert.strictEqual(escalated.length, 1);
    assert.strictEqual(escalated[0].escalated, true);
  });

  it("suppresses medium/low alerts during maintenance", () => {
    router.setMaintenanceMode(true);
    assert.strictEqual(router.isMaintenanceMode(), true);

    const critical = router.fire("critical", "c", "critical");
    const medium = router.fire("medium", "c", "medium");

    assert.ok(critical !== null);
    assert.strictEqual(medium, null);
  });

  it("provides alert summary counts", () => {
    router.fire("critical", "c", "c1");
    router.fire("high", "c", "h1");
    router.fire("high", "c2", "h2");
    router.resolve(router.getAll()[0].id); // resolve critical

    const summary = router.getSummary();
    assert.strictEqual(summary.critical.total, 1);
    assert.strictEqual(summary.critical.active, 0);
    assert.strictEqual(summary.high.total, 2);
    assert.strictEqual(summary.high.active, 2);
  });
});
