/**
 * Tests for Agent Versioning (IF-01)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseVersion,
  formatVersion,
  compareVersions,
  isBreakingChange,
  bumpVersion,
  AgentVersionRegistry,
} from "./agent-versioning";

describe("parseVersion", () => {
  it("parses valid semver", () => {
    const v = parseVersion("1.2.3");
    assert.deepEqual(v, { major: 1, minor: 2, patch: 3 });
  });

  it("returns null for invalid", () => {
    assert.equal(parseVersion("abc"), null);
    assert.equal(parseVersion("1.2"), null);
  });
});

describe("formatVersion", () => {
  it("formats as semver string", () => {
    assert.equal(formatVersion({ major: 2, minor: 1, patch: 0 }), "2.1.0");
  });
});

describe("compareVersions", () => {
  it("compares major", () => {
    assert.ok(compareVersions({ major: 2, minor: 0, patch: 0 }, { major: 1, minor: 0, patch: 0 }) > 0);
  });

  it("compares minor", () => {
    assert.ok(compareVersions({ major: 1, minor: 2, patch: 0 }, { major: 1, minor: 1, patch: 0 }) > 0);
  });

  it("compares patch", () => {
    assert.ok(compareVersions({ major: 1, minor: 0, patch: 2 }, { major: 1, minor: 0, patch: 1 }) > 0);
  });

  it("returns 0 for equal", () => {
    assert.equal(compareVersions({ major: 1, minor: 0, patch: 0 }, { major: 1, minor: 0, patch: 0 }), 0);
  });
});

describe("isBreakingChange", () => {
  it("detects major bump as breaking", () => {
    assert.equal(isBreakingChange({ major: 1, minor: 0, patch: 0 }, { major: 2, minor: 0, patch: 0 }), true);
  });

  it("minor is not breaking", () => {
    assert.equal(isBreakingChange({ major: 1, minor: 0, patch: 0 }, { major: 1, minor: 1, patch: 0 }), false);
  });
});

describe("bumpVersion", () => {
  it("bumps major and resets minor/patch", () => {
    assert.deepEqual(bumpVersion({ major: 1, minor: 2, patch: 3 }, "major"), { major: 2, minor: 0, patch: 0 });
  });

  it("bumps minor and resets patch", () => {
    assert.deepEqual(bumpVersion({ major: 1, minor: 2, patch: 3 }, "minor"), { major: 1, minor: 3, patch: 0 });
  });

  it("bumps patch", () => {
    assert.deepEqual(bumpVersion({ major: 1, minor: 2, patch: 3 }, "patch"), { major: 1, minor: 2, patch: 4 });
  });
});

describe("AgentVersionRegistry", () => {
  it("registers and retrieves agents", () => {
    const reg = new AgentVersionRegistry();
    const v = reg.register("agent-1", { role: "tester" });
    assert.equal(v.versionString, "1.0.0");
    assert.equal(reg.getAgentCount(), 1);
  });

  it("updates with version bump", () => {
    const reg = new AgentVersionRegistry();
    reg.register("agent-1", { role: "v1" });
    const v2 = reg.update("agent-1", "minor", { role: "v2" }, "Added feature");
    assert.ok(v2);
    assert.equal(v2!.versionString, "1.1.0");
    assert.equal(reg.getCurrent("agent-1")!.versionString, "1.1.0");
  });

  it("rolls back to previous version", () => {
    const reg = new AgentVersionRegistry();
    reg.register("agent-1", { role: "v1" });
    reg.update("agent-1", "major", { role: "v2-broken" }, "Breaking change");
    const rb = reg.rollback("agent-1", "1.0.0");
    assert.ok(rb);
    assert.ok(rb!.changelog.includes("Rollback"));
    assert.deepEqual(rb!.definition, { role: "v1" });
  });

  it("deprecates versions", () => {
    const reg = new AgentVersionRegistry();
    reg.register("agent-1", { role: "v1" });
    assert.equal(reg.deprecate("agent-1", "1.0.0"), true);
    assert.equal(reg.getVersion("agent-1", "1.0.0")!.deprecated, true);
  });

  it("returns changelog", () => {
    const reg = new AgentVersionRegistry();
    reg.register("agent-1", { role: "v1" }, "Initial");
    reg.update("agent-1", "minor", { role: "v2" }, "Added feature X");
    const log = reg.getChangelog("agent-1");
    assert.equal(log.length, 2);
    assert.ok(log[0].includes("Initial"));
    assert.ok(log[1].includes("Added feature X"));
  });

  it("handles nonexistent agent", () => {
    const reg = new AgentVersionRegistry();
    assert.equal(reg.getCurrent("nope"), null);
    assert.equal(reg.update("nope", "patch", {}, ""), null);
    assert.equal(reg.rollback("nope", "1.0.0"), null);
  });
});
