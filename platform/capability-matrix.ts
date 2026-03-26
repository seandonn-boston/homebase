/**
 * Platform Capability Matrix (PA-07)
 *
 * Static capability matrix describing what each platform can and cannot do.
 * Used for gap analysis, migration planning, and runtime capability checks.
 */

import type {
  CapabilityLevel,
  CapabilityMatrix,
  PlatformCapabilityEntry,
} from "./adapter-interface";

export const CAPABILITY_MATRIX: CapabilityMatrix = {
  platforms: [
    {
      platform: "Claude Code",
      hooks: "full",
      contextInjection: "full",
      toolPermissions: "full",
      mcpServer: "full",
      subagents: "full",
      notes: "Native platform",
    },
    {
      platform: "Cursor",
      hooks: "none",
      contextInjection: "partial",
      toolPermissions: "none",
      mcpServer: "full",
      subagents: "none",
      notes: "Governance via .cursorrules",
    },
    {
      platform: "Windsurf",
      hooks: "none",
      contextInjection: "partial",
      toolPermissions: "none",
      mcpServer: "full",
      subagents: "none",
      notes: "Governance via .windsurfrules",
    },
    {
      platform: "Headless API",
      hooks: "full",
      contextInjection: "full",
      toolPermissions: "full",
      mcpServer: "full",
      subagents: "none",
      notes: "For CI/CD pipelines",
    },
    {
      platform: "VS Code",
      hooks: "partial",
      contextInjection: "partial",
      toolPermissions: "partial",
      mcpServer: "full",
      subagents: "none",
      notes: "Extension-based",
    },
  ],
};

const PLATFORM_ID_MAP: Record<string, string> = {
  "claude-code": "Claude Code",
  cursor: "Cursor",
  windsurf: "Windsurf",
  headless: "Headless API",
  vscode: "VS Code",
};

/**
 * Return the full capability matrix.
 */
export function getCapabilityMatrix(): CapabilityMatrix {
  return CAPABILITY_MATRIX;
}

/**
 * Look up a single platform's capabilities by platformId.
 */
export function getPlatformCapabilities(
  platformId: string,
): PlatformCapabilityEntry | undefined {
  const displayName = PLATFORM_ID_MAP[platformId] ?? platformId;
  return CAPABILITY_MATRIX.platforms.find(
    (p) => p.platform === displayName || p.platform === platformId,
  );
}

/**
 * Return a list of capability gaps for a given platform.
 */
export function getGapAnalysis(platformId: string): string[] {
  const entry = getPlatformCapabilities(platformId);
  if (!entry) {
    return [`Platform "${platformId}" not found in capability matrix`];
  }

  const gaps: string[] = [];
  const fields: (keyof PlatformCapabilityEntry)[] = [
    "hooks",
    "contextInjection",
    "toolPermissions",
    "mcpServer",
    "subagents",
  ];

  for (const field of fields) {
    const value = entry[field] as CapabilityLevel;
    if (value === "none") {
      gaps.push(`${field}: not supported`);
    } else if (value === "partial") {
      gaps.push(`${field}: partial support only`);
    }
  }

  return gaps;
}
