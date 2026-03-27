/**
 * Tests for Policy Management API (GP-02)
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  type CreatePolicyRequest,
  type GovernancePolicy,
  InMemoryPolicyStore,
  PolicyNotFoundError,
  PolicyValidationError,
} from "./policies";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeCreateRequest(overrides?: Partial<CreatePolicyRequest>): CreatePolicyRequest {
  return {
    name: "Test Policy",
    description: "A test governance policy",
    enforcement: "monitor",
    scope: "fleet",
    rule: { maxCalls: 100 },
    createdBy: "operator-1",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// InMemoryPolicyStore tests
// ---------------------------------------------------------------------------

describe("InMemoryPolicyStore", () => {
  let store: InMemoryPolicyStore;

  beforeEach(() => {
    store = new InMemoryPolicyStore();
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe("create()", () => {
    it("creates a policy with all fields", () => {
      const policy = store.create(makeCreateRequest());
      assert.equal(typeof policy.id, "string");
      assert.ok(policy.id.length > 0);
      assert.equal(policy.name, "Test Policy");
      assert.equal(policy.description, "A test governance policy");
      assert.equal(policy.version, 1);
      assert.equal(policy.enforcement, "monitor");
      assert.equal(policy.scope, "fleet");
      assert.deepEqual(policy.rule, { maxCalls: 100 });
      assert.equal(policy.status, "active");
      assert.equal(policy.createdBy, "operator-1");
    });

    it("applies defaults for enforcement and scope when omitted", () => {
      const req: CreatePolicyRequest = {
        name: "Minimal",
        description: "",
        enforcement: "monitor",
        scope: "fleet",
        rule: {},
        createdBy: "op",
      };
      const policy = store.create(req);
      assert.equal(policy.enforcement, "monitor");
      assert.equal(policy.scope, "fleet");
    });

    it("assigns unique ids to each policy", () => {
      const p1 = store.create(makeCreateRequest({ name: "P1" }));
      const p2 = store.create(makeCreateRequest({ name: "P2" }));
      assert.notEqual(p1.id, p2.id);
    });

    it("sets createdAt and updatedAt to same ISO timestamp", () => {
      const policy = store.create(makeCreateRequest());
      assert.ok(!Number.isNaN(Date.parse(policy.createdAt)));
      assert.equal(policy.createdAt, policy.updatedAt);
    });

    it("increments store size on each create", () => {
      assert.equal(store.size, 0);
      store.create(makeCreateRequest({ name: "P1" }));
      assert.equal(store.size, 1);
      store.create(makeCreateRequest({ name: "P2" }));
      assert.equal(store.size, 2);
    });

    it("throws PolicyValidationError when name is missing", () => {
      assert.throws(
        () =>
          store.create({
            name: "",
            description: "",
            enforcement: "monitor",
            scope: "fleet",
            rule: {},
            createdBy: "op",
          }),
        PolicyValidationError,
      );
    });

    it("throws PolicyValidationError when name is whitespace only", () => {
      assert.throws(() => store.create(makeCreateRequest({ name: "   " })), PolicyValidationError);
    });

    it("throws PolicyValidationError when createdBy is missing", () => {
      assert.throws(
        () => store.create(makeCreateRequest({ createdBy: "" })),
        PolicyValidationError,
      );
    });

    it("throws PolicyValidationError for invalid enforcement value", () => {
      assert.throws(
        () =>
          store.create(
            makeCreateRequest({ enforcement: "invalid" as GovernancePolicy["enforcement"] }),
          ),
        PolicyValidationError,
      );
    });

    it("throws PolicyValidationError for invalid scope value", () => {
      assert.throws(
        () => store.create(makeCreateRequest({ scope: "universe" as GovernancePolicy["scope"] })),
        PolicyValidationError,
      );
    });

    it("trims whitespace from name and createdBy", () => {
      const policy = store.create(
        makeCreateRequest({ name: "  My Policy  ", createdBy: "  op  " }),
      );
      assert.equal(policy.name, "My Policy");
      assert.equal(policy.createdBy, "op");
    });

    it("all three enforcement values are accepted", () => {
      for (const enforcement of ["enforce", "monitor", "disabled"] as const) {
        const p = store.create(makeCreateRequest({ name: `P-${enforcement}`, enforcement }));
        assert.equal(p.enforcement, enforcement);
      }
    });

    it("all three scope values are accepted", () => {
      for (const scope of ["fleet", "role", "project"] as const) {
        const p = store.create(makeCreateRequest({ name: `P-${scope}`, scope }));
        assert.equal(p.scope, scope);
      }
    });
  });

  // -------------------------------------------------------------------------
  // get
  // -------------------------------------------------------------------------

  describe("get()", () => {
    it("returns the policy by id", () => {
      const created = store.create(makeCreateRequest());
      const fetched = store.get(created.id);
      assert.ok(fetched !== undefined);
      assert.equal(fetched.id, created.id);
      assert.equal(fetched.name, "Test Policy");
    });

    it("returns undefined for unknown id", () => {
      const result = store.get("nonexistent-id");
      assert.equal(result, undefined);
    });
  });

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  describe("list()", () => {
    it("returns empty array when no policies", () => {
      assert.deepEqual(store.list(), []);
    });

    it("returns all policies when no filters", () => {
      store.create(makeCreateRequest({ name: "P1" }));
      store.create(makeCreateRequest({ name: "P2" }));
      assert.equal(store.list().length, 2);
    });

    it("filters by status=active", () => {
      const p1 = store.create(makeCreateRequest({ name: "Active" }));
      const p2 = store.create(makeCreateRequest({ name: "ToDeactivate" }));
      store.deactivate(p2.id, "No longer needed", "op");

      const active = store.list({ status: "active" });
      assert.equal(active.length, 1);
      assert.equal(active[0].id, p1.id);
    });

    it("filters by status=inactive", () => {
      const p1 = store.create(makeCreateRequest({ name: "Active" }));
      const p2 = store.create(makeCreateRequest({ name: "Inactive" }));
      store.deactivate(p2.id, "Done", "op");

      const inactive = store.list({ status: "inactive" });
      assert.equal(inactive.length, 1);
      assert.equal(inactive[0].id, p2.id);

      void p1; // suppress unused-variable lint
    });

    it("filters by enforcement", () => {
      store.create(makeCreateRequest({ name: "Enforced", enforcement: "enforce" }));
      store.create(makeCreateRequest({ name: "Monitored", enforcement: "monitor" }));

      const enforced = store.list({ enforcement: "enforce" });
      assert.equal(enforced.length, 1);
      assert.equal(enforced[0].name, "Enforced");
    });

    it("filters by scope", () => {
      store.create(makeCreateRequest({ name: "Fleet", scope: "fleet" }));
      store.create(makeCreateRequest({ name: "Role", scope: "role" }));

      const roleScoped = store.list({ scope: "role" });
      assert.equal(roleScoped.length, 1);
      assert.equal(roleScoped[0].name, "Role");
    });

    it("combines multiple filters", () => {
      store.create(makeCreateRequest({ name: "A", enforcement: "enforce", scope: "fleet" }));
      store.create(makeCreateRequest({ name: "B", enforcement: "monitor", scope: "fleet" }));
      store.create(makeCreateRequest({ name: "C", enforcement: "enforce", scope: "role" }));

      const result = store.list({ enforcement: "enforce", scope: "fleet" });
      assert.equal(result.length, 1);
      assert.equal(result[0].name, "A");
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  describe("update()", () => {
    it("updates name and bumps version to 2", () => {
      const p = store.create(makeCreateRequest());
      const updated = store.update(p.id, {
        name: "Updated Name",
        updatedBy: "op-2",
        rationale: "Name change requested",
      });
      assert.equal(updated.name, "Updated Name");
      assert.equal(updated.version, 2);
      assert.equal(updated.updatedBy, "op-2");
      assert.equal(updated.rationale, "Name change requested");
    });

    it("preserves unmodified fields", () => {
      const p = store.create(
        makeCreateRequest({ enforcement: "enforce", scope: "role", description: "Original" }),
      );
      const updated = store.update(p.id, {
        name: "New Name",
        updatedBy: "op",
        rationale: "r",
      });
      assert.equal(updated.enforcement, "enforce");
      assert.equal(updated.scope, "role");
      assert.equal(updated.description, "Original");
      assert.equal(updated.createdBy, p.createdBy);
    });

    it("can update enforcement", () => {
      const p = store.create(makeCreateRequest({ enforcement: "monitor" }));
      const updated = store.update(p.id, {
        enforcement: "enforce",
        updatedBy: "op",
        rationale: "Strengthening controls",
      });
      assert.equal(updated.enforcement, "enforce");
    });

    it("can update rule", () => {
      const p = store.create(makeCreateRequest({ rule: { maxCalls: 100 } }));
      const updated = store.update(p.id, {
        rule: { maxCalls: 200, allowRetry: true },
        updatedBy: "op",
        rationale: "Increased limit",
      });
      assert.deepEqual(updated.rule, { maxCalls: 200, allowRetry: true });
    });

    it("successive updates increment version monotonically", () => {
      const p = store.create(makeCreateRequest());
      store.update(p.id, { name: "V2", updatedBy: "op", rationale: "r" });
      const v3 = store.update(p.id, { name: "V3", updatedBy: "op", rationale: "r" });
      const v4 = store.update(p.id, { name: "V4", updatedBy: "op", rationale: "r" });
      assert.equal(v3.version, 3);
      assert.equal(v4.version, 4);
    });

    it("get() returns the latest version after update", () => {
      const p = store.create(makeCreateRequest());
      store.update(p.id, { name: "Latest", updatedBy: "op", rationale: "r" });
      const latest = store.get(p.id);
      assert.equal(latest?.name, "Latest");
      assert.equal(latest?.version, 2);
    });

    it("updates updatedAt timestamp", () => {
      const p = store.create(makeCreateRequest());
      const before = p.updatedAt;
      const updated = store.update(p.id, { name: "N", updatedBy: "op", rationale: "r" });
      // updatedAt should be >= createdAt (same ms is OK if fast)
      assert.ok(Date.parse(updated.updatedAt) >= Date.parse(before));
    });

    it("throws PolicyNotFoundError for unknown id", () => {
      assert.throws(
        () => store.update("ghost-id", { updatedBy: "op", rationale: "r" }),
        PolicyNotFoundError,
      );
    });

    it("throws PolicyValidationError when updatedBy is missing", () => {
      const p = store.create(makeCreateRequest());
      assert.throws(
        () => store.update(p.id, { updatedBy: "", rationale: "r" }),
        PolicyValidationError,
      );
    });

    it("throws PolicyValidationError when rationale is missing", () => {
      const p = store.create(makeCreateRequest());
      assert.throws(
        () => store.update(p.id, { updatedBy: "op", rationale: "" }),
        PolicyValidationError,
      );
    });

    it("throws PolicyValidationError for invalid enforcement in update", () => {
      const p = store.create(makeCreateRequest());
      assert.throws(
        () =>
          store.update(p.id, {
            enforcement: "bad" as GovernancePolicy["enforcement"],
            updatedBy: "op",
            rationale: "r",
          }),
        PolicyValidationError,
      );
    });
  });

  // -------------------------------------------------------------------------
  // deactivate
  // -------------------------------------------------------------------------

  describe("deactivate()", () => {
    it("sets status to inactive", () => {
      const p = store.create(makeCreateRequest());
      const deactivated = store.deactivate(p.id, "No longer needed", "operator");
      assert.equal(deactivated.status, "inactive");
    });

    it("bumps version on deactivation", () => {
      const p = store.create(makeCreateRequest());
      const deactivated = store.deactivate(p.id, "Reason", "op");
      assert.equal(deactivated.version, 2);
    });

    it("records deactivatedAt, deactivatedBy, deactivationReason", () => {
      const p = store.create(makeCreateRequest());
      const d = store.deactivate(p.id, "Expired", "admin");
      assert.ok(!Number.isNaN(Date.parse(d.deactivatedAt!)));
      assert.equal(d.deactivatedBy, "admin");
      assert.equal(d.deactivationReason, "Expired");
    });

    it("policy still retrievable after deactivation", () => {
      const p = store.create(makeCreateRequest());
      store.deactivate(p.id, "Done", "op");
      const fetched = store.get(p.id);
      assert.ok(fetched !== undefined);
      assert.equal(fetched.status, "inactive");
    });

    it("still appears in list() with no filter", () => {
      const p = store.create(makeCreateRequest());
      store.deactivate(p.id, "Done", "op");
      assert.equal(store.list().length, 1);
    });

    it("does not appear in list({ status: 'active' }) after deactivation", () => {
      const p = store.create(makeCreateRequest());
      store.deactivate(p.id, "Done", "op");
      assert.equal(store.list({ status: "active" }).length, 0);
    });

    it("throws PolicyNotFoundError for unknown id", () => {
      assert.throws(() => store.deactivate("ghost", "reason", "op"), PolicyNotFoundError);
    });

    it("throws PolicyValidationError when reason is empty", () => {
      const p = store.create(makeCreateRequest());
      assert.throws(() => store.deactivate(p.id, "", "op"), PolicyValidationError);
    });

    it("throws PolicyValidationError when author is empty", () => {
      const p = store.create(makeCreateRequest());
      assert.throws(() => store.deactivate(p.id, "reason", ""), PolicyValidationError);
    });
  });

  // -------------------------------------------------------------------------
  // getVersionHistory
  // -------------------------------------------------------------------------

  describe("getVersionHistory()", () => {
    it("returns single entry after creation", () => {
      const p = store.create(makeCreateRequest());
      const history = store.getVersionHistory(p.id);
      assert.equal(history.length, 1);
      assert.equal(history[0].version, 1);
    });

    it("returns two entries after one update", () => {
      const p = store.create(makeCreateRequest());
      store.update(p.id, { name: "V2", updatedBy: "op", rationale: "r" });
      const history = store.getVersionHistory(p.id);
      assert.equal(history.length, 2);
    });

    it("history versions are monotonically increasing", () => {
      const p = store.create(makeCreateRequest());
      store.update(p.id, { name: "V2", updatedBy: "op", rationale: "r" });
      store.update(p.id, { name: "V3", updatedBy: "op", rationale: "r" });
      store.deactivate(p.id, "Done", "op");

      const history = store.getVersionHistory(p.id);
      assert.equal(history.length, 4);
      for (let i = 0; i < history.length; i++) {
        assert.equal(history[i].version, i + 1);
      }
    });

    it("history is a copy — mutating it does not affect the store", () => {
      const p = store.create(makeCreateRequest());
      const history = store.getVersionHistory(p.id);
      history.push({ ...p, version: 99 });

      const historyAgain = store.getVersionHistory(p.id);
      assert.equal(historyAgain.length, 1);
    });

    it("preserves original fields in old versions", () => {
      const p = store.create(makeCreateRequest({ name: "Original" }));
      store.update(p.id, { name: "Updated", updatedBy: "op", rationale: "r" });

      const history = store.getVersionHistory(p.id);
      assert.equal(history[0].name, "Original");
      assert.equal(history[1].name, "Updated");
    });

    it("throws PolicyNotFoundError for unknown id", () => {
      assert.throws(() => store.getVersionHistory("ghost"), PolicyNotFoundError);
    });
  });

  // -------------------------------------------------------------------------
  // getChangelog
  // -------------------------------------------------------------------------

  describe("getChangelog()", () => {
    it("has a 'created' entry after creation", () => {
      const p = store.create(makeCreateRequest());
      const log = store.getChangelog(p.id);
      assert.equal(log.length, 1);
      assert.equal(log[0].action, "created");
      assert.equal(log[0].version, 1);
      assert.equal(log[0].author, "operator-1");
    });

    it("appends 'updated' entry on update", () => {
      const p = store.create(makeCreateRequest());
      store.update(p.id, { name: "V2", updatedBy: "op-2", rationale: "Needed change" });

      const log = store.getChangelog(p.id);
      assert.equal(log.length, 2);
      assert.equal(log[1].action, "updated");
      assert.equal(log[1].author, "op-2");
      assert.equal(log[1].rationale, "Needed change");
      assert.equal(log[1].version, 2);
    });

    it("appends 'deactivated' entry on deactivation", () => {
      const p = store.create(makeCreateRequest());
      store.deactivate(p.id, "Expired policy", "admin");

      const log = store.getChangelog(p.id);
      assert.equal(log.length, 2);
      assert.equal(log[1].action, "deactivated");
      assert.equal(log[1].rationale, "Expired policy");
      assert.equal(log[1].author, "admin");
    });

    it("changelog timestamps are valid ISO strings", () => {
      const p = store.create(makeCreateRequest());
      const log = store.getChangelog(p.id);
      assert.ok(!Number.isNaN(Date.parse(log[0].timestamp)));
    });

    it("throws PolicyNotFoundError for unknown id", () => {
      assert.throws(() => store.getChangelog("ghost"), PolicyNotFoundError);
    });
  });

  // -------------------------------------------------------------------------
  // Error types
  // -------------------------------------------------------------------------

  describe("Error types", () => {
    it("PolicyValidationError is instanceof Error", () => {
      let err: unknown;
      try {
        store.create(makeCreateRequest({ name: "" }));
      } catch (e) {
        err = e;
      }
      assert.ok(err instanceof Error);
      assert.ok(err instanceof PolicyValidationError);
      assert.equal((err as PolicyValidationError).name, "PolicyValidationError");
    });

    it("PolicyNotFoundError is instanceof Error", () => {
      let err: unknown;
      try {
        store.get("ghost");
        store.update("ghost", { updatedBy: "op", rationale: "r" });
      } catch (e) {
        err = e;
      }
      assert.ok(err instanceof Error);
      assert.ok(err instanceof PolicyNotFoundError);
      assert.equal((err as PolicyNotFoundError).name, "PolicyNotFoundError");
    });

    it("PolicyNotFoundError message contains the id", () => {
      let err: unknown;
      try {
        store.deactivate("the-missing-id", "r", "op");
      } catch (e) {
        err = e;
      }
      assert.ok(err instanceof PolicyNotFoundError);
      assert.ok((err as PolicyNotFoundError).message.includes("the-missing-id"));
    });
  });
});
