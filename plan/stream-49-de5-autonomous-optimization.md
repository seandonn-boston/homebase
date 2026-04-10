# Stream 49: DE5 — Autonomous Optimization

> Build the DE5 (Autonomous Optimization) ladder rung the aiStrat spec defines: expanded autonomous tier criteria, predictive routing, predictive cost forecasting, closed-loop tuning of routing weights/context budgets/trust thresholds, with safety gates ensuring Admiral retains override authority.

**Phase:** 24 — aiStrat Enterprise Profile Ladder Closure

**Scope:** `aiStrat/admiral/spec/index.md` § Per-Component Scaling defines Data Ecosystem DE5 as "Autonomous optimization (expanded autonomous tiers, predictive)". The current data ecosystem reaches DE3–DE4 (3–5 feedback loops, 3–5 maintenance agents per `plan/index.md` Brain & Knowledge row). DE5 adds the closed-loop tuning that turns Admiral from a governance system into a self-improving operating system. Critically, every autonomous optimization must include a documented safety gate that Admiral can override.

**Resolves:** The DE5 ladder gap that blocks the Enterprise profile.

**Principle:** Autonomy without override is abdication. Every closed loop must have a brake the Admiral can pull.

---

## 49.1 Expanded Autonomous Tier Criteria

- [ ] **DE5-01: Tier expansion model**
  - **Description:** The current Decision Authority model (Stream 18 Progressive Autonomy) has 4 tiers (Enforced/Autonomous/Propose/Escalate). DE5 expands the Autonomous tier into sub-tiers based on earned trust: Auto-low (single-action autonomy), Auto-medium (sequence autonomy), Auto-high (multi-step autonomy with self-monitoring). Each sub-tier has explicit promotion criteria (success rate, complexity ceiling, time-in-role) and demotion triggers.
  - **Done when:** Expanded tier model is documented in `docs/adr/0NN-expanded-autonomy.md` with promotion/demotion criteria.
  - **Files:** `admiral/governance/expanded-autonomy.ts` (new), `docs/adr/0NN-expanded-autonomy.md`
  - **Size:** M
  - **Depends on:** Stream 47 (Phase 24 baseline)

- [ ] **DE5-02: Trust-based auto-promotion**
  - **Description:** Implement automated promotion through autonomy sub-tiers based on the Stream 18 trust model. When an agent's trust score crosses a threshold and stays there for a configurable observation window, it auto-promotes. Every promotion is logged with the trust history that justified it.
  - **Done when:** Auto-promotion fires correctly in a test scenario where an agent earns sustained trust over a simulated period.
  - **Files:** `admiral/governance/auto-promotion.ts` (new), `admiral/governance/auto-promotion.test.ts` (new)
  - **Size:** M
  - **Depends on:** DE5-01

- [ ] **DE5-03: Auto-demotion safety gates**
  - **Description:** Mirror DE5-02 with demotion triggers: trust score drops, anomaly detection fires, federation alert raised, operator override invoked. Every demotion is immediate and logged. Auto-demotion cannot be auto-undone — re-promotion requires the full trust observation window from DE5-02.
  - **Done when:** Auto-demotion fires correctly in a test scenario where an agent's trust collapses.
  - **Files:** `admiral/governance/auto-demotion.ts` (new), `admiral/governance/auto-demotion.test.ts` (new)
  - **Size:** M
  - **Depends on:** DE5-02

## 49.2 Predictive Routing & Forecasting

- [ ] **DE5-04: Predictive routing model**
  - **Description:** Build a routing predictor that takes the current fleet state (capacity, queue depths, recent failure rates) and predicts which agent will produce the best outcome for an incoming task. Uses historical routing decisions from the Brain `_meta` namespace as training data. Initial implementation: simple feature-weighted scoring (no ML required); the architecture supports plugging in an ML model later.
  - **Done when:** Predictive routing produces non-trivial recommendations in a test against 1000 historical routing decisions.
  - **Files:** `admiral/fleet/predictive-routing.ts` (new), `admiral/fleet/predictive-routing.test.ts` (new)
  - **Size:** L
  - **Depends on:** Stream 47 (federation telemetry)

- [ ] **DE5-05: Predictive cost forecasting**
  - **Description:** Forecast token cost and wall-clock cost for an incoming task based on historical actuals for similar tasks. Surface the forecast to operators before high-cost tasks execute. Uses the existing `cost-optimizer.ts` as the substrate. Forecasts feed into the auto-promotion criteria (DE5-02) — agents that consistently produce accurate cost forecasts earn trust faster.
  - **Done when:** Cost forecasts are within ±20% of actuals on 80% of test scenarios.
  - **Files:** `control-plane/src/cost-forecaster.ts` (new), `control-plane/src/cost-forecaster.test.ts` (new)
  - **Size:** L

## 49.3 Closed-Loop Tuning

- [ ] **DE5-06: Routing weight tuning loop**
  - **Description:** Continuously tune the routing engine's signal weights (task-type match, file-ownership, capability match, trust score) based on outcome feedback. Use bandit algorithms (Thompson sampling or UCB) to balance exploration vs exploitation. Every weight change is logged with the outcome window that justified it.
  - **Done when:** Routing weights converge in a simulation against synthetic outcome data.
  - **Files:** `admiral/fleet/weight-tuner.ts` (new), `admiral/fleet/weight-tuner.test.ts` (new)
  - **Size:** L
  - **Depends on:** DE5-04

