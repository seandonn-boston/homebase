/**
 * Admiral Framework — Configuration Management (GP-09)
 *
 * Versioned, diff-able, rollback-capable configuration management.
 * Every change creates a new version with timestamp, author, and rationale.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import type * as http from "node:http";
import { pathOnly, readJsonBody, sendJson } from "./http-helpers";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ConfigValue =
  | string
  | number
  | boolean
  | null
  | ConfigValue[]
  | { [key: string]: ConfigValue };

export type ConfigMap = Record<string, ConfigValue>;

export interface ConfigVersion {
  version: number;
  timestamp: string;
  author: string;
  rationale: string;
  config: ConfigMap;
  /** ID of the version this was rolled back from (if applicable) */
  rolledBackFromVersion?: number;
}

export interface ConfigDiff {
  added: Record<string, ConfigValue>;
  removed: Record<string, ConfigValue>;
  changed: Record<string, { from: ConfigValue; to: ConfigValue }>;
  unchanged: string[];
}

export interface ConfigSchema {
  /** Keys and their expected types */
  fields: Record<
    string,
    {
      type: "string" | "number" | "boolean" | "object" | "array";
      required?: boolean;
      minValue?: number;
      maxValue?: number;
      minLength?: number;
      maxLength?: number;
      enum?: ConfigValue[];
    }
  >;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ExportedConfigSet {
  exportedAt: string;
  versions: ConfigVersion[];
  currentVersion: number;
}

// ---------------------------------------------------------------------------
// Helper — deep clone a config map
// ---------------------------------------------------------------------------

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// ---------------------------------------------------------------------------
// Helper — check structural equality of two ConfigValue instances
// ---------------------------------------------------------------------------

function configEqual(a: ConfigValue, b: ConfigValue): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---------------------------------------------------------------------------
// Helper — compute diff between two config maps
// ---------------------------------------------------------------------------

function computeDiff(from: ConfigMap, to: ConfigMap): ConfigDiff {
  const added: Record<string, ConfigValue> = {};
  const removed: Record<string, ConfigValue> = {};
  const changed: Record<string, { from: ConfigValue; to: ConfigValue }> = {};
  const unchanged: string[] = [];

  const allKeys = new Set([...Object.keys(from), ...Object.keys(to)]);

  for (const key of allKeys) {
    const inFrom = Object.hasOwn(from, key);
    const inTo = Object.hasOwn(to, key);

    if (!inFrom && inTo) {
      added[key] = deepClone(to[key]);
    } else if (inFrom && !inTo) {
      removed[key] = deepClone(from[key]);
    } else if (inFrom && inTo) {
      if (!configEqual(from[key], to[key])) {
        changed[key] = { from: deepClone(from[key]), to: deepClone(to[key]) };
      } else {
        unchanged.push(key);
      }
    }
  }

  return { added, removed, changed, unchanged };
}

// ---------------------------------------------------------------------------
// Helper — validate a config map against a schema
// ---------------------------------------------------------------------------

function validateAgainstSchema(config: ConfigMap, schema: ConfigSchema): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  for (const [field, fieldSchema] of Object.entries(schema.fields)) {
    const value = config[field];
    const missing = !Object.hasOwn(config, field) || value === undefined || value === null;

    if (fieldSchema.required && missing) {
      errors.push(`Required field '${field}' is missing`);
      continue;
    }

    if (missing) continue;

    // Type check
    const actualType = Array.isArray(value)
      ? "array"
      : typeof value === "object" && value !== null
        ? "object"
        : typeof value;
    if (actualType !== fieldSchema.type) {
      errors.push(`Field '${field}' must be of type '${fieldSchema.type}', got '${actualType}'`);
      continue;
    }

    // Number range
    if (fieldSchema.type === "number" && typeof value === "number") {
      if (fieldSchema.minValue !== undefined && value < fieldSchema.minValue) {
        errors.push(`Field '${field}' must be >= ${fieldSchema.minValue}, got ${value}`);
      }
      if (fieldSchema.maxValue !== undefined && value > fieldSchema.maxValue) {
        errors.push(`Field '${field}' must be <= ${fieldSchema.maxValue}, got ${value}`);
      }
    }

    // String length
    if (fieldSchema.type === "string" && typeof value === "string") {
      if (fieldSchema.minLength !== undefined && value.length < fieldSchema.minLength) {
        errors.push(`Field '${field}' must have length >= ${fieldSchema.minLength}`);
      }
      if (fieldSchema.maxLength !== undefined && value.length > fieldSchema.maxLength) {
        errors.push(`Field '${field}' must have length <= ${fieldSchema.maxLength}`);
      }
    }

    // Enum check
    if (fieldSchema.enum !== undefined) {
      const inEnum = fieldSchema.enum.some((e) => configEqual(e, value));
      if (!inEnum) {
        errors.push(`Field '${field}' must be one of: ${JSON.stringify(fieldSchema.enum)}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// ConfigurationManager
// ---------------------------------------------------------------------------

export class ConfigurationManager {
  private versions: ConfigVersion[] = [];
  private currentVersionNumber = 0;
  private schema: ConfigSchema | null = null;

  constructor(schema?: ConfigSchema) {
    this.schema = schema ?? null;
  }

  // -------------------------------------------------------------------------
  // Apply — create a new version
  // -------------------------------------------------------------------------

  apply(
    config: ConfigMap,
    author: string,
    rationale: string,
    rolledBackFromVersion?: number,
  ): ConfigVersion {
    if (!author || !author.trim()) {
      throw new Error("Author is required");
    }
    if (!rationale || !rationale.trim()) {
      throw new Error("Rationale is required");
    }

    // Validate before applying if schema is set
    if (this.schema) {
      const result = validateAgainstSchema(config, this.schema);
      if (!result.valid) {
        throw new Error(`Config validation failed: ${result.errors.join("; ")}`);
      }
    }

    this.currentVersionNumber++;
    const version: ConfigVersion = {
      version: this.currentVersionNumber,
      timestamp: new Date().toISOString(),
      author: author.trim(),
      rationale: rationale.trim(),
      config: deepClone(config),
      rolledBackFromVersion,
    };

    this.versions.push(version);
    return version;
  }

  // -------------------------------------------------------------------------
  // Current config
  // -------------------------------------------------------------------------

  getCurrent(): ConfigVersion | null {
    if (this.versions.length === 0) return null;
    return this.versions[this.versions.length - 1];
  }

  getCurrentConfig(): ConfigMap | null {
    const current = this.getCurrent();
    return current ? deepClone(current.config) : null;
  }

  // -------------------------------------------------------------------------
  // Version history
  // -------------------------------------------------------------------------

  getHistory(): ConfigVersion[] {
    return this.versions.map((v) => ({ ...v, config: deepClone(v.config) }));
  }

  getVersion(versionNumber: number): ConfigVersion | null {
    const v = this.versions.find((v) => v.version === versionNumber);
    return v ? { ...v, config: deepClone(v.config) } : null;
  }

  get versionCount(): number {
    return this.versions.length;
  }

  // -------------------------------------------------------------------------
  // Diff — compare any two versions
  // -------------------------------------------------------------------------

  diff(versionA: number, versionB: number): ConfigDiff {
    const a = this.versions.find((v) => v.version === versionA);
    const b = this.versions.find((v) => v.version === versionB);

    if (!a) throw new Error(`Version ${versionA} not found`);
    if (!b) throw new Error(`Version ${versionB} not found`);

    return computeDiff(a.config, b.config);
  }

  // -------------------------------------------------------------------------
  // Rollback — revert to a prior version (creates new version entry)
  // -------------------------------------------------------------------------

  rollback(targetVersion: number, author: string, rationale?: string): ConfigVersion {
    const target = this.versions.find((v) => v.version === targetVersion);
    if (!target) {
      throw new Error(`Version ${targetVersion} not found`);
    }

    const effectiveRationale = rationale?.trim() || `Rollback to version ${targetVersion}`;

    return this.apply(deepClone(target.config), author, effectiveRationale, targetVersion);
  }

  // -------------------------------------------------------------------------
  // Validate — validate a config map against the schema
  // -------------------------------------------------------------------------

  validate(config: ConfigMap): ValidationResult {
    if (!this.schema) {
      return { valid: true, errors: [] };
    }
    return validateAgainstSchema(config, this.schema);
  }

  // -------------------------------------------------------------------------
  // Schema management
  // -------------------------------------------------------------------------

  setSchema(schema: ConfigSchema): void {
    this.schema = schema;
  }

  getSchema(): ConfigSchema | null {
    return this.schema;
  }

  // -------------------------------------------------------------------------
  // Export / Import
  // -------------------------------------------------------------------------

  export(): ExportedConfigSet {
    return {
      exportedAt: new Date().toISOString(),
      versions: this.versions.map((v) => ({ ...v, config: deepClone(v.config) })),
      currentVersion: this.currentVersionNumber,
    };
  }

  import(data: ExportedConfigSet): void {
    if (
      typeof data !== "object" ||
      data === null ||
      !Array.isArray(data.versions) ||
      typeof data.currentVersion !== "number"
    ) {
      throw new Error("Invalid exported config set format");
    }

    this.versions = data.versions.map((v) => ({
      version: v.version,
      timestamp: v.timestamp,
      author: v.author,
      rationale: v.rationale,
      config: deepClone(v.config),
      rolledBackFromVersion: v.rolledBackFromVersion,
    }));
    this.currentVersionNumber = data.currentVersion;
  }

  // -------------------------------------------------------------------------
  // HTTP route handler
  // -------------------------------------------------------------------------

  route(req: http.IncomingMessage, res: http.ServerResponse): boolean {
    const rawUrl = req.url ?? "/";
    const path = pathOnly(rawUrl);
    const method = req.method ?? "GET";

    if (path === "/api/v1/config" && method === "GET") {
      const current = this.getCurrent();
      if (!current) {
        sendJson(res, 404, { success: false, error: "No configuration set yet" });
      } else {
        sendJson(res, 200, { success: true, data: current });
      }
      return true;
    }

    if (path === "/api/v1/config" && method === "POST") {
      this.handleApply(req, res).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        sendJson(res, 500, { success: false, error: message });
      });
      return true;
    }

    if (path === "/api/v1/config/history" && method === "GET") {
      sendJson(res, 200, { success: true, data: this.getHistory() });
      return true;
    }

    const versionMatch = path.match(/^\/api\/v1\/config\/versions\/(\d+)$/);
    if (versionMatch && method === "GET") {
      const vNum = parseInt(versionMatch[1], 10);
      const v = this.getVersion(vNum);
      if (!v) {
        sendJson(res, 404, { success: false, error: `Version ${vNum} not found` });
      } else {
        sendJson(res, 200, { success: true, data: v });
      }
      return true;
    }

    if (path === "/api/v1/config/diff" && method === "POST") {
      this.handleDiff(req, res).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        sendJson(res, 500, { success: false, error: message });
      });
      return true;
    }

    if (path === "/api/v1/config/rollback" && method === "POST") {
      this.handleRollback(req, res).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        sendJson(res, 500, { success: false, error: message });
      });
      return true;
    }

    if (path === "/api/v1/config/validate" && method === "POST") {
      this.handleValidate(req, res).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        sendJson(res, 500, { success: false, error: message });
      });
      return true;
    }

    if (path === "/api/v1/config/export" && method === "GET") {
      sendJson(res, 200, { success: true, data: this.export() });
      return true;
    }

    if (path === "/api/v1/config/import" && method === "POST") {
      this.handleImport(req, res).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        sendJson(res, 500, { success: false, error: message });
      });
      return true;
    }

    return false;
  }

  private async handleApply(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { success: false, error: "Invalid JSON body" });
      return;
    }

    if (typeof body !== "object" || body === null) {
      sendJson(res, 400, { success: false, error: "Request body must be a JSON object" });
      return;
    }

    const input = body as Record<string, unknown>;
    if (!input.config || typeof input.config !== "object" || Array.isArray(input.config)) {
      sendJson(res, 400, { success: false, error: "Field 'config' must be a JSON object" });
      return;
    }
    if (!input.author || typeof input.author !== "string") {
      sendJson(res, 400, { success: false, error: "Field 'author' is required" });
      return;
    }
    if (!input.rationale || typeof input.rationale !== "string") {
      sendJson(res, 400, { success: false, error: "Field 'rationale' is required" });
      return;
    }

    try {
      const version = this.apply(
        input.config as ConfigMap,
        input.author as string,
        input.rationale as string,
      );
      sendJson(res, 201, { success: true, data: version });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      sendJson(res, 400, { success: false, error: message });
    }
  }

  private async handleDiff(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { success: false, error: "Invalid JSON body" });
      return;
    }
    const input = body as Record<string, unknown>;
    const vA = Number(input.versionA);
    const vB = Number(input.versionB);
    if (!Number.isInteger(vA) || !Number.isInteger(vB)) {
      sendJson(res, 400, {
        success: false,
        error: "Fields 'versionA' and 'versionB' must be integers",
      });
      return;
    }
    try {
      const diff = this.diff(vA, vB);
      sendJson(res, 200, { success: true, data: diff });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      sendJson(res, 404, { success: false, error: message });
    }
  }

  private async handleRollback(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { success: false, error: "Invalid JSON body" });
      return;
    }
    const input = body as Record<string, unknown>;
    const targetVersion = Number(input.targetVersion);
    const author = String(input.author ?? "");
    if (!Number.isInteger(targetVersion)) {
      sendJson(res, 400, { success: false, error: "Field 'targetVersion' must be an integer" });
      return;
    }
    if (!author.trim()) {
      sendJson(res, 400, { success: false, error: "Field 'author' is required" });
      return;
    }
    try {
      const version = this.rollback(targetVersion, author, input.rationale as string | undefined);
      sendJson(res, 200, { success: true, data: version });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      sendJson(res, 404, { success: false, error: message });
    }
  }

  private async handleValidate(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { success: false, error: "Invalid JSON body" });
      return;
    }
    const input = body as Record<string, unknown>;
    if (!input.config || typeof input.config !== "object" || Array.isArray(input.config)) {
      sendJson(res, 400, { success: false, error: "Field 'config' must be a JSON object" });
      return;
    }
    const result = this.validate(input.config as ConfigMap);
    sendJson(res, 200, { success: true, data: result });
  }

  private async handleImport(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { success: false, error: "Invalid JSON body" });
      return;
    }
    try {
      this.import(body as ExportedConfigSet);
      sendJson(res, 200, { success: true, data: { imported: this.versionCount } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      sendJson(res, 400, { success: false, error: message });
    }
  }
}
