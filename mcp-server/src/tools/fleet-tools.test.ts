/**
 * Tests for Fleet tools.
 */

import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { ToolRegistry } from "../tool-registry.js";
import type { ToolContext } from "../tool-registry.js";
import { registerFleetTools, type AgentCapabilityEntry } from "./fleet-tools.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    agentId: "test-agent",
    role: "admiral",
    sessionId: "test-session",
    requestId: "1",
    ...overrides,
  };
}

function createTempRegistry(agents: AgentCapabilityEntry[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fleet-test-"));
  const filePath = path.join(dir, "capability-registry.json");
  fs.writeFileSync(filePath, JSON.stringify({ agents }, null, 2), "utf-8");
  return filePath;
}

const SAMPLE_AGENTS: AgentCapabilityEntry[] = [
  {
    id: "agent-alpha",
    name: "Alpha",
    role: "agent",
    modelTier: "tier-1",
    capabilities: ["code", "testing", "review"],
    status: "active",
    taskState: "working",
    health: "healthy",
  },
  {
    id: "agent-beta",
    name: "Beta",
    role: "lieutenant",
    modelTier: "tier-2",
    capabilities: ["planning", "review", "architecture"],
    status: "idle",
    taskState: "idle",
    health: "healthy",
  },
  {
    id: "agent-gamma",
    name: "Gamma",
    role: "agent",
    modelTier: "tier-1",
    capabilities: ["code", "documentation"],
    status: "error",
    taskState: "blocked",
    health: "error",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Fleet tools", () => {
  let registryPath: string;
  let registry: ToolRegistry;
  let tmpDir: string;

  before(() => {
    registryPath = createTempRegistry(SAMPLE_AGENTS);
    tmpDir = path.dirname(registryPath);
    registry = new ToolRegistry();
    registerFleetTools(registry, registryPath);
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // fleet_status
  describe("fleet_status", () => {
    it("returns all agents with summary", async () => {
      const result = await registry.invoke("fleet_status", {}, makeContext()) as any;
      assert.equal(result.agents.length, 3);
      assert.equal(result.summary.total, 3);
      assert.equal(result.summary.active, 1);
      assert.equal(result.summary.idle, 1);
      assert.equal(result.summary.error, 1);
    });

    it("filters by role", async () => {
      const result = await registry.invoke(
        "fleet_status",
        { filter: { role: "lieutenant" } },
        makeContext(),
      ) as any;
      assert.equal(result.agents.length, 1);
      assert.equal(result.agents[0].id, "agent-beta");
    });

    it("filters by health", async () => {
      const result = await registry.invoke(
        "fleet_status",
        { filter: { health: "error" } },
        makeContext(),
      ) as any;
      assert.equal(result.agents.length, 1);
      assert.equal(result.agents[0].id, "agent-gamma");
    });

    it("requires agent+ role", async () => {
      await assert.rejects(
        () => registry.invoke("fleet_status", {}, makeContext({ role: "observer" })),
        (err: any) => err.message.includes("Insufficient role"),
      );
    });
  });

  // agent_registry
  describe("agent_registry", () => {
    it("returns all agents with no filters", async () => {
      const result = await registry.invoke("agent_registry", {}, makeContext()) as any;
      assert.equal(result.total, 3);
    });

    it("filters by capabilities", async () => {
      const result = await registry.invoke(
        "agent_registry",
        { capabilities: ["code"] },
        makeContext(),
      ) as any;
      assert.equal(result.total, 2); // alpha and gamma
      assert.ok(result.agents.every((a: any) => a.capabilities.includes("code")));
    });

    it("filters by role", async () => {
      const result = await registry.invoke(
        "agent_registry",
        { role: "lieutenant" },
        makeContext(),
      ) as any;
      assert.equal(result.total, 1);
      assert.equal(result.agents[0].id, "agent-beta");
    });

    it("ranks by relevance", async () => {
      const result = await registry.invoke(
        "agent_registry",
        { capabilities: ["code", "testing"] },
        makeContext(),
      ) as any;
      // Alpha has both code+testing, Gamma only has code
      assert.equal(result.agents[0].id, "agent-alpha");
      assert.ok(result.agents[0].relevance > result.agents[1].relevance);
    });

    it("is accessible by observer (universal)", async () => {
      const result = await registry.invoke(
        "agent_registry",
        {},
        makeContext({ role: "observer" }),
      ) as any;
      assert.ok(result.total >= 0);
    });
  });

  // task_route
  describe("task_route", () => {
    it("recommends an agent", async () => {
      const result = await registry.invoke(
        "task_route",
        { requiredCapabilities: ["code", "testing"] },
        makeContext(),
      ) as any;
      assert.ok(result.recommendation);
      assert.ok(result.recommendation.agent);
      assert.ok(typeof result.recommendation.confidence === "number");
      assert.ok(typeof result.recommendation.reasoning === "string");
    });

    it("provides fallback agent", async () => {
      const result = await registry.invoke(
        "task_route",
        { requiredCapabilities: ["code"] },
        makeContext(),
      ) as any;
      assert.ok(result.recommendation.fallback !== undefined);
    });

    it("handles empty registry gracefully", async () => {
      const emptyPath = createTempRegistry([]);
      const emptyRegistry = new ToolRegistry();
      registerFleetTools(emptyRegistry, emptyPath);
      const result = await emptyRegistry.invoke(
        "task_route",
        { requiredCapabilities: ["code"] },
        makeContext(),
      ) as any;
      assert.equal(result.recommendation.agent, "none");
      assert.equal(result.recommendation.confidence, 0);
      fs.rmSync(path.dirname(emptyPath), { recursive: true, force: true });
    });
  });
});
