/**
 * Agent Versioning (IF-01)
 *
 * Semantic versioning for agent definitions so updates do not break
 * running sessions. Version registry with changelogs and rollback.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface AgentVersion {
  agentId: string;
  version: SemanticVersion;
  versionString: string;
  timestamp: string;
  changelog: string;
  definition: Record<string, unknown>;
  deprecated: boolean;
}

export interface VersionRegistryEntry {
  agentId: string;
  versions: AgentVersion[];
  current: SemanticVersion;
}

// ---------------------------------------------------------------------------
// Version Utilities
// ---------------------------------------------------------------------------

export function parseVersion(versionStr: string): SemanticVersion | null {
  const match = versionStr.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

export function formatVersion(v: SemanticVersion): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

export function compareVersions(a: SemanticVersion, b: SemanticVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

export function isBreakingChange(from: SemanticVersion, to: SemanticVersion): boolean {
  return to.major > from.major;
}

export function bumpVersion(
  current: SemanticVersion,
  type: "major" | "minor" | "patch",
): SemanticVersion {
  switch (type) {
    case "major": return { major: current.major + 1, minor: 0, patch: 0 };
    case "minor": return { major: current.major, minor: current.minor + 1, patch: 0 };
    case "patch": return { major: current.major, minor: current.minor, patch: current.patch + 1 };
  }
}

// ---------------------------------------------------------------------------
// Version Registry
// ---------------------------------------------------------------------------

export class AgentVersionRegistry {
  private registry: Map<string, VersionRegistryEntry> = new Map();

  register(
    agentId: string,
    definition: Record<string, unknown>,
    changelog: string = "Initial version",
  ): AgentVersion {
    const version: SemanticVersion = { major: 1, minor: 0, patch: 0 };
    const entry: AgentVersion = {
      agentId,
      version,
      versionString: formatVersion(version),
      timestamp: new Date().toISOString(),
      changelog,
      definition: { ...definition },
      deprecated: false,
    };

    this.registry.set(agentId, {
      agentId,
      versions: [entry],
      current: version,
    });

    return entry;
  }

  update(
    agentId: string,
    bumpType: "major" | "minor" | "patch",
    definition: Record<string, unknown>,
    changelog: string,
  ): AgentVersion | null {
    const reg = this.registry.get(agentId);
    if (!reg) return null;

    const newVersion = bumpVersion(reg.current, bumpType);
    const entry: AgentVersion = {
      agentId,
      version: newVersion,
      versionString: formatVersion(newVersion),
      timestamp: new Date().toISOString(),
      changelog,
      definition: { ...definition },
      deprecated: false,
    };

    reg.versions.push(entry);
    reg.current = newVersion;
    return entry;
  }

  getCurrent(agentId: string): AgentVersion | null {
    const reg = this.registry.get(agentId);
    if (!reg || reg.versions.length === 0) return null;
    return reg.versions[reg.versions.length - 1];
  }

  getVersion(agentId: string, versionStr: string): AgentVersion | null {
    const reg = this.registry.get(agentId);
    if (!reg) return null;
    return reg.versions.find((v) => v.versionString === versionStr) ?? null;
  }

  rollback(agentId: string, targetVersionStr: string): AgentVersion | null {
    const reg = this.registry.get(agentId);
    if (!reg) return null;

    const target = reg.versions.find((v) => v.versionString === targetVersionStr);
    if (!target) return null;

    const rollbackVersion = bumpVersion(reg.current, "patch");
    const entry: AgentVersion = {
      agentId,
      version: rollbackVersion,
      versionString: formatVersion(rollbackVersion),
      timestamp: new Date().toISOString(),
      changelog: `Rollback to ${targetVersionStr}`,
      definition: { ...target.definition },
      deprecated: false,
    };

    reg.versions.push(entry);
    reg.current = rollbackVersion;
    return entry;
  }

  deprecate(agentId: string, versionStr: string): boolean {
    const reg = this.registry.get(agentId);
    if (!reg) return false;
    const version = reg.versions.find((v) => v.versionString === versionStr);
    if (!version) return false;
    version.deprecated = true;
    return true;
  }

  listAgents(): string[] {
    return [...this.registry.keys()];
  }

  getChangelog(agentId: string): string[] {
    const reg = this.registry.get(agentId);
    if (!reg) return [];
    return reg.versions.map(
      (v) => `${v.versionString} (${v.timestamp.split("T")[0]}): ${v.changelog}`,
    );
  }

  getAgentCount(): number {
    return this.registry.size;
  }
}
