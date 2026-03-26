/**
 * Brain B2 SQLite Schema & Database (B-07)
 *
 * Provides a real SQLite-backed brain with FTS5 full-text search,
 * knowledge graph links, and demand signal tracking. Uses Node.js 22+
 * built-in `node:sqlite` (experimental DatabaseSync API).
 * Zero external dependencies.
 */

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require("node:sqlite");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrainEntry {
	id: string;
	title: string;
	content: string;
	category: string;
	scope: string;
	tags: string[];
	created_at: number;
	updated_at: number;
	usefulness_score: number;
	access_count: number;
	source_agent?: string;
	source_type?: string; // "direct" | "mcp-derived" | "a2a" | "handoff"
	confidence?: number;
	superseded_by?: string;
	contradicts?: string[];
	metadata: Record<string, unknown>;
}

export interface BrainLink {
	id: string;
	from_entry: string;
	to_entry: string;
	link_type:
		| "supports"
		| "contradicts"
		| "supersedes"
		| "related_to"
		| "derived_from"
		| "caused_by";
	confidence: number;
	created_at: number;
	created_by?: string;
}

export interface DemandSignal {
	id: string;
	query: string;
	timestamp: number;
	agent_id?: string;
	results_found: number;
}

export interface MigrationStep {
	version: number;
	description: string;
	up: string;
}

export type InsertEntry = Omit<
	BrainEntry,
	"id" | "created_at" | "updated_at" | "usefulness_score" | "access_count"
>;

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

const MIGRATIONS: MigrationStep[] = [
	{
		version: 1,
		description: "Initial schema — entries, FTS5, links, demands",
		up: `
			CREATE TABLE IF NOT EXISTS brain_entries (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				content TEXT NOT NULL,
				category TEXT NOT NULL DEFAULT '',
				scope TEXT NOT NULL DEFAULT '',
				tags TEXT NOT NULL DEFAULT '[]',
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL,
				usefulness_score REAL NOT NULL DEFAULT 0,
				access_count INTEGER NOT NULL DEFAULT 0,
				source_agent TEXT,
				source_type TEXT,
				confidence REAL,
				superseded_by TEXT,
				contradicts TEXT NOT NULL DEFAULT '[]',
				metadata TEXT NOT NULL DEFAULT '{}'
			);

			CREATE VIRTUAL TABLE IF NOT EXISTS brain_fts USING fts5(
				title,
				content,
				category,
				tags,
				content=brain_entries,
				content_rowid=rowid
			);

			CREATE TRIGGER IF NOT EXISTS brain_fts_insert AFTER INSERT ON brain_entries BEGIN
				INSERT INTO brain_fts(rowid, title, content, category, tags)
				VALUES (new.rowid, new.title, new.content, new.category, new.tags);
			END;

			CREATE TRIGGER IF NOT EXISTS brain_fts_delete AFTER DELETE ON brain_entries BEGIN
				INSERT INTO brain_fts(brain_fts, rowid, title, content, category, tags)
				VALUES ('delete', old.rowid, old.title, old.content, old.category, old.tags);
			END;

			CREATE TRIGGER IF NOT EXISTS brain_fts_update AFTER UPDATE ON brain_entries BEGIN
				INSERT INTO brain_fts(brain_fts, rowid, title, content, category, tags)
				VALUES ('delete', old.rowid, old.title, old.content, old.category, old.tags);
				INSERT INTO brain_fts(rowid, title, content, category, tags)
				VALUES (new.rowid, new.title, new.content, new.category, new.tags);
			END;

			CREATE TABLE IF NOT EXISTS brain_links (
				id TEXT PRIMARY KEY,
				from_entry TEXT NOT NULL,
				to_entry TEXT NOT NULL,
				link_type TEXT NOT NULL,
				confidence REAL NOT NULL DEFAULT 1.0,
				created_at INTEGER NOT NULL,
				created_by TEXT,
				FOREIGN KEY (from_entry) REFERENCES brain_entries(id),
				FOREIGN KEY (to_entry) REFERENCES brain_entries(id)
			);

			CREATE INDEX IF NOT EXISTS idx_links_from ON brain_links(from_entry);
			CREATE INDEX IF NOT EXISTS idx_links_to ON brain_links(to_entry);

			CREATE TABLE IF NOT EXISTS demand_signals (
				id TEXT PRIMARY KEY,
				query TEXT NOT NULL,
				timestamp INTEGER NOT NULL,
				agent_id TEXT,
				results_found INTEGER NOT NULL DEFAULT 0
			);

			CREATE TABLE IF NOT EXISTS brain_meta (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL
			);

			INSERT OR IGNORE INTO brain_meta(key, value) VALUES ('schema_version', '1');
		`,
	},
];

