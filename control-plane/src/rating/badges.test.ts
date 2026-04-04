/**
 * Tests for Rating Badges (RT-04)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateBadge, generateBadgeMarkdown, generateDetailedBadge } from "./badges";

describe("generateBadge", () => {
  it("returns a string starting with <svg", () => {
    const svg = generateBadge("ADM-2");
    assert.ok(svg.startsWith("<svg"), "starts with <svg");
  });

  it("contains the tier code in the output", () => {
    for (const tier of ["ADM-1", "ADM-2", "ADM-3", "ADM-4", "ADM-5"] as const) {
      const svg = generateBadge(tier);
      assert.ok(svg.includes(tier), `SVG contains tier code ${tier}`);
    }
  });

  it("includes -SA suffix when provided", () => {
    const svg = generateBadge("ADM-2", "-SA");
    assert.ok(svg.includes("ADM-2-SA"), "includes ADM-2-SA");
  });

  it("includes -IA suffix when provided", () => {
    const svg = generateBadge("ADM-3", "-IA");
    assert.ok(svg.includes("ADM-3-IA"), "includes ADM-3-IA");
  });

  it("uses gold color for ADM-1", () => {
    const svg = generateBadge("ADM-1");
    assert.ok(svg.includes("#c8a400"), "ADM-1 uses gold color");
  });

  it("uses green color for ADM-2", () => {
    const svg = generateBadge("ADM-2");
    assert.ok(svg.includes("#2ea44f"), "ADM-2 uses green color");
  });

  it("uses blue color for ADM-3", () => {
    const svg = generateBadge("ADM-3");
    assert.ok(svg.includes("#0075ca"), "ADM-3 uses blue color");
  });

  it("uses yellow color for ADM-4", () => {
    const svg = generateBadge("ADM-4");
    assert.ok(svg.includes("#e3b341"), "ADM-4 uses yellow color");
  });

  it("uses red color for ADM-5", () => {
    const svg = generateBadge("ADM-5");
    assert.ok(svg.includes("#cf222e"), "ADM-5 uses red color");
  });

  it("includes aria-label for accessibility", () => {
    const svg = generateBadge("ADM-2", "-SA");
    assert.ok(svg.includes("aria-label="), "has aria-label");
    assert.ok(svg.includes("ADM-2-SA"), "aria-label contains rating");
  });

  it("includes title element", () => {
    const svg = generateBadge("ADM-1");
    assert.ok(svg.includes("<title>"), "has title element");
    assert.ok(svg.includes("Premier"), "title includes tier name");
  });

  it("accepts custom label option", () => {
    const svg = generateBadge("ADM-3", "", { label: "Fleet Rating" });
    assert.ok(svg.includes("Fleet Rating"), "custom label included");
  });

  it("produces valid SVG structure (has closing tag)", () => {
    const svg = generateBadge("ADM-2");
    assert.ok(svg.trimEnd().endsWith("</svg>"), "ends with </svg>");
  });

  it("no suffix produces plain tier code", () => {
    const svg = generateBadge("ADM-2", "");
    assert.ok(svg.includes(">ADM-2<"), "plain tier code in SVG text element");
  });
});

describe("generateDetailedBadge", () => {
  it("returns SVG with tier name", () => {
    const svg = generateDetailedBadge("ADM-2");
    assert.ok(svg.includes("Governed"), "includes tier name Governed");
  });

  it("includes score when provided", () => {
    const svg = generateDetailedBadge("ADM-2", "-SA", 85);
    assert.ok(svg.includes("85/100"), "includes score");
  });

  it("omits score text when not provided", () => {
    const svg = generateDetailedBadge("ADM-3");
    assert.ok(!svg.includes("/100"), "no score text without score");
  });
});

describe("generateBadgeMarkdown", () => {
  it("returns markdown image syntax", () => {
    const md = generateBadgeMarkdown("ADM-2", "-SA");
    assert.ok(md.startsWith("!["), "starts with markdown image syntax");
    assert.ok(md.includes("ADM-2-SA"), "includes rating");
  });

  it("uses custom alt text when provided", () => {
    const md = generateBadgeMarkdown("ADM-1", "", "My Fleet");
    assert.ok(md.includes("My Fleet"), "custom alt text");
  });
});
