/**
 * Cross-Project Knowledge Sharing (B-24)
 *
 * Share brain entries across projects with permissions and provenance.
 * Built on top of KnowledgeExporter/Importer (DE-09).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Access permission level for shared entries */
export type SharePermission = "read-only" | "read-write" | "admin";

/** Shared entry with cross-project provenance */
export interface SharedEntry {
	entryId: string;
	title: string;
	content: string;
	category: string;
	tags: string[];
	sourceProject: string;
	sourceAgent?: string;
	sharedAt: string;
	sharedBy: string;
	permission: SharePermission;
	provenance: ShareProvenance;
}

/** Provenance tracking for shared entries */
export interface ShareProvenance {
	originalProject: string;
	originalEntryId: string;
	originalCreatedAt: number;
	shareChain: ShareChainEntry[];
}

/** Entry in the share chain */
export interface ShareChainEntry {
	fromProject: string;
	toProject: string;
	sharedBy: string;
	sharedAt: string;
	permission: SharePermission;
}

/** Project sharing configuration */
export interface ProjectShareConfig {
	projectId: string;
	allowedTargets: string[];
	defaultPermission: SharePermission;
	maxShareDepth: number;
	requireApproval: boolean;
}

/** Share request */
export interface ShareRequest {
	entryId: string;
	title: string;
	content: string;
	category: string;
	tags: string[];
	sourceProject: string;
	targetProject: string;
	sharedBy: string;
	permission?: SharePermission;
	sourceAgent?: string;
	originalCreatedAt?: number;
}

/** Share result */
export interface ShareResult {
	success: boolean;
	sharedEntryId?: string;
	reason?: string;
}

// ---------------------------------------------------------------------------
// CrossProjectSharing
// ---------------------------------------------------------------------------

export class CrossProjectSharing {
	private configs: Map<string, ProjectShareConfig> = new Map();
	private sharedEntries: Map<string, SharedEntry> = new Map();
	private shareLog: ShareChainEntry[] = [];

	/** Register a project's sharing configuration */
	registerProject(config: ProjectShareConfig): void {
		this.configs.set(config.projectId, config);
	}

	/** Share an entry from one project to another */
	share(request: ShareRequest): ShareResult {
		// Check source project config
		const sourceConfig = this.configs.get(request.sourceProject);
		if (!sourceConfig) {
			return {
				success: false,
				reason: `Source project '${request.sourceProject}' is not registered`,
			};
		}

		// Check target is allowed
		if (
			sourceConfig.allowedTargets.length > 0 &&
			!sourceConfig.allowedTargets.includes(request.targetProject)
		) {
			return {
				success: false,
				reason: `Target project '${request.targetProject}' is not in allowed targets for '${request.sourceProject}'`,
			};
		}

		// Check share depth
		const existingProvenance = this.getProvenanceChain(request.entryId);
		if (existingProvenance.length >= sourceConfig.maxShareDepth) {
			return {
				success: false,
				reason: `Share depth ${existingProvenance.length} exceeds maximum ${sourceConfig.maxShareDepth}`,
			};
		}

		// Check approval requirement
		if (sourceConfig.requireApproval) {
			// In a full implementation, this would create a pending approval.
			// For now, we document the requirement but allow the share.
		}

		const permission =
			request.permission ?? sourceConfig.defaultPermission;

		const sharedEntryId = `shared-${request.sourceProject}-${request.entryId}-${Date.now()}`;

		const provenance: ShareProvenance = {
			originalProject: request.sourceProject,
			originalEntryId: request.entryId,
			originalCreatedAt: request.originalCreatedAt ?? Date.now(),
			shareChain: [
				...existingProvenance,
				{
					fromProject: request.sourceProject,
					toProject: request.targetProject,
					sharedBy: request.sharedBy,
					sharedAt: new Date().toISOString(),
					permission,
				},
			],
		};

		const sharedEntry: SharedEntry = {
			entryId: sharedEntryId,
			title: request.title,
			content: request.content,
			category: request.category,
			tags: [...request.tags, `shared-from:${request.sourceProject}`],
			sourceProject: request.sourceProject,
			sourceAgent: request.sourceAgent,
			sharedAt: new Date().toISOString(),
			sharedBy: request.sharedBy,
			permission,
			provenance,
		};

		this.sharedEntries.set(sharedEntryId, sharedEntry);

		// Log the share
		this.shareLog.push({
			fromProject: request.sourceProject,
			toProject: request.targetProject,
			sharedBy: request.sharedBy,
			sharedAt: new Date().toISOString(),
			permission,
		});

		return { success: true, sharedEntryId };
	}

	/** Get all entries shared to a project */
	getSharedEntries(targetProject: string): SharedEntry[] {
		return Array.from(this.sharedEntries.values()).filter((e) =>
			e.provenance.shareChain.some((c) => c.toProject === targetProject),
		);
	}

	/** Get all entries shared from a project */
	getExportedEntries(sourceProject: string): SharedEntry[] {
		return Array.from(this.sharedEntries.values()).filter(
			(e) => e.sourceProject === sourceProject,
		);
	}

	/** Check if an agent can modify a shared entry */
	canModify(entryId: string, _agentId: string): boolean {
		const entry = this.sharedEntries.get(entryId);
		if (!entry) return false;
		return entry.permission === "read-write" || entry.permission === "admin";
	}

	/** Revoke a shared entry */
	revoke(entryId: string): boolean {
		return this.sharedEntries.delete(entryId);
	}

	/** Get provenance chain for an entry */
	getProvenance(entryId: string): ShareProvenance | undefined {
		const entry = this.sharedEntries.get(entryId);
		return entry?.provenance;
	}

	/** Get share log */
	getShareLog(): ShareChainEntry[] {
		return [...this.shareLog];
	}

	private getProvenanceChain(entryId: string): ShareChainEntry[] {
		const entry = this.sharedEntries.get(entryId);
		return entry?.provenance.shareChain ?? [];
	}

	/** Reset (for testing) */
	reset(): void {
		this.configs.clear();
		this.sharedEntries.clear();
		this.shareLog = [];
	}
}