// ---------------------------------------------------------------------------
// BrainDatabase
// ---------------------------------------------------------------------------

export class BrainDatabase {
	private db: InstanceType<typeof DatabaseSync>;
	private readonly dbPath: string;

	constructor(private dataDir: string) {
		mkdirSync(dataDir, { recursive: true });
		this.dbPath = join(dataDir, "brain-b2.db");
		this.db = new DatabaseSync(this.dbPath);
		this.db.exec("PRAGMA journal_mode=WAL");
		this.db.exec("PRAGMA foreign_keys=ON");
	}

	// -- lifecycle -----------------------------------------------------------

	close(): void {
		this.db.close();
	}

	// -- schema management ---------------------------------------------------

	getVersion(): number {
		try {
			const row = this.db
				.prepare("SELECT value FROM brain_meta WHERE key = 'schema_version'")
				.get() as { value: string } | undefined;
			return row ? Number(row.value) : 0;
		} catch {
			return 0;
		}
	}

	migrate(targetVersion?: number): void {
		const target = targetVersion ?? MIGRATIONS.length;
		const current = this.getVersion();
		for (const step of MIGRATIONS) {
			if (step.version > current && step.version <= target) {
				this.db.exec(step.up);
				this.db.exec(
					`INSERT OR REPLACE INTO brain_meta(key, value) VALUES ('schema_version', '${step.version}')`,
				);
			}
		}
	}

	// -- Entry CRUD ----------------------------------------------------------

