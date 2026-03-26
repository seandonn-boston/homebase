import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { OwnershipConflictResolver, type OwnershipConflict } from "./conflict-resolution";
import type { FileOwnershipRule } from "./engine";

const RULES: FileOwnershipRule[] = [
  { pattern: "src/**/*.ts", owner: "coder", priority: 10 },
  { pattern: "src/**/*.ts", owner: "reviewer", priority: 5 },
  { pattern: "tests/**/*.ts", owner: "tester", priority: 10 },
  { pattern: "docs/**/*.md", owner: "writer", priority: 10 },
  { pattern: "**/*.config.ts", owner: "coder", priority: 8 },
  { pattern: "**/*.config.ts", owner: "architect", priority: 8 },
];

describe("OwnershipConflictResolver", () => {
  let resolver: OwnershipConflictResolver;

  beforeEach(() => {
    resolver = new OwnershipConflictResolver();
  });

  describe("detectConflicts", () => {
    it("detects conflict when multiple owners match a file", () => {
      const conflicts = resolver.detectConflicts(["src/app.ts"], RULES);
      assert.equal(conflicts.length, 1);
      assert.ok(conflicts[0].claimants.includes("coder"));
      assert.ok(conflicts[0].claimants.includes("reviewer"));
    });

    it("returns no conflicts for single-owner files", () => {
      const conflicts = resolver.detectConflicts(["tests/foo.ts"], RULES);
      assert.equal(conflicts.length, 0);
    });

    it("returns no conflicts for unmatched files", () => {
      const conflicts = resolver.detectConflicts(["random.xyz"], RULES);
      assert.equal(conflicts.length, 0);
    });

    it("detects multiple conflicts across files", () => {
      const conflicts = resolver.detectConflicts(
        ["src/app.ts", "build.config.ts"],
        RULES,
      );
      assert.equal(conflicts.length, 2);
    });
  });

  describe("resolve", () => {
    it("uses primary-reviewer when one agent has higher priority", () => {
      const conflict: OwnershipConflict = {
        filePath: "src/app.ts",
        claimants: ["coder", "reviewer"],
      };
      const resolved = resolver.resolve(conflict, { coder: 10, reviewer: 5 });
      assert.ok(resolved.resolution);
      assert.equal(resolved.resolution.strategy, "primary-reviewer");
      if (resolved.resolution.strategy === "primary-reviewer") {
        assert.equal(resolved.resolution.primary, "coder");
        assert.deepEqual(resolved.resolution.reviewers, ["reviewer"]);
      }
    });

    it("uses decompose when agents have equal priority", () => {
      const conflict: OwnershipConflict = {
        filePath: "build.config.ts",
        claimants: ["coder", "architect"],
      };
      const resolved = resolver.resolve(conflict, { coder: 8, architect: 8 });
      assert.ok(resolved.resolution);
      assert.equal(resolved.resolution.strategy, "decompose");
    });

    it("escalates when no priorities provided", () => {
      const conflict: OwnershipConflict = {
        filePath: "src/app.ts",
        claimants: ["coder", "reviewer"],
      };
      const resolved = resolver.resolve(conflict);
      assert.ok(resolved.resolution);
      assert.equal(resolved.resolution.strategy, "escalate");
    });

    it("handles empty claimants", () => {
      const conflict: OwnershipConflict = {
        filePath: "src/app.ts",
        claimants: [],
      };
      const resolved = resolver.resolve(conflict, {});
      assert.ok(resolved.resolution);
      assert.equal(resolved.resolution.strategy, "escalate");
    });
  });

  describe("resolveAll", () => {
    it("resolves multiple conflicts", () => {
      const conflicts: OwnershipConflict[] = [
        { filePath: "src/a.ts", claimants: ["coder", "reviewer"] },
        { filePath: "src/b.ts", claimants: ["coder", "reviewer"] },
      ];
      const resolved = resolver.resolveAll(conflicts, { coder: 10, reviewer: 5 });
      assert.equal(resolved.length, 2);
      assert.ok(resolved.every((r) => r.resolution !== undefined));
    });

    it("returns empty for no conflicts", () => {
      const resolved = resolver.resolveAll([], {});
      assert.equal(resolved.length, 0);
    });

    it("applies priorities consistently", () => {
      const conflicts: OwnershipConflict[] = [
        { filePath: "a.config.ts", claimants: ["coder", "architect"] },
      ];
      const resolved = resolver.resolveAll(conflicts, { coder: 10, architect: 5 });
      assert.equal(resolved[0].resolution?.strategy, "primary-reviewer");
    });
  });
});
