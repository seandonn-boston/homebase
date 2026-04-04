/**
 * Tests for Agent Versioning (IF-01)
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { AgentDefinition } from "./agent-versioning";
import {
  AgentVersionRegistry,
  compareVersions,
  formatVersion,
  parseVersion,
} from "./agent-versioning";

const makeDef = (name = "test-agent"): AgentDefinition => ({
  name,
  role: "reviewer",
  capabilities: ["lint", "test"],
  authorityTier: 2,
  config: {},
});

describe("AgentVersionRegistry", () => {
  let registry: AgentVersionRegistry;

  beforeEach(() => {
    registry = new AgentVersionRegistry();
  });

  it("registers an agent at 1.0.0", () => {
    const v = registry.register("a1", makeDef());
    expect(formatVersion(v.version)).toBe("1.0.0");
    expect(v.agentId).toBe("a1");
  });

  it("rejects duplicate registration", () => {
    registry.register("a1", makeDef());
    expect(() => registry.register("a1", makeDef())).toThrow(/already registered/);
  });

  it("publishes new versions with correct bumps", () => {
    registry.register("a1", makeDef());
    const v2 = registry.publish("a1", makeDef(), "minor", "Add feature");
    expect(formatVersion(v2.version)).toBe("1.1.0");
    const v3 = registry.publish("a1", makeDef(), "major", "Breaking");
    expect(formatVersion(v3.version)).toBe("2.0.0");
    const v4 = registry.publish("a1", makeDef(), "patch", "Fix");
    expect(formatVersion(v4.version)).toBe("2.0.1");
  });

  it("gets the latest non-deprecated version", () => {
    registry.register("a1", makeDef());
    registry.publish("a1", makeDef(), "minor", "v1.1");
    registry.publish("a1", makeDef(), "minor", "v1.2");
    registry.deprecate("a1", "1.2.0");
    const latest = registry.getLatest("a1");
    expect(latest).toBeDefined();
    expect(formatVersion(latest!.version)).toBe("1.1.0");
  });

  it("pins sessions to current latest version", () => {
    registry.register("a1", makeDef());
    const pin = registry.pinSession("s1", "a1");
    expect(pin).toBeDefined();
    expect(formatVersion(pin!.pinnedVersion)).toBe("1.0.0");

    // Publish new version — pinned session still resolves to 1.0.0
    registry.publish("a1", makeDef(), "minor", "v1.1");
    const resolved = registry.resolveForSession("s1", "a1");
    expect(resolved).toBeDefined();
    expect(formatVersion(resolved!.version)).toBe("1.0.0");
  });

  it("unpinned sessions resolve to latest", () => {
    registry.register("a1", makeDef());
    registry.publish("a1", makeDef(), "minor", "v1.1");
    const resolved = registry.resolveForSession("s99", "a1");
    expect(resolved).toBeDefined();
    expect(formatVersion(resolved!.version)).toBe("1.1.0");
  });

  it("releases session pins", () => {
    registry.register("a1", makeDef());
    registry.pinSession("s1", "a1");
    registry.publish("a1", makeDef(), "minor", "v1.1");
    registry.releaseSession("s1");
    const resolved = registry.resolveForSession("s1", "a1");
    expect(formatVersion(resolved!.version)).toBe("1.1.0");
  });

  it("rolls back to a previous version", () => {
    registry.register("a1", makeDef("original"));
    registry.publish("a1", makeDef("updated"), "minor", "v1.1");
    const rb = registry.rollback("a1", "1.0.0");
    expect(rb.definition.name).toBe("original");
    expect(rb.changelog).toContain("Rollback");
  });

  it("lists agents and versions", () => {
    registry.register("a1", makeDef());
    registry.register("a2", makeDef());
    expect(registry.listAgents()).toEqual(["a1", "a2"]);
    expect(registry.listVersions("a1")).toHaveLength(1);
  });
});

describe("version utilities", () => {
  it("formats and parses versions", () => {
    const v = parseVersion("2.3.4");
    expect(v).toEqual({ major: 2, minor: 3, patch: 4 });
    expect(formatVersion(v)).toBe("2.3.4");
  });

  it("rejects invalid versions", () => {
    expect(() => parseVersion("abc")).toThrow();
    expect(() => parseVersion("1.2")).toThrow();
  });

  it("compares versions", () => {
    expect(compareVersions(parseVersion("1.0.0"), parseVersion("2.0.0"))).toBeLessThan(0);
    expect(compareVersions(parseVersion("1.1.0"), parseVersion("1.0.0"))).toBeGreaterThan(0);
    expect(compareVersions(parseVersion("1.0.0"), parseVersion("1.0.0"))).toBe(0);
  });
});