	insertEntry(input: InsertEntry): BrainEntry {
		const now = Date.now();
		const entry: BrainEntry = {
			id: randomUUID(),
			title: input.title,
			content: input.content,
			category: input.category,
			scope: input.scope,
			tags: input.tags ?? [],
			created_at: now,
			updated_at: now,
			usefulness_score: 0,
			access_count: 0,
			source_agent: input.source_agent,
			source_type: input.source_type,
			confidence: input.confidence,
			superseded_by: input.superseded_by,
			contradicts: input.contradicts ?? [],
			metadata: input.metadata ?? {},
		};

		this.db
			.prepare(
				`INSERT INTO brain_entries
				(id, title, content, category, scope, tags, created_at, updated_at,
				 usefulness_score, access_count, source_agent, source_type, confidence,
				 superseded_by, contradicts, metadata)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				entry.id,
				entry.title,
				entry.content,
				entry.category,
				entry.scope,
				JSON.stringify(entry.tags),
				entry.created_at,
				entry.updated_at,
				entry.usefulness_score,
				entry.access_count,
				entry.source_agent ?? null,
				entry.source_type ?? null,
				entry.confidence ?? null,
				entry.superseded_by ?? null,
				JSON.stringify(entry.contradicts),
				JSON.stringify(entry.metadata),
			);

		return entry;
	}

	getEntry(id: string): BrainEntry | undefined {
		const row = this.db
			.prepare("SELECT * FROM brain_entries WHERE id = ?")
			.get(id) as Record<string, unknown> | undefined;
		if (!row) return undefined;

		// Bump access count
		this.db
			.prepare(
				"UPDATE brain_entries SET access_count = access_count + 1 WHERE id = ?",
			)
			.run(id);

		return this.rowToEntry({ ...row, access_count: (row.access_count as number) + 1 });
	}

	updateEntry(id: string, updates: Partial<BrainEntry>): BrainEntry {
		const existing = this.db
			.prepare("SELECT * FROM brain_entries WHERE id = ?")
			.get(id) as Record<string, unknown> | undefined;
		if (!existing) throw new Error(`Entry not found: ${id}`);

		const merged = this.rowToEntry(existing);
		const fields: string[] = [];
		const values: unknown[] = [];

		const updatable: (keyof BrainEntry)[] = [
			"title",
			"content",
			"category",
			"scope",
			"tags",
			"usefulness_score",
			"access_count",
			"source_agent",
			"source_type",
			"confidence",
			"superseded_by",
			"contradicts",
			"metadata",
		];

		for (const key of updatable) {
			if (key in updates) {
				const val = (updates as Record<string, unknown>)[key];
				fields.push(`${key} = ?`);
				if (
					key === "tags" ||
					key === "contradicts" ||
					key === "metadata"
				) {
					values.push(JSON.stringify(val));
				} else {
					values.push(val ?? null);
				}
				(merged as unknown as Record<string, unknown>)[key] = val;
			}
		}

		fields.push("updated_at = ?");
		const now = Date.now();
		values.push(now);
		merged.updated_at = now;

		values.push(id);
		this.db
			.prepare(
				`UPDATE brain_entries SET ${fields.join(", ")} WHERE id = ?`,
			)
			.run(...values);

		return merged;
	}

	deleteEntry(id: string): boolean {
		// Remove associated links first (FK constraint)
		this.db
			.prepare(
				"DELETE FROM brain_links WHERE from_entry = ? OR to_entry = ?",
			)
			.run(id, id);
		const info = this.db
			.prepare("DELETE FROM brain_entries WHERE id = ?")
			.run(id);
		return (info as { changes: number }).changes > 0;
	}

	// -- FTS5 search ---------------------------------------------------------

	search(
		query: string,
		filters?: {
			category?: string;
			scope?: string;
			since?: number;
			until?: number;
			tags?: string[];
		},
		limit?: number,
	): BrainEntry[] {
		const maxResults = limit ?? 20;

		// Build the FTS match query — escape special chars for safety
		const safeQuery = query
			.replace(/[{}()"^*:]/g, " ")
			.trim()
			.split(/\s+/)
			.filter((t) => t.length > 0)
			.join(" OR ");

		if (!safeQuery) return [];

		let sql = `
			SELECT e.* FROM brain_entries e
			INNER JOIN brain_fts fts ON e.rowid = fts.rowid
			WHERE brain_fts MATCH ?
		`;
		const params: unknown[] = [safeQuery];

		if (filters?.category) {
			sql += " AND e.category = ?";
			params.push(filters.category);
		}
		if (filters?.scope) {
			sql += " AND e.scope = ?";
			params.push(filters.scope);
		}
		if (filters?.since) {
			sql += " AND e.created_at >= ?";
			params.push(filters.since);
		}
		if (filters?.until) {
			sql += " AND e.created_at <= ?";
			params.push(filters.until);
		}

		sql += ` ORDER BY rank LIMIT ?`;
		params.push(maxResults);

		const rows = this.db.prepare(sql).all(...params) as Record<
			string,
			unknown
		>[];

		let results = rows.map((r) => this.rowToEntry(r));

		// Post-filter tags (stored as JSON array, hard to filter in SQL)
		if (filters?.tags && filters.tags.length > 0) {
			const tagSet = new Set(filters.tags);
			results = results.filter((e) =>
				e.tags.some((t) => tagSet.has(t)),
			);
		}

		return results;
	}

	// -- Links (DE-01) -------------------------------------------------------

	addLink(
		from: string,
		to: string,
		type: BrainLink["link_type"],
		confidence = 1.0,
		createdBy?: string,
	): BrainLink {
		const link: BrainLink = {
			id: randomUUID(),
			from_entry: from,
			to_entry: to,
			link_type: type,
			confidence,
			created_at: Date.now(),
			created_by: createdBy,
		};

		this.db
			.prepare(
				`INSERT INTO brain_links (id, from_entry, to_entry, link_type, confidence, created_at, created_by)
				VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				link.id,
				link.from_entry,
				link.to_entry,
				link.link_type,
				link.confidence,
				link.created_at,
				link.created_by ?? null,
			);

		return link;
	}

	getLinks(
		entryId: string,
		direction: "outgoing" | "incoming" | "both" = "both",
	): BrainLink[] {
		let sql: string;
		let params: string[];
		if (direction === "outgoing") {
			sql = "SELECT * FROM brain_links WHERE from_entry = ?";
			params = [entryId];
		} else if (direction === "incoming") {
			sql = "SELECT * FROM brain_links WHERE to_entry = ?";
			params = [entryId];
		} else {
			sql =
				"SELECT * FROM brain_links WHERE from_entry = ? OR to_entry = ?";
			params = [entryId, entryId];
		}
		const rows = this.db.prepare(sql).all(...params) as Record<
			string,
			unknown
		>[];
		return rows.map((r) => this.rowToLink(r));
	}

	removeLink(linkId: string): boolean {
		const info = this.db
			.prepare("DELETE FROM brain_links WHERE id = ?")
			.run(linkId);
		return (info as { changes: number }).changes > 0;
	}

