/**
 * Rating Badge Generator (RT-04)
 *
 * Generates SVG badges displaying the current Admiral rating
 * with tier-appropriate color coding and certification suffix.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { type RatingTier, TIER_DEFINITIONS, TIER_COLORS, isValidTier, type CertificationSuffix } from "./rating-model";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BadgeOptions {
  tier: RatingTier;
  suffix: CertificationSuffix;
  label?: string;
}

// ---------------------------------------------------------------------------
// Color Mapping
// ---------------------------------------------------------------------------

const SVG_COLORS: ReadonlyMap<string, string> = new Map([
  ["gold", "#FFD700"],
  ["green", "#4c1"],
  ["blue", "#007ec6"],
  ["yellow", "#dfb317"],
  ["red", "#e05d44"],
]);

function getColorHex(tier: RatingTier): string {
  const colorName = TIER_COLORS.get(tier) ?? "red";
  return SVG_COLORS.get(colorName) ?? "#999";
}

// ---------------------------------------------------------------------------
// SVG Badge Generation
// ---------------------------------------------------------------------------

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Generate an SVG badge in the shields.io flat style.
 */
export function generateBadgeSvg(opts: BadgeOptions): string {
  const label = opts.label ?? "Admiral";
  const tierDef = TIER_DEFINITIONS.get(opts.tier);
  const grade = tierDef?.grade ?? "Unknown";
  const displayText = `${opts.tier}${opts.suffix} ${grade}`;
  const color = getColorHex(opts.tier);

  // Calculate widths (approximate: 6.5px per character + padding)
  const labelWidth = Math.round(label.length * 6.5 + 12);
  const valueWidth = Math.round(displayText.length * 6.5 + 12);
  const totalWidth = labelWidth + valueWidth;

  const labelX = labelWidth / 2;
  const valueX = labelWidth + valueWidth / 2;

  const escapedLabel = escapeXml(label);
  const escapedValue = escapeXml(displayText);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${escapedLabel}: ${escapedValue}">
  <title>${escapedLabel}: ${escapedValue}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelX}" y="15" fill="#010101" fill-opacity=".3">${escapedLabel}</text>
    <text x="${labelX}" y="14" fill="#fff">${escapedLabel}</text>
    <text x="${valueX}" y="15" fill="#010101" fill-opacity=".3">${escapedValue}</text>
    <text x="${valueX}" y="14" fill="#fff">${escapedValue}</text>
  </g>
</svg>`;
}

/**
 * Generate a badge URL using shields.io endpoint format.
 */
export function generateBadgeUrl(opts: BadgeOptions): string {
  const label = encodeURIComponent(opts.label ?? "Admiral");
  const tierDef = TIER_DEFINITIONS.get(opts.tier);
  const grade = tierDef?.grade ?? "Unknown";
  const message = encodeURIComponent(`${opts.tier}${opts.suffix} ${grade}`);
  const colorName = TIER_COLORS.get(opts.tier) ?? "red";
  // Map our color names to shields.io colors
  const shieldsColor = colorName === "gold" ? "yellow" : colorName;
  return `https://img.shields.io/badge/${label}-${message}-${shieldsColor}`;
}

/**
 * Generate a markdown badge embed.
 */
export function generateBadgeMarkdown(opts: BadgeOptions): string {
  const url = generateBadgeUrl(opts);
  const tierDef = TIER_DEFINITIONS.get(opts.tier);
  const alt = `Admiral Rating: ${opts.tier}${opts.suffix} ${tierDef?.grade ?? ""}`;
  return `![${alt}](${url})`;
}

// ---------------------------------------------------------------------------
// Batch Generation
// ---------------------------------------------------------------------------

/**
 * Generate badges for all 5 tiers (useful for documentation).
 */
export function generateAllTierBadges(suffix: CertificationSuffix = "-SA"): Map<RatingTier, string> {
  const tiers: RatingTier[] = ["ADM-1", "ADM-2", "ADM-3", "ADM-4", "ADM-5"];
  const result = new Map<RatingTier, string>();
  for (const tier of tiers) {
    result.set(tier, generateBadgeSvg({ tier, suffix }));
  }
  return result;
}
