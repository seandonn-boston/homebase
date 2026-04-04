/**
 * Tests for X-10 (Build Verification), X-11 (Arch Viz), X-13 (Contracts)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { hashBuildOutput, compareBuilds, generateHookFlowDiagram, generateModuleDiagram, HOOK_CONTRACTS, validatePayloadAgainstContract } from "./build-verification";

const PROJECT_ROOT = join(__dirname, "../..");

// ---------------------------------------------------------------------------
// X-10: Reproducible Builds
// ---------------------------------------------------------------------------

describe("X-10: Reproducible Builds", () => {
  it("hashes build output deterministically", () => {
    const hashes1 = hashBuildOutput(join(PROJECT_ROOT, "admiral", "rating"));
    const hashes2 = hashBuildOutput(join(PROJECT_ROOT, "admiral", "rating"));
    assert.equal(hashes1.length, hashes2.length);
    for (let i = 0; i < hashes1.length; i++) {
      assert.equal(hashes1[i].hash, hashes2[i].hash);
    }
  });

  it("compares identical builds", () => {
    const hashes = hashBuildOutput(join(PROJECT_ROOT, "admiral", "rating"));
    const comparison = compareBuilds(hashes, hashes);
    assert.equal(comparison.identical, true);
    assert.equal(comparison.divergedFiles.length, 0);
  });

  it("detects diverged files", () => {
    const a = [{ file: "a.js", hash: "abc" }, { file: "b.js", hash: "def" }];
    const b = [{ file: "a.js", hash: "abc" }, { file: "b.js", hash: "xyz" }];
    const comparison = compareBuilds(a, b);
    assert.equal(comparison.identical, false);
    assert.equal(comparison.divergedFiles.length, 1);
    assert.equal(comparison.divergedFiles[0], "b.js");
  });
});

// ---------------------------------------------------------------------------
// X-11: Architecture Visualization
// ---------------------------------------------------------------------------

describe("X-11: Architecture Visualization", () => {
  it("generates hook flow Mermaid diagram", () => {
    const diagram = generateHookFlowDiagram(join(PROJECT_ROOT, ".hooks"));
    assert.equal(diagram.type, "flowchart");
    assert.ok(diagram.content.includes("flowchart TD"));
    assert.ok(diagram.content.includes("PreToolUse"));
    assert.ok(diagram.content.includes("PostToolUse"));
  });

  it("generates module dependency diagram", () => {
    const diagram = generateModuleDiagram(PROJECT_ROOT);
    assert.equal(diagram.type, "graph");
    assert.ok(diagram.content.includes("graph TD"));
    assert.ok(diagram.content.includes("admiral_rating"));
  });
});

// ---------------------------------------------------------------------------
// X-13: Contract Testing
// ---------------------------------------------------------------------------

describe("X-13: Contract Testing", () => {
  it("defines contracts for major boundaries", () => {
    assert.ok(HOOK_CONTRACTS.length >= 4);
    for (const contract of HOOK_CONTRACTS) {
      assert.ok(contract.name);
      assert.ok(contract.boundary);
    }
  });

  it("validates valid payload", () => {
    const result = validatePayloadAgainstContract(
      { tool_name: "Read", tool_input: { path: "/test" }, session_id: "s1" },
      HOOK_CONTRACTS[0].inputSchema,
    );
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it("detects missing fields", () => {
    const result = validatePayloadAgainstContract(
      { tool_name: "Read" },
      HOOK_CONTRACTS[0].inputSchema,
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("missing field")));
  });

  it("detects type mismatches", () => {
    const result = validatePayloadAgainstContract(
      { tool_name: 123, tool_input: "not-object", session_id: "s1" },
      HOOK_CONTRACTS[0].inputSchema,
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("expected string")));
  });
});
