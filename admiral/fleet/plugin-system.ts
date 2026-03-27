/**
 * Plugin System Architecture (IF-03)
 *
 * Extensibility model with plugin interfaces for hook, agent, and
 * integration extension points. Sandboxed with declared permissions.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PluginType = "hook" | "agent" | "integration";

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  type: PluginType;
  description: string;
  author: string;
  permissions: PluginPermission[];
  entryPoint: string;
  configSchema?: Record<string, unknown>;
}

export type PluginPermission =
  | "read:brain"
  | "write:brain"
  | "read:fleet"
  | "write:fleet"
  | "read:events"
  | "emit:events"
  | "execute:hooks"
  | "read:config"
  | "write:config"
  | "network:outbound";

export type PluginStatus = "installed" | "active" | "disabled" | "error";

export interface PluginInstance {
  manifest: PluginManifest;
  status: PluginStatus;
  installedAt: string;
  config: Record<string, unknown>;
  error: string | null;
}

export interface PluginSandbox {
  pluginId: string;
  grantedPermissions: Set<PluginPermission>;
  deniedOperations: string[];
}

// ---------------------------------------------------------------------------
// Plugin Registry
// ---------------------------------------------------------------------------

export class PluginRegistry {
  private plugins: Map<string, PluginInstance> = new Map();

  install(manifest: PluginManifest, config: Record<string, unknown> = {}): PluginInstance {
    const instance: PluginInstance = {
      manifest,
      status: "installed",
      installedAt: new Date().toISOString(),
      config,
      error: null,
    };
    this.plugins.set(manifest.id, instance);
    return instance;
  }

  activate(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.status === "error") return false;
    plugin.status = "active";
    return true;
  }

  disable(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;
    plugin.status = "disabled";
    return true;
  }

  uninstall(pluginId: string): boolean {
    return this.plugins.delete(pluginId);
  }

  get(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  listByType(type: PluginType): PluginInstance[] {
    return [...this.plugins.values()].filter((p) => p.manifest.type === type);
  }

  listActive(): PluginInstance[] {
    return [...this.plugins.values()].filter((p) => p.status === "active");
  }

  createSandbox(pluginId: string): PluginSandbox | null {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return null;
    return {
      pluginId,
      grantedPermissions: new Set(plugin.manifest.permissions),
      deniedOperations: [],
    };
  }

  checkPermission(sandbox: PluginSandbox, permission: PluginPermission): boolean {
    const allowed = sandbox.grantedPermissions.has(permission);
    if (!allowed) {
      sandbox.deniedOperations.push(`${permission} at ${new Date().toISOString()}`);
    }
    return allowed;
  }

  getPluginCount(): number {
    return this.plugins.size;
  }
}
