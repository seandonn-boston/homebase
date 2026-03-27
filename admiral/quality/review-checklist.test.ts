/**
 * Tests for review-checklist (QA-08)
 *
 * Happy path + unhappy path tests for review checklist generation.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyFile,
  generateChecklist,
  formatChecklistMarkdown,
  type FileClassification,
  type ReviewChecklist,
  type RiskLevel,
} from "./review-checklist";

// ---------------------------------------------------------------------------
// File Classification
// ---------------------------------------------------------------------------

describe("classifyFile", () => {
  it("classifies hook files as high risk", () => {
    const result = classifyFile(".hooks/pre_tool_use.sh");
    assert.equal(result.risk, "high");
    assert.ok(result.categories.includes("hooks"));
  });

  it("classifies security files as high risk", () => {
    const result = classifyFile("admiral/security/audit-trail.ts");
    assert.equal(result.risk, "high");
    assert.ok(result.categories.includes("security"));
  });

  it("classifies package.json as high risk", () => {
    const result = classifyFile("package.json");
    assert.equal(result.risk, "high");
    assert.ok(result.categories.includes("dependencies"));
  });

  it("classifies CI workflows as high risk", () => {
    const result = classifyFile(".github/workflows/ci.yml");
    assert.equal(result.risk, "high");
    assert.ok(result.categories.includes("ci-cd"));
  });

  it("classifies AGENTS.md as high risk", () => {
    const result = classifyFile("AGENTS.md");
    assert.equal(result.risk, "high");
    assert.ok(result.categories.includes("agent-config"));
  });

  it("classifies governance files as high risk", () => {
    const result = classifyFile("admiral/governance/sentinel.ts");
    assert.equal(result.risk, "high");
    assert.ok(result.categories.includes("governance"));
  });

  it("classifies admiral core files as medium risk", () => {
    const result = classifyFile("admiral/quality/code-review.ts");
    assert.equal(result.risk, "medium");
    assert.ok(result.categories.includes("core-logic"));
  });

  it("classifies fleet files as medium risk", () => {
    const result = classifyFile("fleet/agents/reviewer.json");
    assert.equal(result.risk, "medium");
    assert.ok(result.categories.includes("fleet"));
  });

  it("classifies test files as low risk", () => {
    const result = classifyFile("admiral/quality/code-review.test.ts");
    assert.equal(result.risk, "low");
    assert.ok(result.categories.includes("tests"));
  });

  it("classifies markdown files as low risk", () => {
    const result = classifyFile("docs/api-reference.md");
    assert.equal(result.risk, "low");
    assert.ok(result.categories.includes("documentation"));
  });

  it("classifies plan files as low risk", () => {
    const result = classifyFile("plan/todo/14-context-engineering.md");
    assert.equal(result.risk, "low");
    assert.ok(result.categories.includes("planning"));
  });

  it("defaults to medium risk for unknown files", () => {
    const result = classifyFile("some/random/file.xyz");
    assert.equal(result.risk, "medium");
    assert.ok(result.categories.includes("unclassified"));
  });

  it("respects risk overrides", () => {
    const overrides = new Map<string, RiskLevel>([["trivial.ts", "low"]]);
    const result = classifyFile("trivial.ts", overrides);
    assert.equal(result.risk, "low");
  });
});

// ---------------------------------------------------------------------------
// Checklist Generation
// ---------------------------------------------------------------------------

describe("generateChecklist", () => {
  it("generates checklist for high-risk files", () => {
    const checklist = generateChecklist([".hooks/pre_tool_use.sh", "admiral/security/scan.ts"]);
    assert.equal(checklist.overallRisk, "high");
    assert.ok(checklist.items.length > 0);
    assert.ok(checklist.title.includes("high"));
  });

  it("generates checklist for low-risk files only", () => {
    const checklist = generateChecklist(["docs/README.md", "plan/todo/01.md"]);
    assert.equal(checklist.overallRisk, "low");
    assert.ok(checklist.items.length > 0);
  });

  it("includes universal items for any file set", () => {
    const checklist = generateChecklist(["docs/trivial.md"]);
    const texts = checklist.items.map((i) => i.text);
    assert.ok(texts.some((t) => t.includes("scope creep")));
    assert.ok(texts.some((t) => t.includes("Commit messages")));
  });

  it("includes domain-specific items for hooks", () => {
    const checklist = generateChecklist([".hooks/my-hook.sh"]);
    const texts = checklist.items.map((i) => i.text);
    assert.ok(texts.some((t) => t.includes("Hook") || t.includes("hook")));
  });

  it("includes security items for security files", () => {
    const checklist = generateChecklist(["admiral/security/detector.ts"]);
    const texts = checklist.items.map((i) => i.text);
    assert.ok(texts.some((t) => t.includes("secret") || t.includes("eval")));
  });

  it("pre-fills auto-verifiable items", () => {
    const checklist = generateChecklist([".hooks/test.sh"]);
    const autoItems = checklist.items.filter((i) => i.checked);
    assert.ok(autoItems.length > 0, "Should have at least one pre-filled item");
  });

  it("does not duplicate items across categories", () => {
    const checklist = generateChecklist([
      ".hooks/pre_tool_use.sh",
      "admiral/security/scan.ts",
      "admiral/governance/sentinel.ts",
    ]);
    const texts = checklist.items.map((i) => i.text);
    const unique = new Set(texts);
    assert.equal(texts.length, unique.size, "No duplicate items");
  });

  it("handles empty file list", () => {
    const checklist = generateChecklist([]);
    assert.equal(checklist.overallRisk, "low");
    assert.ok(checklist.items.length > 0); // Universal items still present
    assert.equal(checklist.files.length, 0);
    assert.ok(checklist.summary.includes("0 files"));
  });

  it("accepts custom items", () => {
    const checklist = generateChecklist(["app.ts"], {
      customItems: [{ text: "Custom check passed", category: "custom" }],
    });
    const texts = checklist.items.map((i) => i.text);
    assert.ok(texts.includes("Custom check passed"));
  });

  it("summary counts risk levels correctly", () => {
    const checklist = generateChecklist([
      ".hooks/hook.sh",       // high
      "admiral/quality/q.ts", // medium
      "docs/guide.md",        // low
    ]);
    assert.ok(checklist.summary.includes("1 high-risk"));
    assert.ok(checklist.summary.includes("1 medium-risk"));
    assert.ok(checklist.summary.includes("1 low-risk"));
  });

  it("overall risk is the max across files", () => {
    // Mix of low and high → overall should be high
    const checklist = generateChecklist(["docs/readme.md", ".hooks/hook.sh"]);
    assert.equal(checklist.overallRisk, "high");
  });

  it("classifies files correctly in output", () => {
    const checklist = generateChecklist(["admiral/security/scan.ts"]);
    assert.equal(checklist.files.length, 1);
    assert.equal(checklist.files[0].risk, "high");
    assert.ok(checklist.files[0].categories.includes("security"));
  });
});

// ---------------------------------------------------------------------------
// Markdown Formatting
// ---------------------------------------------------------------------------

describe("formatChecklistMarkdown", () => {
  it("produces valid markdown with headers", () => {
    const checklist = generateChecklist([".hooks/hook.sh", "docs/guide.md"]);
    const md = formatChecklistMarkdown(checklist);

    assert.ok(md.includes("## Review Checklist"));
    assert.ok(md.includes("###"));
    assert.ok(md.includes("- ["));
    assert.ok(md.includes("| File | Risk |"));
  });

  it("marks checked items with [x]", () => {
    const checklist = generateChecklist([".hooks/hook.sh"]);
    const md = formatChecklistMarkdown(checklist);
    assert.ok(md.includes("- [x]"), "Should have at least one checked item");
  });

  it("marks unchecked items with [ ]", () => {
    const checklist = generateChecklist([".hooks/hook.sh"]);
    const md = formatChecklistMarkdown(checklist);
    assert.ok(md.includes("- [ ]"), "Should have at least one unchecked item");
  });

  it("includes file risk table", () => {
    const checklist = generateChecklist(["admiral/security/scan.ts"]);
    const md = formatChecklistMarkdown(checklist);
    assert.ok(md.includes("admiral/security/scan.ts"));
    assert.ok(md.includes("HIGH"));
  });

  it("handles empty checklist", () => {
    const checklist = generateChecklist([]);
    const md = formatChecklistMarkdown(checklist);
    assert.ok(md.includes("## Review Checklist"));
    assert.ok(md.includes("0 files"));
  });

  it("includes summary line", () => {
    const checklist = generateChecklist(["app.ts", "app.test.ts"]);
    const md = formatChecklistMarkdown(checklist);
    assert.ok(md.includes("2 files changed"));
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("Edge cases", () => {
  it("handles very long file paths", () => {
    const longPath = "a/".repeat(100) + "file.ts";
    const result = classifyFile(longPath);
    assert.ok(result);
    assert.equal(typeof result.risk, "string");
  });

  it("handles files with special characters", () => {
    const result = classifyFile("path/to/file (copy).test.ts");
    assert.ok(result);
  });

  it("handles Windows-style paths", () => {
    const result = classifyFile("admiral\\security\\scan.ts");
    // Should still classify — security is in the path
    assert.ok(result);
  });

  it("all items have non-empty text and category", () => {
    const checklist = generateChecklist([
      ".hooks/h.sh",
      "admiral/security/s.ts",
      "fleet/f.ts",
      "docs/d.md",
    ]);
    for (const item of checklist.items) {
      assert.ok(item.text.length > 0, `Item text should be non-empty`);
      assert.ok(item.category.length > 0, `Item category should be non-empty`);
      assert.equal(typeof item.checked, "boolean");
    }
  });
});
