/**
 * Platform Adapter Interface (PA-01)
 *
 * Abstract interface for platform adapters that translate Admiral Framework
 * governance into platform-specific formats. Each supported IDE/runtime
 * implements this interface to receive hooks, context injection, tool
 * permissions, and event emission in its native format.
 */

// ── Core types ──────────────────────────────────────────────────────

export interface PlatformCapabilities {
  hooks: boolean;
  contextInjection: boolean;
  toolPermissions: boolean;
  configLoading: boolean;
  eventEmission: boolean;
  subagentCoordination: boolean;
  mcpServer: boolean;
}

export interface AdapterEvent {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export type EventCallback = (event: AdapterEvent) => void;

export interface HookPayload {
  hookName: string;
  event: string;
  agentId: string;
  data: Record<string, unknown>;
}

export interface HookResult {
  allow: boolean;
  message?: string;
  modifiedData?: Record<string, unknown>;
}

export interface ContextInjection {
  /** Identity, constraints, standing orders */
  standing: string[];
  /** Project context */
  session: string[];
  /** Task context */
  working: string[];
  /** Total token budget */
  totalBudget: number;
}

// ── Abstract adapter ────────────────────────────────────────────────

export abstract class PlatformAdapter {
  abstract readonly platformId: string;
  abstract readonly platformName: string;
  abstract readonly capabilities: PlatformCapabilities;

  // Lifecycle
  abstract initialize(config: Record<string, unknown>): Promise<void>;
  abstract shutdown(): Promise<void>;

  // Hooks
  abstract executeHook(payload: HookPayload): Promise<HookResult>;

  // Context
  abstract injectContext(
    agentId: string,
    context: ContextInjection,
  ): Promise<void>;

  // Tool permissions
  abstract checkToolPermission(
    agentId: string,
    tool: string,
  ): Promise<boolean>;

  // Config
  abstract loadConfig(path: string): Promise<Record<string, unknown>>;

  // Events
  abstract on(event: string, callback: EventCallback): void;
  abstract emit(event: AdapterEvent): void;
}

// ── PA-07: Capability matrix types ──────────────────────────────────

export type CapabilityLevel = "full" | "partial" | "none";

export interface PlatformCapabilityEntry {
  platform: string;
  hooks: CapabilityLevel;
  contextInjection: CapabilityLevel;
  toolPermissions: CapabilityLevel;
  mcpServer: CapabilityLevel;
  subagents: CapabilityLevel;
  notes: string;
}

export interface CapabilityMatrix {
  platforms: PlatformCapabilityEntry[];
}
