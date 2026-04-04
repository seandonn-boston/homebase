/**
 * Manifest Guard (M-12)
 *
 * Snapshot and diff tool manifests for MCP servers to detect
 * shadow tools, schema changes, and tool removal.
 * Zero external dependencies — Node.js built-ins only.
 */

import * as crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ManifestSnapshot {
	serverId: string;
	tools: { name: string; hash: string }[];
	takenAt: number;
	verified: boolean;
}

export interface ManifestDiff {
	serverId: string;
	unchanged: string[];
	added: string[];
	removed: string[];
	changed: string[];
	isClean: boolean;
}

interface ToolInput {
	name: string;
	description: string;
	inputSchema: object;
}

// ---------------------------------------------------------------------------
// ManifestGuard
// ---------------------------------------------------------------------------

export class ManifestGuard {
	private snapshots: Map<string, ManifestSnapshot> = new Map();

	constructor() {}

	takeSnapshot(serverId: string, tools: ToolInput[]): ManifestSnapshot {
		const snapshot: ManifestSnapshot = {
			serverId,
			tools: tools.map((t) => ({
				name: t.name,
				hash: hashTool(t),
			})),
			takenAt: Date.now(),
			verified: true,
		};
		this.snapshots.set(serverId, snapshot);
		return { ...snapshot, tools: [...snapshot.tools] };
	}

	compare(serverId: string, currentTools: ToolInput[]): ManifestDiff {
		const snapshot = this.snapshots.get(serverId);
		if (!snapshot) {
			// No prior snapshot — everything is "added"
			return {
				serverId,
				unchanged: [],
				added: currentTools.map((t) => t.name),
				removed: [],
				changed: [],
				isClean: currentTools.length === 0,
			};
		}

		const priorMap = new Map<string, string>();
		for (const t of snapshot.tools) {
			priorMap.set(t.name, t.hash);
		}

		const currentMap = new Map<string, string>();
		for (const t of currentTools) {
			currentMap.set(t.name, hashTool(t));
		}

		const unchanged: string[] = [];
		const added: string[] = [];
		const changed: string[] = [];
		const removed: string[] = [];

		for (const [name, hash] of currentMap) {
			const priorHash = priorMap.get(name);
			if (priorHash === undefined) {
				added.push(name);
			} else if (priorHash === hash) {
				unchanged.push(name);
			} else {
				changed.push(name);
			}
		}

		for (const name of priorMap.keys()) {
			if (!currentMap.has(name)) {
				removed.push(name);
			}
		}

		return {
			serverId,
			unchanged,
			added,
			removed,
			changed,
			isClean:
				added.length === 0 && removed.length === 0 && changed.length === 0,
		};
	}

	getSnapshot(serverId: string): ManifestSnapshot | undefined {
		const snapshot = this.snapshots.get(serverId);
		return snapshot ? { ...snapshot, tools: [...snapshot.tools] } : undefined;
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashTool(tool: ToolInput): string {
	const payload = JSON.stringify({
		name: tool.name,
		description: tool.description,
		inputSchema: tool.inputSchema,
	});
	return crypto.createHash("sha256").update(payload).digest("hex");
}
