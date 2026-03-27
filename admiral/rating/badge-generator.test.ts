/**
 * Tests for Rating Badge Generator (RT-04)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateBadgeSvg,
  generateBadgeUrl,
  generateBadgeMarkdown,
  generateAllTierBadges,
} from "./badge-generator";
import type { RatingTier, CertificationSuffix } from "./rating-model";

// ---------------------------------------------------------------------------
// SVG Badge Generation
// ---------------------------------------------------------------------------

describe("generateBadgeSvg", () => {
  it("generates valid SVG for ADM-1", () => {
    const svg = generateBadgeSvg({ tier: "ADM-1", suffix: "" });
    assert.ok(svg.includes("<svg"));
    assert.ok(svg.includes("</svg>"));
    assert.ok(svg.includes("ADM-1"));
    assert.ok(svg.includes("Premier"));
  });

  it("generates valid SVG for ADM-5", () => {
    const svg = generateBadgeSvg({ tier: "ADM-5", suffix: "-SA" });
    assert.ok(svg.includes("ADM-5-SA"));
    assert.ok(svg.includes("Ungoverned"));
  });

  it("uses correct color for each tier", () => {
    const tierColors: [RatingTier, string][] = [
      ["ADM-1", "#FFD700"],
      ["ADM-2", "#4c1"],
      ["ADM-3", "#007ec6"],
      ["ADM-4", "#dfb317"],
      ["ADM-5", "#e05d44"],
    ];
    for (const [tier, color] of tierColors) {
      const svg = generateBadgeSvg({ tier, suffix: "-SA" });
      assert.ok(svg.includes(color), `${tier} should use color ${color}`);
    }
  });

  it("includes custom label", () => {
    const svg = generateBadgeSvg({ tier: "ADM-3", suffix: "-IA", label: "Governance" });
    assert.ok(svg.includes("Governance"));
  });

  it("escapes XML special characters", () => {
    const svg = generateBadgeSvg({ tier: "ADM-3", suffix: "-SA", label: "A & B" });
    assert.ok(svg.includes("A &amp; B"));
    assert.ok(!svg.includes("A & B"));
  });

  it("includes certification suffix", () => {
    const svg = generateBadgeSvg({ tier: "ADM-2", suffix: "-IA" });
    assert.ok(svg.includes("ADM-2-IA"));
  });

  it("has proper SVG structure", () => {
    const svg = generateBadgeSvg({ tier: "ADM-3", suffix: "-SA" });
    assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(svg.includes("clipPath"));
    assert.ok(svg.includes("<rect"));
    assert.ok(svg.includes("<text"));
  });
});

// ---------------------------------------------------------------------------
// Badge URL Generation
// ---------------------------------------------------------------------------

describe("generateBadgeUrl", () => {
  it("generates shields.io URL", () => {
    const url = generateBadgeUrl({ tier: "ADM-3", suffix: "-SA" });
    assert.ok(url.startsWith("https://img.shields.io/badge/"));
    assert.ok(url.includes("Admiral"));
    assert.ok(url.includes("ADM-3"));
  });

  it("encodes special characters", () => {
    const url = generateBadgeUrl({ tier: "ADM-1", suffix: "", label: "My Label" });
    assert.ok(url.includes("My%20Label"));
  });

  it("uses correct color names", () => {
    const url5 = generateBadgeUrl({ tier: "ADM-5", suffix: "-SA" });
    assert.ok(url5.endsWith("red"));

    const url2 = generateBadgeUrl({ tier: "ADM-2", suffix: "-SA" });
    assert.ok(url2.endsWith("green"));
  });
});

// ---------------------------------------------------------------------------
// Markdown Badge
// ---------------------------------------------------------------------------

describe("generateBadgeMarkdown", () => {
  it("produces markdown image syntax", () => {
    const md = generateBadgeMarkdown({ tier: "ADM-4", suffix: "-SA" });
    assert.ok(md.startsWith("!["));
    assert.ok(md.includes("]("));
    assert.ok(md.includes("https://img.shields.io"));
  });

  it("includes alt text with rating", () => {
    const md = generateBadgeMarkdown({ tier: "ADM-2", suffix: "-IA" });
    assert.ok(md.includes("ADM-2-IA"));
    assert.ok(md.includes("Certified"));
  });
});

// ---------------------------------------------------------------------------
// Batch Generation
// ---------------------------------------------------------------------------

describe("generateAllTierBadges", () => {
  it("generates badges for all 5 tiers", () => {
    const badges = generateAllTierBadges("-SA");
    assert.equal(badges.size, 5);
    assert.ok(badges.has("ADM-1"));
    assert.ok(badges.has("ADM-5"));
  });

  it("all badges are valid SVG", () => {
    const badges = generateAllTierBadges();
    for (const [tier, svg] of badges) {
      assert.ok(svg.includes("<svg"), `${tier} badge should be valid SVG`);
      assert.ok(svg.includes("</svg>"), `${tier} badge should close SVG tag`);
    }
  });

  it("each badge has the correct tier", () => {
    const badges = generateAllTierBadges("-SA");
    for (const [tier, svg] of badges) {
      assert.ok(svg.includes(tier), `Badge should contain ${tier}`);
    }
  });
});
