/**
 * VS Code Extension Platform Adapter (PA-06)
 *
 * Scaffold adapter for the VS Code extension integration.
 * Mostly stubs — the actual extension implementation is external.
 * Provides type definitions for the extension config and a
 * minimal adapter that can be wired up when the extension exists.
 */

import {
  type AdapterEvent,
  type ContextInjection,
  type EventCallback,
  type HookPayload,
  type HookResult,
  type PlatformCapabilities,
  PlatformAdapter,
} from "../adapter-interface";

export interface VSCodeExtensionConfig {
  fleetStatusSidebar: boolean;
  agentIdentityStatusBar: boolean;
  alertNotifications: boolean;
  mcpServerUrl: string;
}

export class VSCodeAdapter extends PlatformAdapter {
  readonly platformId = "vscode";
  readonly platformName = "VS Code Extension";
  readonly capabilities: PlatformCapabilities = {
    hooks: false,
    contextInjection: true,
    toolPermissions: false,
    configLoading: true,
    eventEmission: false,
    subagentCoordination: false,
    mcpServer: true,
  };

  private config: Record<string, unknown> = {};
  private extensionConfig: VSCodeExtensionConfig = {
    fleetStatusSidebar: false,
    agentIdentityStatusBar: false,
    alertNotifications: false,
    mcpServerUrl: "",
  };
  private initialized = false;

  /** Exposed for testing */
  _lastInjectedContext = "";

  async initialize(config: Record<string, unknown>): Promise<void> {
    this.config = { ...config };

    if (config["extensionConfig"]) {
      this.extensionConfig = {
        ...this.extensionConfig,
        ...(config["extensionConfig"] as Partial<VSCodeExtensionConfig>),
      };
    }

    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    this.config = {};
    this.initialized = false;
  }

  async executeHook(_payload: HookPayload): Promise<HookResult> {
    return { allow: false, message: "Hooks not natively supported in VS Code extension" };
  }

  async injectContext(
    _agentId: string,
    context: ContextInjection,
  ): Promise<void> {
    if (!this.initialized) {
      throw new Error("Adapter not initialized");
    }

    // VS Code extension receives context via extension API
    this._lastInjectedContext = [
      ...context.standing,
      ...context.session,
      ...context.working,
    ].join("\n");
  }

  async checkToolPermission(
    _agentId: string,
    _tool: string,
  ): Promise<boolean> {
    return true;
  }

  async loadConfig(_path: string): Promise<Record<string, unknown>> {
    return { ...this.config };
  }

  on(_event: string, _callback: EventCallback): void {
    // Stub — extension handles its own events
  }

  emit(_event: AdapterEvent): void {
    // Stub — extension handles its own events
  }

  getExtensionConfig(): VSCodeExtensionConfig {
    return { ...this.extensionConfig };
  }
}
