/**
 * Tests for Alert Routing (OB-05)
 */

import { describe, it, expect, beforeEach } from "vitest";
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
    expect(alert).not.toBeNull();
    expect(alert!.id).toMatch(/^alert-/);
    expect(alert!.severity).toBe("high");
    expect(alert!.component).toBe("test_hook");
    expect(alert!.message).toBe("Hook failed");
    expect(alert!.acknowledged).toBe(false);
    expect(alert!.resolved).toBe(false);
  });

  it("deduplicates identical alerts within window", () => {
    const a1 = router.fire("high", "comp", "msg");
    const a2 = router.fire("high", "comp", "msg");
    expect(a1).not.toBeNull();
    expect(a2).toBeNull(); // Suppressed
  });

  it("allows same alert after dedup window expires", async () => {
    const router2 = new AlertRouter({ dedupWindowMs: 50 });
    router2.fire("high", "comp", "msg");
    await new Promise((r) => setTimeout(r, 60));
    const a2 = router2.fire("high", "comp", "msg");
    expect(a2).not.toBeNull();
  });

  it("acknowledges alerts", () => {
    const alert = router.fire("high", "comp", "msg")!;
    expect(router.acknowledge(alert.id)).toBe(true);
    expect(router.getAll()[0].acknowledged).toBe(true);
  });

  it("resolves alerts", () => {
    const alert = router.fire("high", "comp", "msg")!;
    router.resolve(alert.id);
    expect(router.getActive()).toHaveLength(0);
  });

  it("sorts active alerts by severity", () => {
    router.fire("low", "c", "low alert");
    router.fire("critical", "c", "critical alert");
    router.fire("medium", "c", "medium alert");

    const active = router.getActive();
    expect(active[0].severity).toBe("critical");
    expect(active[1].severity).toBe("medium");
    expect(active[2].severity).toBe("low");
  });

  it("filters by severity", () => {
    router.fire("high", "c", "h1");
    router.fire("low", "c", "l1");
    router.fire("high", "c2", "h2");

    expect(router.getBySeverity("high")).toHaveLength(2);
    expect(router.getBySeverity("low")).toHaveLength(1);
    expect(router.getBySeverity("critical")).toHaveLength(0);
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
    expect(escalated).toHaveLength(1);
    expect(escalated[0].escalated).toBe(true);
  });

  it("suppresses medium/low alerts during maintenance", () => {
    router.setMaintenanceMode(true);
    expect(router.isMaintenanceMode()).toBe(true);

    const critical = router.fire("critical", "c", "critical");
    const medium = router.fire("medium", "c", "medium");

    expect(critical).not.toBeNull();
    expect(medium).toBeNull();
  });

  it("provides alert summary counts", () => {
    router.fire("critical", "c", "c1");
    router.fire("high", "c", "h1");
    router.fire("high", "c2", "h2");
    router.resolve(router.getAll()[0].id); // resolve critical

    const summary = router.getSummary();
    expect(summary.critical.total).toBe(1);
    expect(summary.critical.active).toBe(0);
    expect(summary.high.total).toBe(2);
    expect(summary.high.active).toBe(2);
  });
});
