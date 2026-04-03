/**
 * Admiral Framework — Rating Badges (RT-04)
 *
 * Generate SVG badges for rating tiers.
 * Colors: gold (ADM-1), green (ADM-2), blue (ADM-3), yellow (ADM-4), red (ADM-5)
 * Certification suffixes: -SA (self-assessed), -IA (independently assessed)
 * generateBadge(tier, suffix?) returns SVG string.
 *
 * Zero external dependencies.
 */

import type { CertificationSuffix, RatingTierCode } from "./types";
import { RATING_TIERS } from "./types";

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

interface BadgeColors {
  /** Left section (label) background */
  labelBg: string;
  /** Right section (value) background */
  valueBg: string;
  /** Text color for the value section */
  valueText: string;
}

const TIER_COLORS: Record<RatingTierCode, BadgeColors> = {
  "ADM-1": {
    labelBg: "#555",
    valueBg: "#c8a400",   // gold
    valueText: "#fff",
  },
  "ADM-2": {
    labelBg: "#555",
    valueBg: "#2ea44f",   // green
    valueText: "#fff",
  },
  "ADM-3": {
    labelBg: "#555",
    valueBg: "#0075ca",   // blue
    valueText: "#fff",
  },
  "ADM-4": {
    labelBg: "#555",
    valueBg: "#e3b341",   // yellow
    valueText: "#222",
  },
  "ADM-5": {
    labelBg: "#555",
    valueBg: "#cf222e",   // red
    valueText: "#fff",
  },
};

// ---------------------------------------------------------------------------
// Badge generation
// ---------------------------------------------------------------------------

export interface BadgeOptions {
  /** Override the label text (default: "Admiral Rating") */
  label?: string;
  /** Font size in px (default: 11) */
  fontSize?: number;
}

/**
 * Generate an SVG badge for a given rating tier and optional certification suffix.
 *
 * @param tier - ADM tier code (ADM-1 through ADM-5)
 * @param suffix - certification suffix: "-SA", "-IA", or "" for full certification
 * @param options - optional badge customization
 * @returns SVG string
 */
export function generateBadge(
  tier: RatingTierCode,
  suffix: CertificationSuffix = "",
  options: BadgeOptions = {},
): string {
  const tierData = RATING_TIERS[tier];
  const colors = TIER_COLORS[tier];
  const label = options.label ?? "Admiral Rating";
  const fontSize = options.fontSize ?? 11;

  const valueText = `${tier}${suffix}`;
  const tierName = tierData.name;

  // Approximate character widths for padding calculation
  const labelWidth = approximateTextWidth(label, fontSize) + 10;
  const valueWidth = approximateTextWidth(valueText, fontSize) + 10;
  const totalWidth = labelWidth + valueWidth;
  const height = 20;

  const labelX = Math.round(labelWidth / 2);
  const valueX = labelWidth + Math.round(valueWidth / 2);
  const textY = Math.round(height / 2) + 1;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${valueText}">
  <title>${label}: ${valueText} (${tierName})</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="${colors.labelBg}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${colors.valueBg}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="${fontSize}">
    <text x="${labelX}" y="${textY}" fill="#010101" fill-opacity=".3" clip-path="url(#r)">${escapeXml(label)}</text>
    <text x="${labelX}" y="${textY - 1}" clip-path="url(#r)">${escapeXml(label)}</text>
  </g>
  <g text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="${fontSize}">
    <text x="${valueX}" y="${textY}" fill="#010101" fill-opacity=".3" clip-path="url(#r)" font-weight="bold">${escapeXml(valueText)}</text>
    <text x="${valueX}" y="${textY - 1}" fill="${colors.valueText}" clip-path="url(#r)" font-weight="bold">${escapeXml(valueText)}</text>
  </g>
</svg>`;
}

/**
 * Generate a detailed badge with tier name subtitle.
 */
export function generateDetailedBadge(
  tier: RatingTierCode,
  suffix: CertificationSuffix = "",
  score?: number,
): string {
  const tierData = RATING_TIERS[tier];
  const colors = TIER_COLORS[tier];
  const label = "Admiral Rating";
  const valueText = `${tier}${suffix}`;
  const scoreText = score !== undefined ? ` · ${score}/100` : "";
  const subText = `${tierData.name}${scoreText}`;

  const labelWidth = approximateTextWidth(label, 11) + 10;
  const valueWidth = Math.max(
    approximateTextWidth(valueText, 11),
    approximateTextWidth(subText, 9),
  ) + 12;
  const totalWidth = labelWidth + valueWidth;
  const height = 28;

  const labelX = Math.round(labelWidth / 2);
  const valueX = labelWidth + Math.round(valueWidth / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${valueText}">
  <title>${label}: ${valueText} — ${tierData.name}</title>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="${colors.labelBg}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${colors.valueBg}"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif">
    <text x="${labelX}" y="13" font-size="11" clip-path="url(#r)">${escapeXml(label)}</text>
    <text x="${valueX}" y="12" font-size="11" font-weight="bold" fill="${colors.valueText}" clip-path="url(#r)">${escapeXml(valueText)}</text>
    <text x="${valueX}" y="22" font-size="9" fill="${colors.valueText}" fill-opacity="0.85" clip-path="url(#r)">${escapeXml(subText)}</text>
  </g>
</svg>`;
}

/**
 * Generate an HTML img tag referencing a badge URL (for shield.io-style use).
 */
export function generateBadgeMarkdown(
  tier: RatingTierCode,
  suffix: CertificationSuffix = "",
  altText?: string,
): string {
  const label = altText ?? `Admiral Rating ${tier}${suffix}`;
  const tierData = RATING_TIERS[tier];
  return `![${label}](https://img.shields.io/badge/Admiral%20Rating-${tier}${suffix}-${SHIELD_COLORS[tier]}?style=flat-square) <!-- ${tierData.name} -->`;
}

const SHIELD_COLORS: Record<RatingTierCode, string> = {
  "ADM-1": "gold",
  "ADM-2": "green",
  "ADM-3": "blue",
  "ADM-4": "yellow",
  "ADM-5": "red",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Approximate text pixel width for a given string and font size */
function approximateTextWidth(text: string, fontSize: number): number {
  // Average character width ratio for common fonts at 11px ~ 0.6
  const ratio = fontSize * 0.6;
  return Math.round(text.length * ratio);
}

/** Escape XML special characters */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
