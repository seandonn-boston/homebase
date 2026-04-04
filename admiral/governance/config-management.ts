/**
 * Governance Configuration Management (GP-09)
 *
 * Versioned governance configurations with full history,
 * diff capability, rollback, validation, and export/import.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConfigVersion {
  id: string;
  version: number;
  timestamp: string;
  author: string;
  rationale: string;
  config: GovernanceConfig;
  parentVersion: number | null;
}

export interface GovernanceConfig {
  policies: PolicyConfig[];
  alertThresholds: Record<string, number>;
  webhooks: WebhookConfig[];
  enforcements: Record<string, "enforce" | "monitor" | "disabled">;
}

export interface PolicyConfig {
  id: string;
  name: string;
  rules: unknown[];
}

export interface WebhookConfig {
  url: string;
  events: string[];
  enabled: boolean;
}

export interface ConfigDiff {
  fromVersion: number;
  toVersion: number;
  changes: ConfigChange[];
}

export interface ConfigChange {
  path: string;
  type: "added" | "removed" | "modified";
  oldValue: unknown;
  newValue: unknown;
}

// ---------------------------------------------------------------------------
// Configuration Store
// ---------------------------------------------------------------------------

export class GovernanceConfigManager {
  private versions: ConfigVersion[] = [];

  constructor(initialConfig?: GovernanceConfig) {
    if (initialConfig) {
      this.versions.push({
        id: randomUUID(),
        version: 1,
        timestamp: new Date().toISOString(),
        author: "system",
        rationale: "Initial configuration",
        config: structuredClone(initialConfig),
        parentVersion: null,
      });
    }
  }

  /**
   * Get the current (latest) configuration.
   */
  current(): ConfigVersion | null {
    return this.versions.length > 0 ? this.versions[this.versions.length - 1] : null;
  }

  /**
   * Get a specific version.
   */
  getVersion(version: number): ConfigVersion | null {
    return this.versions.find((v) => v.version === version) ?? null;
  }

  /**
   * List all versions (metadata only).
   */
  listVersions(): { version: number; timestamp: string; author: string; rationale: string }[] {
    return this.versions.map((v) => ({
      version: v.version,
      timestamp: v.timestamp,
      author: v.author,
      rationale: v.rationale,
    }));
  }

  /**
   * Update configuration (creates a new version).
   */
  update(
    config: GovernanceConfig,
    author: string,
    rationale: string,
  ): ConfigVersion {
    const errors = validateConfig(config);
    if (errors.length > 0) {
      throw new Error(`Invalid configuration: ${errors.join(", ")}`);
    }

    const newVersion = this.versions.length + 1;
    const entry: ConfigVersion = {
      id: randomUUID(),
      version: newVersion,
      timestamp: new Date().toISOString(),
      author,
      rationale,
      config: structuredClone(config),
      parentVersion: this.versions.length > 0 ? this.versions[this.versions.length - 1].version : null,
    };

    this.versions.push(entry);
    return entry;
  }

  /**
   * Rollback to a previous version (creates a new version pointing back).
   */
  rollback(targetVersion: number, author: string): ConfigVersion {
    const target = this.getVersion(targetVersion);
    if (!target) {
      throw new Error(`Version ${targetVersion} not found`);
    }

    return this.update(
      structuredClone(target.config),
      author,
      `Rollback to version ${targetVersion}`,
    );
  }

  /**
   * Diff two versions.
   */
  diff(fromVersion: number, toVersion: number): ConfigDiff {
    const from = this.getVersion(fromVersion);
    const to = this.getVersion(toVersion);

    if (!from || !to) {
      throw new Error("One or both versions not found");
    }

    const changes = diffObjects(from.config, to.config, "");

    return { fromVersion, toVersion, changes };
  }

  /**
   * Export configuration as JSON.
   */
  export(): string {
    return JSON.stringify({
      versions: this.versions,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Import configuration from JSON.
   */
  import(json: string, author: string): number {
    const data = JSON.parse(json) as { versions: ConfigVersion[] };
    if (!Array.isArray(data.versions)) {
      throw new Error("Invalid export format");
    }

    let imported = 0;
    for (const v of data.versions) {
      if (!this.getVersion(v.version)) {
        this.versions.push({
          ...v,
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          author: `${author} (imported)`,
        });
        imported++;
      }
    }

    // Re-sort by version number
    this.versions.sort((a, b) => a.version - b.version);
    return imported;
  }

  getVersionCount(): number {
    return this.versions.length;
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateConfig(config: GovernanceConfig): string[] {
  const errors: string[] = [];

  if (!Array.isArray(config.policies)) {
    errors.push("policies must be an array");
  }

  if (typeof config.alertThresholds !== "object" || config.alertThresholds === null) {
    errors.push("alertThresholds must be an object");
  }

  if (!Array.isArray(config.webhooks)) {
    errors.push("webhooks must be an array");
  } else {
    for (const wh of config.webhooks) {
      if (!wh.url) errors.push("webhook url is required");
    }
  }

  if (typeof config.enforcements !== "object" || config.enforcements === null) {
    errors.push("enforcements must be an object");
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Diffing
// ---------------------------------------------------------------------------

function diffObjects(a: unknown, b: unknown, path: string): ConfigChange[] {
  const changes: ConfigChange[] = [];

  if (typeof a !== typeof b) {
    changes.push({ path: path || "root", type: "modified", oldValue: a, newValue: b });
    return changes;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes.push({ path: path || "root", type: "modified", oldValue: a, newValue: b });
    }
    return changes;
  }

  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);

    for (const key of allKeys) {
      const subPath = path ? `${path}.${key}` : key;
      if (!(key in aObj)) {
        changes.push({ path: subPath, type: "added", oldValue: undefined, newValue: bObj[key] });
      } else if (!(key in bObj)) {
        changes.push({ path: subPath, type: "removed", oldValue: aObj[key], newValue: undefined });
      } else {
        changes.push(...diffObjects(aObj[key], bObj[key], subPath));
      }
    }
    return changes;
  }

  if (a !== b) {
    changes.push({ path: path || "root", type: "modified", oldValue: a, newValue: b });
  }

  return changes;
}