	traverseLinks(
		startId: string,
		maxDepth: number,
		linkTypes?: BrainLink["link_type"][],
	): { entry: BrainEntry; depth: number; path: string[] }[] {
		const results: { entry: BrainEntry; depth: number; path: string[] }[] =
			[];
		const visited = new Set<string>();

		const queue: { id: string; depth: number; path: string[] }[] = [
			{ id: startId, depth: 0, path: [startId] },
		];

		while (queue.length > 0) {
			const current = queue.shift()!;
			if (visited.has(current.id)) continue;
			visited.add(current.id);

			if (current.id !== startId) {
				const entry = this.getEntry(current.id);
				if (entry) {
					results.push({
						entry,
						depth: current.depth,
						path: current.path,
					});
				}
			}

			if (current.depth < maxDepth) {
				const links = this.getLinks(current.id, "outgoing");
				for (const link of links) {
					if (linkTypes && !linkTypes.includes(link.link_type))
						continue;
					if (!visited.has(link.to_entry)) {
						queue.push({
							id: link.to_entry,
							depth: current.depth + 1,
							path: [...current.path, link.to_entry],
						});
					}
				}
			}
		}

		return results;
	}

	// -- Demand signals ------------------------------------------------------

	recordDemand(
		query: string,
		agentId?: string,
		resultsFound = 0,
	): DemandSignal {
		const signal: DemandSignal = {
			id: randomUUID(),
			query,
			timestamp: Date.now(),
			agent_id: agentId,
			results_found: resultsFound,
		};

		this.db
			.prepare(
				"INSERT INTO demand_signals (id, query, timestamp, agent_id, results_found) VALUES (?, ?, ?, ?, ?)",
			)
			.run(
				signal.id,
				signal.query,
				signal.timestamp,
				signal.agent_id ?? null,
				signal.results_found,
			);

		return signal;
	}

	getDemandSignals(since?: number): DemandSignal[] {
		let sql = "SELECT * FROM demand_signals";
		const params: unknown[] = [];
		if (since !== undefined) {
			sql += " WHERE timestamp >= ?";
			params.push(since);
		}
		sql += " ORDER BY timestamp DESC";

		const rows = this.db.prepare(sql).all(...params) as Record<
			string,
			unknown
		>[];
		return rows.map((r) => ({
			id: r.id as string,
			query: r.query as string,
			timestamp: r.timestamp as number,
			agent_id: (r.agent_id as string) ?? undefined,
			results_found: r.results_found as number,
		}));
	}

	// -- Stats ---------------------------------------------------------------

	getStats(): {
		entries: number;
		links: number;
		demands: number;
		version: number;
	} {
		const entries = (
			this.db.prepare("SELECT COUNT(*) as c FROM brain_entries").get() as {
				c: number;
			}
		).c;
		const links = (
			this.db.prepare("SELECT COUNT(*) as c FROM brain_links").get() as {
				c: number;
			}
		).c;
		const demands = (
			this.db
				.prepare("SELECT COUNT(*) as c FROM demand_signals")
				.get() as { c: number }
		).c;
		return { entries, links, demands, version: this.getVersion() };
	}

	// -- Bulk query helpers (used by self-instrumentation) --------------------

	getAllEntries(): BrainEntry[] {
		const rows = this.db
			.prepare("SELECT * FROM brain_entries ORDER BY created_at DESC")
			.all() as Record<string, unknown>[];
		return rows.map((r) => this.rowToEntry(r));
	}

	getEntriesByCategory(): { category: string; count: number }[] {
		const rows = this.db
			.prepare(
				"SELECT category, COUNT(*) as count FROM brain_entries GROUP BY category ORDER BY count DESC",
			)
			.all() as { category: string; count: number }[];
		return rows;
	}

	// -- Internal helpers ----------------------------------------------------

	private rowToEntry(row: Record<string, unknown>): BrainEntry {
		return {
			id: row.id as string,
			title: row.title as string,
			content: row.content as string,
			category: row.category as string,
			scope: row.scope as string,
			tags: JSON.parse((row.tags as string) || "[]"),
			created_at: row.created_at as number,
			updated_at: row.updated_at as number,
			usefulness_score: row.usefulness_score as number,
			access_count: row.access_count as number,
			source_agent: (row.source_agent as string) ?? undefined,
			source_type: (row.source_type as string) ?? undefined,
			confidence:
				row.confidence != null
					? (row.confidence as number)
					: undefined,
			superseded_by: (row.superseded_by as string) ?? undefined,
			contradicts: JSON.parse((row.contradicts as string) || "[]"),
			metadata: JSON.parse((row.metadata as string) || "{}"),
		};
	}

	private rowToLink(row: Record<string, unknown>): BrainLink {
		return {
			id: row.id as string,
			from_entry: row.from_entry as string,
			to_entry: row.to_entry as string,
			link_type: row.link_type as BrainLink["link_type"],
			confidence: row.confidence as number,
			created_at: row.created_at as number,
			created_by: (row.created_by as string) ?? undefined,
		};
	}
}
