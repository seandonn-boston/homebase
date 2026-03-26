/**
 * Tests for Brain tools.
 */

import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { ToolRegistry } from "../tool-registry.js";
import type { ToolContext } from "../tool-registry.js";
import { registerBrainTools, type BrainEntry } from "./brain-tools.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    agentId: "test-agent",
    role: "admiral",
    sessionId: "test-session",
    requestId: "1",
    ...overrides,
  };
}

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "brain-test-"));
}

function seedEntry(dir: string, overrides: Partial<BrainEntry> = {}): BrainEntry {
  const id = overrides.id ?? `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const entry: BrainEntry = {
    id,
    category: "test",
    title: "Test Entry",
    content: "This is test content for brain queries",
    tags: ["test", "sample"],
    scope: "general",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usefulnessScore: 0,
    links: [],
    accessLog: [{ agent: "seeder", timestamp: Date.now() }],
    ...overrides,
  };
  fs.writeFileSync(
    path.join(dir, `${id}-${entry.category}.json`),
    JSON.stringify(entry, null, 2),
    "utf-8",
  );
  return entry;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Brain tools", () => {
  let tmpDir: string;
  let registry: ToolRegistry;

  before(() => {
    tmpDir = createTempDir();
    registry = new ToolRegistry();
    registerBrainTools(registry, tmpDir);
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // brain_query
  describe("brain_query", () => {
    it("returns empty results for no matches", async () => {
      const result = await registry.invoke(
        "brain_query",
        { query: "nonexistent-xyz-12345" },
        makeContext(),
      ) as { results: unknown[]; total: number };
      assert.equal(result.total, 0);
      assert.equal(result.results.length, 0);
    });

    it("finds entries matching query", async () => {
      seedEntry(tmpDir, { id: "q1", title: "Alpha Query Test", content: "alpha content" });
      const result = await registry.invoke(
        "brain_query",
        { query: "alpha" },
        makeContext(),
      ) as { results: BrainEntry[]; total: number };
      assert.ok(result.total >= 1);
      assert.ok(result.results.some((r) => r.id === "q1"));
    });

    it("filters by category", async () => {
      seedEntry(tmpDir, { id: "q2", title: "Cat Filter", content: "cat data", category: "special" });
      const result = await registry.invoke(
        "brain_query",
        { query: "cat", filters: { category: "special" } },
        makeContext(),
      ) as { results: BrainEntry[]; total: number };
      assert.ok(result.results.every((r) => r.category === "special"));
    });

    it("respects limit parameter", async () => {
      seedEntry(tmpDir, { id: "q3a", title: "Limit A", content: "limit test" });
      seedEntry(tmpDir, { id: "q3b", title: "Limit B", content: "limit test" });
      const result = await registry.invoke(
        "brain_query",
        { query: "limit", limit: 1 },
        makeContext(),
      ) as { results: BrainEntry[]; total: number };
      assert.equal(result.results.length, 1);
      assert.ok(result.total >= 2);
    });

    it("throws if query is missing", async () => {
      await assert.rejects(
        () => registry.invoke("brain_query", {}, makeContext()),
        (err: any) => err.code !== undefined,
      );
    });
  });

  // brain_record
  describe("brain_record", () => {
    it("creates a new entry", async () => {
      const result = await registry.invoke(
        "brain_record",
        { category: "note", title: "New Note", content: "Important info", tags: ["info"] },
        makeContext(),
      ) as { id: string; path: string };
      assert.ok(result.id);
      assert.ok(result.path);
      assert.ok(fs.existsSync(result.path));
    });

    it("rejects duplicate titles", async () => {
      await registry.invoke(
        "brain_record",
        { category: "dup", title: "Unique Title ABC", content: "content" },
        makeContext(),
      );
      await assert.rejects(
        () => registry.invoke(
          "brain_record",
          { category: "dup", title: "Unique Title ABC", content: "different content" },
          makeContext(),
        ),
        (err: any) => err.message.includes("Duplicate"),
      );
    });

    it("requires category, title, and content", async () => {
      await assert.rejects(
        () => registry.invoke("brain_record", { category: "x" }, makeContext()),
        (err: any) => err.code !== undefined,
      );
    });

    it("blocks observer role", async () => {
      await assert.rejects(
        () => registry.invoke(
          "brain_record",
          { category: "x", title: "Obs test", content: "c" },
          makeContext({ role: "observer" }),
        ),
        (err: any) => err.message.includes("Insufficient role"),
      );
    });
  });

  // brain_retrieve
  describe("brain_retrieve", () => {
    it("retrieves an entry by ID", async () => {
      const seeded = seedEntry(tmpDir, { id: "ret1", title: "Retrieve Me" });
      const result = await registry.invoke(
        "brain_retrieve",
        { id: "ret1" },
        makeContext(),
      ) as { entry: BrainEntry | null };
      assert.ok(result.entry);
      assert.equal(result.entry!.id, "ret1");
    });

    it("returns null for nonexistent ID", async () => {
      const result = await registry.invoke(
        "brain_retrieve",
        { id: "nonexistent-id" },
        makeContext(),
      ) as { entry: BrainEntry | null };
      assert.equal(result.entry, null);
    });

    it("traverses links when requested", async () => {
      const linked = seedEntry(tmpDir, { id: "linked1", title: "Linked Entry" });
      seedEntry(tmpDir, { id: "parent1", title: "Parent Entry", links: ["linked1"] });

      const result = await registry.invoke(
        "brain_retrieve",
        { id: "parent1", traverseLinks: true, depth: 1 },
        makeContext(),
      ) as { entry: BrainEntry; linked: BrainEntry[] };
      assert.ok(result.entry);
      assert.ok(result.linked.length >= 1);
      assert.ok(result.linked.some((l) => l.id === "linked1"));
    });
  });

  // brain_strengthen
  describe("brain_strengthen", () => {
    it("increments usefulness score", async () => {
      seedEntry(tmpDir, { id: "str1", title: "Strengthen Me", usefulnessScore: 5 });
      const result = await registry.invoke(
        "brain_strengthen",
        { id: "str1", agent: "test-agent" },
        makeContext(),
      ) as { id: string; newScore: number };
      assert.equal(result.id, "str1");
      assert.equal(result.newScore, 6);
    });

    it("throws for nonexistent entry", async () => {
      await assert.rejects(
        () => registry.invoke(
          "brain_strengthen",
          { id: "no-such-id", agent: "test-agent" },
          makeContext(),
        ),
        (err: any) => err.message.includes("not found"),
      );
    });
  });

  // brain_audit
  describe("brain_audit", () => {
    it("returns audit trail", async () => {
      seedEntry(tmpDir, { id: "aud1", title: "Auditable" });
      const result = await registry.invoke(
        "brain_audit",
        {},
        makeContext(),
      ) as { trail: unknown[] };
      assert.ok(Array.isArray(result.trail));
      assert.ok(result.trail.length > 0);
    });

    it("requires admiral role", async () => {
      await assert.rejects(
        () => registry.invoke("brain_audit", {}, makeContext({ role: "agent" })),
        (err: any) => err.message.includes("Insufficient role"),
      );
    });
  });

  // brain_purge
  describe("brain_purge", () => {
    it("does not delete without confirm", async () => {
      seedEntry(tmpDir, { id: "purge1", title: "Maybe Delete" });
      const result = await registry.invoke(
        "brain_purge",
        { id: "purge1", reason: "test", confirm: false },
        makeContext(),
      ) as { deleted: boolean };
      assert.equal(result.deleted, false);
    });

    it("deletes with confirm and creates audit record", async () => {
      seedEntry(tmpDir, { id: "purge2", title: "Delete Me" });
      const result = await registry.invoke(
        "brain_purge",
        { id: "purge2", reason: "test cleanup", confirm: true },
        makeContext(),
      ) as { deleted: boolean; auditRecord: string };
      assert.equal(result.deleted, true);
      assert.ok(result.auditRecord);

      // Verify entry is gone
      const retrieve = await registry.invoke(
        "brain_retrieve",
        { id: "purge2" },
        makeContext(),
      ) as { entry: unknown };
      assert.equal(retrieve.entry, null);
    });

    it("requires admiral role", async () => {
      await assert.rejects(
        () => registry.invoke(
          "brain_purge",
          { id: "x", reason: "r", confirm: true },
          makeContext({ role: "agent" }),
        ),
        (err: any) => err.message.includes("Insufficient role"),
      );
    });
  });
});
