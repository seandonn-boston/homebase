/**
 * Brain tools — query, record, retrieve, strengthen, audit, purge.
 *
 * Operates on JSON files in the `.brain/helm/` directory.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

import type { ToolRegistry } from "../tool-registry.js";
import type { ToolContext } from "../tool-registry.js";
import { TOOL_SCHEMAS } from "./tool-schemas.js";
import { INVALID_PARAMS } from "../protocol.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrainEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  scope: string;
  createdAt: number;
  updatedAt: number;
  usefulnessScore: number;
  links: string[];
  accessLog: Array<{ agent: string; timestamp: number }>;
}

export interface AuditRecord {
  id: string;
  action: string;
  entryId: string;
  agent: string;
  timestamp: number;
  details: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateId(): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:T]/g, "").replace(/\.\d+Z/, "");
  const rand = crypto.randomBytes(4).toString("hex");
  return `${ts}-${rand}`;
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function listBrainFiles(brainDir: string): string[] {
  ensureDir(brainDir);
  try {
    return fs.readdirSync(brainDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(brainDir, f));
  } catch {
    return [];
  }
}

function countKeywordMatches(text: string, query: string): number {
  const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();
  let count = 0;
  for (const kw of keywords) {
    const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerBrainTools(registry: ToolRegistry, brainDir: string): void {
  // -----------------------------------------------------------------------
  // brain_query — universal, all roles
  // -----------------------------------------------------------------------
  registry.register(
    {
      name: "brain_query",
      description: "Search Brain entries by query string and optional filters",
      inputSchema: TOOL_SCHEMAS.brain_query.input,
      outputSchema: TOOL_SCHEMAS.brain_query.output,
      category: "brain",
    },
    async (params: Record<string, unknown>): Promise<unknown> => {
      const query = params.query as string;
      if (!query) throw { code: INVALID_PARAMS, message: "query is required" };

      const filters = (params.filters ?? {}) as Record<string, unknown>;
      const limit = (params.limit as number) ?? 20;

      const files = listBrainFiles(brainDir);
      const scored: Array<{ entry: BrainEntry; score: number }> = [];

      for (const file of files) {
        const entry = readJsonFile<BrainEntry>(file);
        if (!entry) continue;

        // Apply filters
        if (filters.category && entry.category !== filters.category) continue;
        if (filters.scope && entry.scope !== filters.scope) continue;
        if (typeof filters.since === "number" && entry.createdAt < (filters.since as number)) continue;
        if (typeof filters.until === "number" && entry.createdAt > (filters.until as number)) continue;

        // Score by keyword match
        const text = `${entry.title} ${entry.content} ${entry.tags.join(" ")}`;
        const score = countKeywordMatches(text, query);
        if (score > 0) {
          scored.push({ entry, score });
        }
      }

      // Sort by score descending, then by recency
      scored.sort((a, b) => b.score - a.score || b.entry.createdAt - a.entry.createdAt);

      const results = scored.slice(0, limit).map((s) => s.entry);
      return { results, total: scored.length };
    },
  );

  // -----------------------------------------------------------------------
  // brain_record — agent+
  // -----------------------------------------------------------------------
  registry.register(
    {
      name: "brain_record",
      description: "Create a new Brain entry",
      inputSchema: TOOL_SCHEMAS.brain_record.input,
      outputSchema: TOOL_SCHEMAS.brain_record.output,
      requiredRole: "agent",
      category: "brain",
    },
    async (params: Record<string, unknown>, context: ToolContext): Promise<unknown> => {
      const category = params.category as string;
      const title = params.title as string;
      const content = params.content as string;
      if (!category || !title || !content) {
        throw { code: INVALID_PARAMS, message: "category, title, and content are required" };
      }

      ensureDir(brainDir);

      // Check for duplicates by title similarity
      const files = listBrainFiles(brainDir);
      const normalizedTitle = title.toLowerCase().trim();
      for (const file of files) {
        const existing = readJsonFile<BrainEntry>(file);
        if (existing && existing.title.toLowerCase().trim() === normalizedTitle) {
          throw { code: INVALID_PARAMS, message: `Duplicate entry: "${existing.title}" already exists (id: ${existing.id})` };
        }
      }

      const id = generateId();
      const now = Date.now();
      const entry: BrainEntry = {
        id,
        category,
        title,
        content,
        tags: (params.tags as string[]) ?? [],
        scope: (params.scope as string) ?? "general",
        createdAt: now,
        updatedAt: now,
        usefulnessScore: 0,
        links: [],
        accessLog: [{ agent: context.agentId, timestamp: now }],
      };

      const filename = `${id}-${category}.json`;
      const filePath = path.join(brainDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), "utf-8");

      return { id, path: filePath };
    },
  );

  // -----------------------------------------------------------------------
  // brain_retrieve — universal
  // -----------------------------------------------------------------------
  registry.register(
    {
      name: "brain_retrieve",
      description: "Retrieve a specific Brain entry by ID",
      inputSchema: TOOL_SCHEMAS.brain_retrieve.input,
      outputSchema: TOOL_SCHEMAS.brain_retrieve.output,
      category: "brain",
    },
    async (params: Record<string, unknown>): Promise<unknown> => {
      const id = params.id as string;
      if (!id) throw { code: INVALID_PARAMS, message: "id is required" };

      const traverseLinks = (params.traverseLinks as boolean) ?? false;
      const depth = (params.depth as number) ?? 1;

      // Find entry by ID prefix in filename
      const files = listBrainFiles(brainDir);
      let foundEntry: BrainEntry | null = null;

      for (const file of files) {
        const entry = readJsonFile<BrainEntry>(file);
        if (entry && entry.id === id) {
          foundEntry = entry;
          break;
        }
      }

      if (!foundEntry) {
        return { entry: null };
      }

      // Traverse links if requested
      const linked: BrainEntry[] = [];
      if (traverseLinks && foundEntry.links.length > 0 && depth > 0) {
        for (const linkId of foundEntry.links) {
          for (const file of files) {
            const entry = readJsonFile<BrainEntry>(file);
            if (entry && entry.id === linkId) {
              linked.push(entry);
              break;
            }
          }
        }
      }

      return { entry: foundEntry, linked };
    },
  );

  // -----------------------------------------------------------------------
  // brain_strengthen — agent+
  // -----------------------------------------------------------------------
  registry.register(
    {
      name: "brain_strengthen",
      description: "Increment the usefulness score of a Brain entry",
      inputSchema: TOOL_SCHEMAS.brain_strengthen.input,
      outputSchema: TOOL_SCHEMAS.brain_strengthen.output,
      requiredRole: "agent",
      category: "brain",
    },
    async (params: Record<string, unknown>): Promise<unknown> => {
      const id = params.id as string;
      const agent = params.agent as string;
      if (!id || !agent) throw { code: INVALID_PARAMS, message: "id and agent are required" };

      const files = listBrainFiles(brainDir);
      for (const file of files) {
        const entry = readJsonFile<BrainEntry>(file);
        if (entry && entry.id === id) {
          entry.usefulnessScore += 1;
          entry.updatedAt = Date.now();
          entry.accessLog.push({ agent, timestamp: Date.now() });
          fs.writeFileSync(file, JSON.stringify(entry, null, 2), "utf-8");
          return { id, newScore: entry.usefulnessScore };
        }
      }

      throw { code: INVALID_PARAMS, message: `Brain entry not found: ${id}` };
    },
  );

  // -----------------------------------------------------------------------
  // brain_audit — admiral only
  // -----------------------------------------------------------------------
  registry.register(
    {
      name: "brain_audit",
      description: "Return chronological audit trail from Brain entries",
      inputSchema: TOOL_SCHEMAS.brain_audit.input,
      outputSchema: TOOL_SCHEMAS.brain_audit.output,
      requiredRole: "admiral",
      category: "brain",
    },
    async (params: Record<string, unknown>): Promise<unknown> => {
      const since = params.since as number | undefined;
      const until = params.until as number | undefined;
      const limit = (params.limit as number) ?? 50;

      const files = listBrainFiles(brainDir);
      const trail: AuditRecord[] = [];

      for (const file of files) {
        const entry = readJsonFile<BrainEntry>(file);
        if (!entry) continue;

        for (const log of entry.accessLog) {
          if (since !== undefined && log.timestamp < since) continue;
          if (until !== undefined && log.timestamp > until) continue;

          trail.push({
            id: `audit-${entry.id}-${log.timestamp}`,
            action: "access",
            entryId: entry.id,
            agent: log.agent,
            timestamp: log.timestamp,
            details: `Accessed "${entry.title}"`,
          });
        }
      }

      // Sort chronologically
      trail.sort((a, b) => a.timestamp - b.timestamp);

      return { trail: trail.slice(0, limit) };
    },
  );

  // -----------------------------------------------------------------------
  // brain_purge — admiral only
  // -----------------------------------------------------------------------
  registry.register(
    {
      name: "brain_purge",
      description: "Delete a Brain entry with audit trail",
      inputSchema: TOOL_SCHEMAS.brain_purge.input,
      outputSchema: TOOL_SCHEMAS.brain_purge.output,
      requiredRole: "admiral",
      category: "brain",
    },
    async (params: Record<string, unknown>, context: ToolContext): Promise<unknown> => {
      const id = params.id as string;
      const reason = params.reason as string;
      const confirm = params.confirm as boolean;

      if (!id || !reason) throw { code: INVALID_PARAMS, message: "id and reason are required" };

      if (!confirm) {
        return { deleted: false, auditRecord: "purge not confirmed" };
      }

      const files = listBrainFiles(brainDir);
      for (const file of files) {
        const entry = readJsonFile<BrainEntry>(file);
        if (entry && entry.id === id) {
          // Create audit record before deletion
          const auditId = `purge-${id}-${Date.now()}`;
          const audit: AuditRecord = {
            id: auditId,
            action: "purge",
            entryId: id,
            agent: context.agentId,
            timestamp: Date.now(),
            details: `Purged "${entry.title}": ${reason}`,
          };

          // Write audit record
          const auditPath = path.join(brainDir, `${auditId}.audit.json`);
          fs.writeFileSync(auditPath, JSON.stringify(audit, null, 2), "utf-8");

          // Delete the entry
          fs.unlinkSync(file);

          return { deleted: true, auditRecord: auditId };
        }
      }

      throw { code: INVALID_PARAMS, message: `Brain entry not found: ${id}` };
    },
  );
}