- [ ] **DE5-07: Context budget tuning loop**
  - **Description:** Tune per-agent context budgets based on observed context utilization and outcome quality. Agents that consistently use <60% of their budget have their budgets reduced (frees tokens for other agents); agents that consistently overflow have their budgets increased (within fleet caps).
  - **Done when:** Context budget tuning converges in a simulation against synthetic utilization data.
  - **Files:** `admiral/context/budget-tuner.ts` (new), `admiral/context/budget-tuner.test.ts` (new)
  - **Size:** L

- [ ] **DE5-08: Trust threshold tuning loop**
  - **Description:** Tune the trust thresholds that drive auto-promotion (DE5-02) and auto-demotion (DE5-03). If too many agents are auto-demoted shortly after promotion, the promotion threshold is too low; if no agents are being promoted, it is too high. Use a control loop with hysteresis to avoid oscillation.
  - **Done when:** Trust threshold tuning produces stable promotion rates in a simulation.
  - **Files:** `admiral/governance/trust-threshold-tuner.ts` (new), `admiral/governance/trust-threshold-tuner.test.ts` (new)
  - **Size:** M

## 49.4 Safety Gates & Override

- [ ] **DE5-09: Admiral override authority**
  - **Description:** Every autonomous decision (promotion, demotion, weight change, budget change, threshold change) must be visible to the Admiral and overridable. Implement an `override` API that pauses the relevant tuning loop, reverts the most recent change, and prevents the loop from re-applying the change for a configurable cooldown. Override actions are logged in the federation audit log (Stream 48 CP5-08).
  - **Done when:** Admiral override pauses every tuning loop and reverts the most recent change in a test.
  - **Files:** `admiral/governance/admiral-override.ts` (new), `admiral/governance/admiral-override.test.ts` (new)
  - **Size:** M
  - **Depends on:** DE5-06, DE5-07, DE5-08

- [ ] **DE5-10: Anomaly detection on autonomous changes**
  - **Description:** Run anomaly detection on the rate and direction of autonomous changes. If the system enters an oscillation, runaway promotion, or runaway demotion, the anomaly detector triggers a federation-level alert (Stream 48 CP5-07) and pauses all tuning loops pending operator review.
  - **Done when:** Anomaly detector pauses tuning loops in a test scenario where the simulated system enters an oscillation.
  - **Files:** `admiral/governance/autonomy-anomaly-detector.ts` (new), `admiral/governance/autonomy-anomaly-detector.test.ts` (new)
  - **Size:** M
  - **Depends on:** DE5-09

## 49.5 DE5 Smoke Test

- [ ] **DE5-11: 30-day simulated operation**
  - **Description:** Run a 30-day simulated federation operation (accelerated wall-clock) exercising every DE5 mechanism: agents earn trust, get promoted, occasionally fail and get demoted, routing weights converge, context budgets adapt, the anomaly detector catches one synthetic oscillation, the Admiral overrides one synthetic bad decision. Produce a report showing every loop's behavior over the simulated period.
  - **Done when:** Simulation runs to completion in CI in <5 minutes wall-clock and produces a structured report. All assertions pass.
  - **Files:** `admiral/tests/de5-simulation.test.ts` (new)
  - **Size:** L
  - **Depends on:** DE5-02, DE5-03, DE5-06, DE5-07, DE5-08, DE5-09, DE5-10

---

## Dependencies

| Item | Depends on |
|------|-----------|
| DE5-01 (tier model) | Stream 47 |
| DE5-02 (auto-promotion) | DE5-01 |
| DE5-03 (auto-demotion) | DE5-02 |
| DE5-04 (predictive routing) | Stream 47 |
| DE5-05 (cost forecasting) | — |
| DE5-06 (weight tuning) | DE5-04 |
| DE5-07 (budget tuning) | — |
| DE5-08 (trust threshold tuning) | DE5-02, DE5-03 |
| DE5-09 (override) | DE5-06, DE5-07, DE5-08 |
| DE5-10 (anomaly) | DE5-09 |
| DE5-11 (simulation) | DE5-02, DE5-03, DE5-06, DE5-07, DE5-08, DE5-09, DE5-10 |

**Phase-level depends on:** Stream 47 (federation telemetry is the input data).

---

## Exit Criteria

- Expanded autonomy tier model documented and implemented.
- Auto-promotion and auto-demotion fire correctly in test scenarios.
- Predictive routing and cost forecasting produce calibrated recommendations.
- Routing weight, context budget, and trust threshold tuning loops converge in simulation.
- Admiral override pauses every loop and reverts the most recent change.
- Anomaly detector catches synthetic oscillations and pauses tuning pending review.
- 30-day simulated operation passes in CI in <5 minutes.
- The Data Ecosystem axis of `plan/index.md` is updated to reflect DE5 achievement.
- The Enterprise profile tuple `B3 F4 E3 CP5 S3 P3 DE5` is documented as runnable in `aiStrat/QUICKSTART.md` with a working configuration example.
