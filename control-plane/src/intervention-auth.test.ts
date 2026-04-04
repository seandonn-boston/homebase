/**
 * Tests for Intervention Authorization (OB-16)
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { InterventionAuthorizer } from "./intervention-auth";

describe("InterventionAuthorizer", () => {
  let auth: InterventionAuthorizer;

  beforeEach(() => {
    auth = new InterventionAuthorizer();
  });

  it("allows any-level interventions for all operators", () => {
    assert.strictEqual(auth.authorize("pause_agent", "any").authorized, true);
    assert.strictEqual(auth.authorize("emergency_halt", "any").authorized, true);
    assert.strictEqual(auth.authorize("pause_agent", "operator").authorized, true);
    assert.strictEqual(auth.authorize("pause_agent", "owner").authorized, true);
  });

  it("requires operator level for kill_task", () => {
    assert.strictEqual(auth.authorize("kill_task", "any").authorized, false);
    assert.strictEqual(auth.authorize("kill_task", "operator").authorized, true);
    assert.strictEqual(auth.authorize("kill_task", "owner").authorized, true);
  });

  it("requires operator level for budget adjustment", () => {
    assert.strictEqual(auth.authorize("adjust_budget", "any").authorized, false);
    assert.strictEqual(auth.authorize("adjust_budget", "operator").authorized, true);
  });

  it("requires owner level for policy modification", () => {
    assert.strictEqual(auth.authorize("modify_policies", "any").authorized, false);
    assert.strictEqual(auth.authorize("modify_policies", "operator").authorized, false);
    assert.strictEqual(auth.authorize("modify_policies", "owner").authorized, true);
  });

  it("requires owner level for resume_agent", () => {
    assert.strictEqual(auth.authorize("resume_agent", "any").authorized, false);
    assert.strictEqual(auth.authorize("resume_agent", "operator").authorized, false);
    assert.strictEqual(auth.authorize("resume_agent", "owner").authorized, true);
  });

  it("returns reason on authorization failure", () => {
    const result = auth.authorize("modify_policies", "any");
    assert.strictEqual(result.authorized, false);
    assert.ok(result.reason!.includes("modify_policies"));
    assert.ok(result.reason!.includes("owner"));
    assert.ok(result.reason!.includes("any"));
  });

  it("reports required level for each intervention type", () => {
    assert.strictEqual(auth.getRequiredLevel("pause_agent"), "any");
    assert.strictEqual(auth.getRequiredLevel("kill_task"), "operator");
    assert.strictEqual(auth.getRequiredLevel("modify_policies"), "owner");
    assert.strictEqual(auth.getRequiredLevel("resume_agent"), "owner");
  });

  it("allows operator-level interventions for tier promotion/demotion", () => {
    assert.strictEqual(auth.authorize("promote_tier", "operator").authorized, true);
    assert.strictEqual(auth.authorize("demote_tier", "operator").authorized, true);
    assert.strictEqual(auth.authorize("promote_tier", "any").authorized, false);
  });
});
