/**
 * Tests for Admiral Task Decomposition Interface (EX-06)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type DecompositionInput, TaskDAGBuilder } from "./task-decomposition";

function makeInput(overrides?: Partial<DecompositionInput>): DecompositionInput {
  return {
    taskId: "task-1",
    description: "Test task",
    subtasks: [],
    ...overrides,
  };
}

describe("TaskDAGBuilder — validation", () => {
  const builder = new TaskDAGBuilder();

  it("validates a simple linear DAG", () => {
    const dag = builder.build(
      makeInput({
        subtasks: [
          { id: "a", description: "Step A", agentId: "agent-1", dependencies: [] },
          { id: "b", description: "Step B", agentId: "agent-1", dependencies: ["a"] },
          { id: "c", description: "Step C", agentId: "agent-2", dependencies: ["b"] },
        ],
      }),
    );

    assert.equal(dag.isValid, true);
    assert.equal(dag.validationErrors.length, 0);
    assert.equal(dag.nodes.length, 3);
    assert.equal(dag.edges.length, 2);
  });

  it("detects cycles", () => {
    const dag = builder.build(
      makeInput({
        subtasks: [
          { id: "a", description: "A", agentId: "x", dependencies: ["b"] },
          { id: "b", description: "B", agentId: "x", dependencies: ["a"] },
        ],
      }),
    );

    assert.equal(dag.isValid, false);
    assert.ok(dag.validationErrors.some((e) => e.includes("cycle")));
  });

  it("detects self-dependencies", () => {
    const dag = builder.build(
      makeInput({
        subtasks: [{ id: "a", description: "A", agentId: "x", dependencies: ["a"] }],
      }),
    );

    assert.equal(dag.isValid, false);
    assert.ok(dag.validationErrors.some((e) => e.includes("depends on itself")));
  });

  it("detects references to non-existent nodes", () => {
    const dag = builder.build(
      makeInput({
        subtasks: [{ id: "a", description: "A", agentId: "x", dependencies: ["nonexistent"] }],
      }),
    );

    assert.equal(dag.isValid, false);
    assert.ok(dag.validationErrors.some((e) => e.includes("does not exist")));
  });

  it("detects duplicate IDs", () => {
    const dag = builder.build(
      makeInput({
        subtasks: [
          { id: "a", description: "A1", agentId: "x" },
          { id: "a", description: "A2", agentId: "x" },
        ],
      }),
    );

    assert.equal(dag.isValid, false);
    assert.ok(dag.validationErrors.some((e) => e.includes("Duplicate")));
  });

  it("validates agent references when known agents provided", () => {
    const builder2 = new TaskDAGBuilder(["agent-1", "agent-2"]);
    const dag = builder2.build(
      makeInput({
        subtasks: [{ id: "a", description: "A", agentId: "unknown-agent" }],
      }),
    );

    assert.equal(dag.isValid, false);
    assert.ok(dag.validationErrors.some((e) => e.includes("not a known agent")));
  });

  it("passes validation with known agents", () => {
    const builder2 = new TaskDAGBuilder(["agent-1"]);
    const dag = builder2.build(
      makeInput({
        subtasks: [{ id: "a", description: "A", agentId: "agent-1" }],
      }),
    );

    assert.equal(dag.isValid, true);
  });

  it("handles empty subtask list", () => {
    const dag = builder.build(makeInput({ subtasks: [] }));
    assert.equal(dag.isValid, true);
    assert.equal(dag.nodes.length, 0);
  });
});

describe("TaskDAGBuilder — critical path", () => {
  const builder = new TaskDAGBuilder();

  it("computes critical path for linear DAG", () => {
    const dag = builder.build(
      makeInput({
        subtasks: [
          { id: "a", description: "A", agentId: "x", estimatedDuration: 10, dependencies: [] },
          { id: "b", description: "B", agentId: "x", estimatedDuration: 20, dependencies: ["a"] },
          { id: "c", description: "C", agentId: "x", estimatedDuration: 5, dependencies: ["b"] },
        ],
      }),
    );

    assert.deepEqual(dag.criticalPath, ["a", "b", "c"]);
    assert.equal(dag.totalEstimatedDuration, 35);
  });

  it("computes critical path for diamond DAG", () => {
    // A → B (long) → D
    // A → C (short) → D
    const dag = builder.build(
      makeInput({
        subtasks: [
          { id: "a", description: "A", agentId: "x", estimatedDuration: 1, dependencies: [] },
          { id: "b", description: "B", agentId: "x", estimatedDuration: 100, dependencies: ["a"] },
          { id: "c", description: "C", agentId: "x", estimatedDuration: 1, dependencies: ["a"] },
          {
            id: "d",
            description: "D",
            agentId: "x",
            estimatedDuration: 1,
            dependencies: ["b", "c"],
          },
        ],
      }),
    );

    // Critical path should go through the longer branch (B)
    assert.ok(dag.criticalPath.includes("b"));
    assert.ok(dag.totalEstimatedDuration >= 102);
  });

  it("handles single node", () => {
    const dag = builder.build(
      makeInput({
        subtasks: [{ id: "a", description: "A", agentId: "x", estimatedDuration: 5 }],
      }),
    );

    assert.deepEqual(dag.criticalPath, ["a"]);
    assert.equal(dag.totalEstimatedDuration, 5);
  });
});

describe("TaskDAGBuilder — parallel groups", () => {
  const builder = new TaskDAGBuilder();

  it("identifies parallel opportunities", () => {
    // A → C
    // B → C
    // A and B can run in parallel
    const dag = builder.build(
      makeInput({
        subtasks: [
          { id: "a", description: "A", agentId: "x", dependencies: [] },
          { id: "b", description: "B", agentId: "y", dependencies: [] },
          { id: "c", description: "C", agentId: "x", dependencies: ["a", "b"] },
        ],
      }),
    );

    // First group should contain both A and B (level 0)
    assert.equal(dag.parallelGroups.length, 2);
    assert.ok(dag.parallelGroups[0].includes("a"));
    assert.ok(dag.parallelGroups[0].includes("b"));
    assert.deepEqual(dag.parallelGroups[1], ["c"]);
  });

  it("identifies all-parallel tasks (no dependencies)", () => {
    const dag = builder.build(
      makeInput({
        subtasks: [
          { id: "a", description: "A", agentId: "x" },
          { id: "b", description: "B", agentId: "y" },
          { id: "c", description: "C", agentId: "z" },
        ],
      }),
    );

    // All at level 0
    assert.equal(dag.parallelGroups.length, 1);
    assert.equal(dag.parallelGroups[0].length, 3);
  });

  it("identifies sequential tasks (full chain)", () => {
    const dag = builder.build(
      makeInput({
        subtasks: [
          { id: "a", description: "A", agentId: "x" },
          { id: "b", description: "B", agentId: "x", dependencies: ["a"] },
          { id: "c", description: "C", agentId: "x", dependencies: ["b"] },
        ],
      }),
    );

    assert.equal(dag.parallelGroups.length, 3);
    assert.deepEqual(dag.parallelGroups[0], ["a"]);
    assert.deepEqual(dag.parallelGroups[1], ["b"]);
    assert.deepEqual(dag.parallelGroups[2], ["c"]);
  });
});

describe("TaskDAGBuilder — budget tracking", () => {
  const builder = new TaskDAGBuilder();

  it("computes total budget", () => {
    const dag = builder.build(
      makeInput({
        subtasks: [
          { id: "a", description: "A", agentId: "x", budgetTokens: 100 },
          { id: "b", description: "B", agentId: "x", budgetTokens: 200 },
          { id: "c", description: "C", agentId: "x", budgetTokens: 300 },
        ],
      }),
    );

    assert.equal(dag.totalBudgetTokens, 600);
  });

  it("defaults budget to 0", () => {
    const dag = builder.build(
      makeInput({
        subtasks: [{ id: "a", description: "A", agentId: "x" }],
      }),
    );

    assert.equal(dag.totalBudgetTokens, 0);
  });
});
