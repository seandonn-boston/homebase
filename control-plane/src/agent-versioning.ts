/**
 * Admiral Framework — Agent Versioning (IF-01)
 *
 * Version agent definitions with semantic versioning, a version registry,
 * and rollback support. Running sessions are pinned to the version active
 * at session start — mid-session changes never affect in-flight work.
 */

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface AgentDefinition {
  name: string;
  role: string;
  capabilities: string[];
  authorityTier: number;
  config: Record<string, unknown>;
}

export interface VersionedAgent {
  agentId: string;
  version: SemanticVersion;
  definition: AgentDefinition;
  createdAt: string;
  changelog: string;
  deprecated: boolean;
}

export interface SessionPin {
  sessionId: string;
  agentId: string;
  pinnedVersion: SemanticVersion;
  pinnedAt: string;
}

export type VersionBump = "major" | "minor" | "patch";

export function formatVersion(v: SemanticVersion): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

export function parseVersion(s: string): SemanticVersion {
  const parts = s.split(".");
  if (parts.length !== 3) throw new Error(`Invalid version: ${s}`);
  const [major, minor, patch] = parts.map(Number);
  if ([major, minor, patch].some((n) => Number.isNaN(n) || n < 0)) {
    throw new Error(`Invalid version: ${s}`);
  }
  return { major, minor, patch };
}

export function compareVersions(a: SemanticVersion, b: SemanticVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function bumpVersion(v: SemanticVersion, bump: VersionBump): SemanticVersion {
  switch (bump) {
    case "major":
      return { major: v.major + 1, minor: 0, patch: 0 };
    case "minor":
      return { major: v.major, minor: v.minor + 1, patch: 0 };
    case "patch":
      return { major: v.major, minor: v.minor, patch: v.patch + 1 };
  }
}

const MAX_VERSIONS_PER_AGENT = 500;

/**
 * Registry that tracks agent definition versions and session pins.
 */
export class AgentVersionRegistry {
  private versions: Map<string, VersionedAgent[]> = new Map();
  private sessionPins: Map<string, SessionPin[]> = new Map();

  /**
   * Register a brand-new agent at version 1.0.0.
   */
  register(
    agentId: string,
    definition: AgentDefinition,
    changelog = "Initial version",
  ): VersionedAgent {
    if (this.versions.has(agentId)) {
      throw new Error(`Agent '${agentId}' already registered. Use publish() to add versions.`);
    }
    const entry: VersionedAgent = {
      agentId,
      version: { major: 1, minor: 0, patch: 0 },
      definition,
      createdAt: new Date().toISOString(),
      changelog,
      deprecated: false,
    };
    this.versions.set(agentId, [entry]);
    return entry;
  }

  /**
   * Publish a new version of an existing agent.
   */
  publish(
    agentId: string,
    definition: AgentDefinition,
    bump: VersionBump,
    changelog: string,
  ): VersionedAgent {
    const history = this.versions.get(agentId);
    if (!history || history.length === 0) {
      throw new Error(`Agent '${agentId}' not registered.`);
    }
    if (history.length >= MAX_VERSIONS_PER_AGENT) {
      throw new Error(`Version limit (${MAX_VERSIONS_PER_AGENT}) reached for '${agentId}'.`);
    }
    const latest = history[history.length - 1];
    const nextVersion = bumpVersion(latest.version, bump);
    const entry: VersionedAgent = {
      agentId,
      version: nextVersion,
      definition,
      createdAt: new Date().toISOString(),
      changelog,
      deprecated: false,
    };
    history.push(entry);
    return entry;
  }

  /**
   * Get the latest non-deprecated version of an agent.
   */
  getLatest(agentId: string): VersionedAgent | undefined {
    const history = this.versions.get(agentId);
    if (!history) return undefined;
    for (let i = history.length - 1; i >= 0; i--) {
      if (!history[i].deprecated) return history[i];
    }
    return undefined;
  }

  /**
   * Get a specific version of an agent.
   */
  getVersion(agentId: string, version: string): VersionedAgent | undefined {
    const history = this.versions.get(agentId);
    if (!history) return undefined;
    const target = parseVersion(version);
    return history.find((v) => compareVersions(v.version, target) === 0);
  }

  /**
   * List all versions of an agent.
   */
  listVersions(agentId: string): VersionedAgent[] {
    return [...(this.versions.get(agentId) ?? [])];
  }

  /**
   * Deprecate a specific version (it remains available to pinned sessions).
   */
  deprecate(agentId: string, version: string): boolean {
    const entry = this.getVersion(agentId, version);
    if (!entry) return false;
    entry.deprecated = true;
    return true;
  }

  /**
   * Pin a session to the current latest version of an agent.
   * This ensures mid-session changes do not affect the running session.
   */
  pinSession(sessionId: string, agentId: string): SessionPin | undefined {
    const latest = this.getLatest(agentId);
    if (!latest) return undefined;
    const pin: SessionPin = {
      sessionId,
      agentId,
      pinnedVersion: { ...latest.version },
      pinnedAt: new Date().toISOString(),
    };
    const pins = this.sessionPins.get(sessionId) ?? [];
    // Replace existing pin for same agent
    const idx = pins.findIndex((p) => p.agentId === agentId);
    if (idx >= 0) {
      pins[idx] = pin;
    } else {
      pins.push(pin);
    }
    this.sessionPins.set(sessionId, pins);
    return pin;
  }

  /**
   * Resolve the agent definition a session should use — pinned version
   * takes precedence over latest.
   */
  resolveForSession(sessionId: string, agentId: string): VersionedAgent | undefined {
    const pins = this.sessionPins.get(sessionId);
    if (pins) {
      const pin = pins.find((p) => p.agentId === agentId);
      if (pin) {
        return this.getVersion(agentId, formatVersion(pin.pinnedVersion));
      }
    }
    return this.getLatest(agentId);
  }

  /**
   * Release session pins (call on session end).
   */
  releaseSession(sessionId: string): void {
    this.sessionPins.delete(sessionId);
  }

  /**
   * Rollback: set the latest version to a previous one by publishing a
   * copy of the target version as a new patch.
   */
  rollback(agentId: string, targetVersion: string): VersionedAgent {
    const target = this.getVersion(agentId, targetVersion);
    if (!target) {
      throw new Error(`Version '${targetVersion}' not found for '${agentId}'.`);
    }
    return this.publish(
      agentId,
      { ...target.definition },
      "patch",
      `Rollback to ${formatVersion(target.version)}`,
    );
  }

  /**
   * List all registered agent IDs.
   */
  listAgents(): string[] {
    return [...this.versions.keys()];
  }
}
