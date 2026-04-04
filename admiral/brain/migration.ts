/**
 * Brain B1 -> B2 Migration (B-08)
 *
 * Reads all JSON files from the B1 `.brain/helm/` directory and inserts
 * them into the B2 SQLite database. Idempotent — skips entries that
 * already exist by title match. Creates contradiction links where the
 * B1 entry references other entries.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { BrainDatabase, InsertEntry } from "./schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MigrationReport {
	entriesMigrated: number;
	entriesSkipped: number;
	errors: { file: string; error: string }[];
	linksCreated: number;
	startedAt: number;
	completedAt: number;
}

interface B1RawEntry {
	id?: string;
	project?: string;
	category?: string;
	title?: string;
	content?: string;
	metadata?: Record<string, unknown>;
	source_agent?: string;
	created_at?: string;
	tags?: string[];
	contradicts?: string[];
	superseded_by?: string;
	confidence?: number;
	scope?: string;
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

export function validateB1Entry(data: unknown): data is B1RawEntry {
	if (typeof data !== "object" || data === null) return false;
	const obj = data as Record<string, unknown>;
	// Minimum: must have title and content
	if (typeof obj.title !== "string" || obj.title.length === 0) return false;
	if (typeof obj.content !== "string" || obj.content.length === 0) return false;
	return true;
}

// ---------------------------------------------------------------------------
// BrainMigrator
// ---------------------------------------------------------------------------

export class BrainMigrator {
	private report: MigrationReport = {
		entriesMigrated: 0,
		entriesSkipped: 0,
		errors: [],
		linksCreated: 0,
		startedAt: 0,
		completedAt: 0,
	};

	constructor(
		private b1Dir: string,
		private db: BrainDatabase,
	) {}

	migrate(): MigrationReport {
		this.report.startedAt = Date.now();

		let files: string[];
		try {
			files = readdirSync(this.b1Dir).filter((f) => f.endsWith(".json"));
		} catch {
			this.report.completedAt = Date.now();
			return this.report;
		}

		// Track title -> id for link creation
		const titleToId = new Map<string, string>();

		// First pass: insert entries
		for (const file of files) {
			const filePath = join(this.b1Dir, file);
			try {
				const raw = JSON.parse(readFileSync(filePath, "utf-8"));
				if (!validateB1Entry(raw)) {
					this.report.errors.push({
						file,
						error: "Validation failed: missing title or content",
					});
					continue;
				}

				// Idempotent check: skip if title already exists
				const existing = this.db.search(raw.title!, {
					category: raw.category,
				});
				const exact = existing.find(
					(e) => e.title.toLowerCase() === raw.title?.toLowerCase(),
				);
				if (exact) {
					titleToId.set(raw.title!, exact.id);
					this.report.entriesSkipped++;
					continue;
				}

				const tags =
					raw.tags ?? (raw.metadata as Record<string, unknown>)?.tags ?? [];

				const input: InsertEntry = {
					title: raw.title!,
					content: raw.content!,
					category: raw.category ?? "uncategorized",
					scope: raw.scope ?? raw.project ?? "helm",
					tags: Array.isArray(tags) ? (tags as string[]) : [],
					source_agent: raw.source_agent,
					source_type: "direct",
					confidence: raw.confidence,
					superseded_by: raw.superseded_by,
					contradicts: raw.contradicts ?? [],
					metadata: raw.metadata ?? {},
				};

				const entry = this.db.insertEntry(input);
				titleToId.set(raw.title!, entry.id);
				this.report.entriesMigrated++;
			} catch (err) {
				this.report.errors.push({
					file,
					error: err instanceof Error ? err.message : String(err),
				});
			}
		}

		// Second pass: create contradiction links
		for (const file of files) {
			const filePath = join(this.b1Dir, file);
			try {
				const raw = JSON.parse(readFileSync(filePath, "utf-8"));
				if (!validateB1Entry(raw)) continue;
				if (!raw.contradicts || raw.contradicts.length === 0) continue;

				const fromId = titleToId.get(raw.title!);
				if (!fromId) continue;

				for (const target of raw.contradicts) {
					const toId = titleToId.get(target);
					if (toId && fromId !== toId) {
						try {
							this.db.addLink(fromId, toId, "contradicts", 0.8, "b1-migration");
							this.report.linksCreated++;
						} catch {
							// Link creation might fail if entry was skipped
						}
					}
				}
			} catch {
				// Already reported in first pass
			}
		}

		this.report.completedAt = Date.now();
		return this.report;
	}

	generateReport(): MigrationReport {
		return { ...this.report };
	}
}
