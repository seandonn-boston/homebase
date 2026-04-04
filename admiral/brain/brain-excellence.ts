/**
 * Brain Excellence (B-22 to B-29)
 *
 * Entry versioning, expiration, usage analytics, backup/restore,
 * entry templates, and provenance-aware writes.
 * Zero external dependencies — Node.js built-ins only.
 */

import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// B-22: Entry versioning
// ---------------------------------------------------------------------------

export interface EntryVersion {
	entryId: string;
	version: number;
	content: string;
	modifiedAt: number;
	modifiedBy: string;
	changeDescription: string;
}

export class BrainVersioning {
	private versions: Map<string, EntryVersion[]> = new Map();

	recordVersion(
		entryId: string,
		content: string,
		modifiedBy: string,
		changeDescription: string,
	): EntryVersion {
		const existing = this.versions.get(entryId) ?? [];
		const version: EntryVersion = {
			entryId,
			version: existing.length + 1,
			content,
			modifiedAt: Date.now(),
			modifiedBy,
			changeDescription,
		};
		existing.push(version);
		this.versions.set(entryId, existing);
		return version;
	}

	getVersions(entryId: string): EntryVersion[] {
		return this.versions.get(entryId) ?? [];
	}

	rollback(entryId: string, targetVersion: number): EntryVersion | undefined {
		const versions = this.versions.get(entryId);
		if (!versions) return undefined;
		return versions.find((v) => v.version === targetVersion);
	}

	getSupersessionChain(entryId: string): string[] {
		// Walk through versions to build the supersession chain
		const versions = this.versions.get(entryId) ?? [];
		return versions.map((v) => `${v.entryId}@v${v.version}`);
	}
}

// ---------------------------------------------------------------------------
// B-23: Entry expiration
// ---------------------------------------------------------------------------

export interface ExpirationPolicy {
	ttlDays: number;
	warningDays: number;
	autoArchive: boolean;
}

const DAY_MS = 86_400_000;

export class BrainExpiration {
	constructor(private policy: ExpirationPolicy) {}

	getExpiring(
		entries: { id: string; updated_at: number }[],
		now?: number,
	): { id: string; expiresAt: number; daysRemaining: number }[] {
		const currentTime = now ?? Date.now();
		const result: { id: string; expiresAt: number; daysRemaining: number }[] =
			[];

		for (const entry of entries) {
			const expiresAt = entry.updated_at + this.policy.ttlDays * DAY_MS;
			const daysRemaining = Math.ceil((expiresAt - currentTime) / DAY_MS);

			if (daysRemaining > 0 && daysRemaining <= this.policy.warningDays) {
				result.push({ id: entry.id, expiresAt, daysRemaining });
			}
		}

		return result;
	}

	getExpired(
		entries: { id: string; updated_at: number }[],
		now?: number,
	): string[] {
		const currentTime = now ?? Date.now();
		const expired: string[] = [];

		for (const entry of entries) {
			const expiresAt = entry.updated_at + this.policy.ttlDays * DAY_MS;
			if (currentTime >= expiresAt) {
				expired.push(entry.id);
			}
		}

		return expired;
	}

	getWarnings(
		entries: { id: string; updated_at: number }[],
		now?: number,
	): { id: string; daysRemaining: number }[] {
		const expiring = this.getExpiring(entries, now);
		return expiring.map((e) => ({ id: e.id, daysRemaining: e.daysRemaining }));
	}
}

// ---------------------------------------------------------------------------
// B-25: Usage analytics
// ---------------------------------------------------------------------------

export interface UsageAnalytics {
	topQueried: { id: string; count: number }[];
	topStrengthened: { id: string; score: number }[];
	gapAreas: string[];
	unusedEntries: string[];
	roi: { entriesUsed: number; entriesTotal: number; usageRate: number };
}

export class BrainUsageAnalytics {
	analyze(
		entries: {
			id: string;
			access_count: number;
			usefulness_score: number;
			category: string;
		}[],
	): UsageAnalytics {
		// Top queried: sorted by access_count
		const topQueried = [...entries]
			.sort((a, b) => b.access_count - a.access_count)
			.slice(0, 10)
			.map((e) => ({ id: e.id, count: e.access_count }));

		// Top strengthened: sorted by usefulness_score
		const topStrengthened = [...entries]
			.sort((a, b) => b.usefulness_score - a.usefulness_score)
			.slice(0, 10)
			.map((e) => ({ id: e.id, score: e.usefulness_score }));

		// Gap areas: categories with fewer than 3 entries
		const categoryCounts = new Map<string, number>();
		for (const e of entries) {
			categoryCounts.set(e.category, (categoryCounts.get(e.category) ?? 0) + 1);
		}
		const gapAreas: string[] = [];
		for (const [category, count] of categoryCounts) {
			if (count < 3) gapAreas.push(category);
		}

		// Unused entries: zero access_count
		const unusedEntries = entries
			.filter((e) => e.access_count === 0)
			.map((e) => e.id);

		// ROI
		const entriesUsed = entries.filter((e) => e.access_count > 0).length;
		const entriesTotal = entries.length;
		const usageRate = entriesTotal > 0 ? entriesUsed / entriesTotal : 0;

		return {
			topQueried,
			topStrengthened,
			gapAreas,
			unusedEntries,
			roi: { entriesUsed, entriesTotal, usageRate },
		};
	}
}

// ---------------------------------------------------------------------------
// B-26: Backup and restore
// ---------------------------------------------------------------------------

export class BrainBackup {
	createBackup(
		entries: unknown[],
		links: unknown[],
	): { data: string; hash: string; timestamp: number } {
		const payload = { entries, links };
		const data = JSON.stringify(payload, null, 2);
		const hash = createHash("sha256").update(data).digest("hex");

		return {
			data,
			hash,
			timestamp: Date.now(),
		};
	}

	verifyBackup(backup: { data: string; hash: string }): boolean {
		const computed = createHash("sha256").update(backup.data).digest("hex");
		return computed === backup.hash;
	}

	restore(backup: { data: string }): { entries: unknown[]; links: unknown[] } {
		const parsed = JSON.parse(backup.data) as {
			entries: unknown[];
			links: unknown[];
		};
		return {
			entries: parsed.entries ?? [],
			links: parsed.links ?? [],
		};
	}
}

// ---------------------------------------------------------------------------
// B-28: Entry templates
// ---------------------------------------------------------------------------

export interface BrainEntryTemplate {
	id: string;
	name: string;
	category: string;
	contentTemplate: string;
	requiredFields: string[];
	tags: string[];
}

export const BRAIN_ENTRY_TEMPLATES: BrainEntryTemplate[] = [
	{
		id: "decision",
		name: "Decision Record",
		category: "decision",
		contentTemplate:
			"## Decision\n\n## Alternatives\n\n## Reasoning\n\n## Outcome",
		requiredFields: ["title"],
		tags: ["decision"],
	},
	{
		id: "lesson",
		name: "Lesson Learned",
		category: "lesson",
		contentTemplate:
			"## What Happened\n\n## Root Cause\n\n## Lesson\n\n## Prevention",
		requiredFields: ["title"],
		tags: ["lesson"],
	},
	{
		id: "pattern",
		name: "Code Pattern",
		category: "pattern",
		contentTemplate:
			"## Pattern\n\n## When to Use\n\n## Example\n\n## Anti-patterns",
		requiredFields: ["title"],
		tags: ["pattern"],
	},
	{
		id: "failure",
		name: "Failure Record",
		category: "failure",
		contentTemplate:
			"## What Failed\n\n## Impact\n\n## Root Cause\n\n## Fix Applied",
		requiredFields: ["title"],
		tags: ["failure"],
	},
	{
		id: "convention",
		name: "Convention",
		category: "convention",
		contentTemplate:
			"## Convention\n\n## Rationale\n\n## Examples\n\n## Exceptions",
		requiredFields: ["title"],
		tags: ["convention"],
	},
];

export class BrainEntryTemplateManager {
	private templates: Map<string, BrainEntryTemplate>;

	constructor() {
		this.templates = new Map<string, BrainEntryTemplate>();
		for (const t of BRAIN_ENTRY_TEMPLATES) {
			this.templates.set(t.id, t);
		}
	}

	getTemplate(id: string): BrainEntryTemplate | undefined {
		return this.templates.get(id);
	}

	getAllTemplates(): BrainEntryTemplate[] {
		return [...this.templates.values()];
	}

	addTemplate(template: BrainEntryTemplate): void {
		this.templates.set(template.id, template);
	}

	createFromTemplate(
		templateId: string,
		title: string,
		overrides?: Record<string, string>,
	): { title: string; content: string; category: string; tags: string[] } {
		const template = this.templates.get(templateId);
		if (!template) {
			throw new Error(`Template not found: ${templateId}`);
		}

		let content = template.contentTemplate;

		// Apply overrides to content template sections
		if (overrides) {
			for (const [key, value] of Object.entries(overrides)) {
				const sectionPattern = new RegExp(`(## ${key})\\n`, "i");
				content = content.replace(sectionPattern, `$1\n${value}\n`);
			}
		}

		return {
			title,
			content,
			category: template.category,
			tags: [...template.tags],
		};
	}
}

// ---------------------------------------------------------------------------
// B-29: Provenance-aware writes
// ---------------------------------------------------------------------------

export interface ProvenanceMetadata {
	sourceAgent: string;
	sourceType: "direct_observation" | "mcp_derived" | "a2a" | "handoff";
	sourceServer?: string;
	confidence: number;
	timestamp: number;
}

const PROVENANCE_WEIGHTS: Record<ProvenanceMetadata["sourceType"], number> = {
	direct_observation: 1.0,
	mcp_derived: 0.8,
	a2a: 0.6,
	handoff: 0.5,
};

export class ProvenanceTracker {
	attachProvenance(
		entryData: Record<string, unknown>,
		provenance: ProvenanceMetadata,
	): Record<string, unknown> {
		return {
			...entryData,
			metadata: {
				...((entryData.metadata as Record<string, unknown>) ?? {}),
				provenance,
			},
		};
	}

	getProvenance(entry: {
		metadata: Record<string, unknown>;
	}): ProvenanceMetadata | null {
		const provenance = entry.metadata?.provenance;
		if (!provenance || typeof provenance !== "object") return null;
		return provenance as ProvenanceMetadata;
	}

	filterByTrust(
		entries: { metadata: Record<string, unknown> }[],
		minConfidence: number,
	): typeof entries {
		return entries.filter((e) => {
			const provenance = this.getProvenance(e);
			if (!provenance) return false;
			return provenance.confidence >= minConfidence;
		});
	}

	weightByProvenance(
		entries: { metadata: Record<string, unknown> }[],
	): { entry: (typeof entries)[0]; weight: number }[] {
		return entries.map((entry) => {
			const provenance = this.getProvenance(entry);
			if (!provenance) return { entry, weight: 0.5 };

			const typeWeight = PROVENANCE_WEIGHTS[provenance.sourceType] ?? 0.5;
			const weight = typeWeight * provenance.confidence;
			return { entry, weight };
		});
	}
}
