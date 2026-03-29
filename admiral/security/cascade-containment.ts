/**
 * Cascade Containment Circuit Breakers (SEC-14)
 *
 * On MCP server compromise:
 * 1. Quarantine all Brain entries written by agents that used the flagged server
 * 2. Suspend A2A connections for affected agents
 * 3. Compute contamination graph tracing data lineage through agents and entries
 *
 * Analogous to epoch-based trust revocation applied to data integrity.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Compromised server record */
export interface CompromisedServer {
	serverId: string;
	detectedAt: string;
	reason: string;
	severity: "critical" | "high" | "medium";
}

/** Quarantined Brain entry */
export interface QuarantinedEntry {
	entryId: string;
	originalServer: string;
	writtenByAgent: string;
	quarantinedAt: string;
	reason: string;
	status: "quarantined" | "reviewed" | "restored" | "deleted";
}

/** Agent connection suspension */
export interface SuspendedConnection {
	agentId: string;
	suspendedAt: string;
	reason: string;
	affectedServer: string;
	status: "suspended" | "reviewed" | "restored";
}

/** Node in the contamination graph */
export interface ContaminationNode {
	type: "server" | "agent" | "entry";
	id: string;
	contaminatedAt: string;
	contaminationPath: string[];
	depth: number;
}

/** Edge in the contamination graph */
export interface ContaminationEdge {
	from: string;
	to: string;
	relationship: "used_server" | "wrote_entry" | "read_entry" | "delegated_to" | "received_a2a";
}

/** Full contamination graph */
export interface ContaminationGraph {
	nodes: ContaminationNode[];
	edges: ContaminationEdge[];
	rootServer: string;
	computedAt: string;
	totalAffectedAgents: number;
	totalAffectedEntries: number;
}

/** Agent-server usage record */
export interface AgentServerUsage {
	agentId: string;
	serverId: string;
	lastUsed: string;
}

/** Brain entry provenance record */
export interface EntryProvenance {
	entryId: string;
	writtenBy: string;
	sourceServer?: string;
	readBy: string[];
}

// ---------------------------------------------------------------------------
// CascadeContainment
// ---------------------------------------------------------------------------

export class CascadeContainment {
	private compromisedServers: Map<string, CompromisedServer> = new Map();
	private quarantinedEntries: Map<string, QuarantinedEntry> = new Map();
	private suspendedConnections: Map<string, SuspendedConnection> = new Map();
	private agentServerUsage: AgentServerUsage[] = [];
	private entryProvenance: EntryProvenance[] = [];
	private agentDelegations: Array<{ from: string; to: string }> = [];

	/** Register agent-server usage for tracking */
	recordUsage(agentId: string, serverId: string): void {
		this.agentServerUsage.push({
			agentId,
			serverId,
			lastUsed: new Date().toISOString(),
		});
	}

	/** Register Brain entry provenance */
	recordEntryProvenance(entry: EntryProvenance): void {
		this.entryProvenance.push(entry);
	}

	/** Register agent delegation */
	recordDelegation(fromAgent: string, toAgent: string): void {
		this.agentDelegations.push({ from: fromAgent, to: toAgent });
	}

	/**
	 * Trigger circuit breaker on server compromise.
	 * Returns the contamination graph for the incident.
	 */
	triggerBreaker(server: CompromisedServer): ContaminationGraph {
		this.compromisedServers.set(server.serverId, server);

		// Step 1: Find all agents that used this server
		const affectedAgentIds = new Set<string>();
		for (const usage of this.agentServerUsage) {
			if (usage.serverId === server.serverId) {
				affectedAgentIds.add(usage.agentId);
			}
		}

		// Step 2: Quarantine Brain entries from affected agents
		for (const prov of this.entryProvenance) {
			if (affectedAgentIds.has(prov.writtenBy) || prov.sourceServer === server.serverId) {
				this.quarantinedEntries.set(prov.entryId, {
					entryId: prov.entryId,
					originalServer: prov.sourceServer ?? server.serverId,
					writtenByAgent: prov.writtenBy,
					quarantinedAt: new Date().toISOString(),
					reason: `Server '${server.serverId}' compromised: ${server.reason}`,
					status: "quarantined",
				});
			}
		}

		// Step 3: Suspend A2A connections for affected agents
		for (const agentId of affectedAgentIds) {
			this.suspendedConnections.set(agentId, {
				agentId,
				suspendedAt: new Date().toISOString(),
				reason: `Agent used compromised server '${server.serverId}'`,
				affectedServer: server.serverId,
				status: "suspended",
			});
		}

		// Step 4: Compute contamination graph
		return this.computeContaminationGraph(server.serverId, affectedAgentIds);
	}

	/** Compute the contamination graph for a compromised server */
	private computeContaminationGraph(
		serverId: string,
		directAgents: Set<string>,
	): ContaminationGraph {
		const nodes: ContaminationNode[] = [];
		const edges: ContaminationEdge[] = [];
		const visited = new Set<string>();

		// Root: the compromised server
		nodes.push({
			type: "server",
			id: serverId,
			contaminatedAt: new Date().toISOString(),
			contaminationPath: [serverId],
			depth: 0,
		});
		visited.add(`server:${serverId}`);

		// Depth 1: directly affected agents
		for (const agentId of directAgents) {
			const key = `agent:${agentId}`;
			if (!visited.has(key)) {
				nodes.push({
					type: "agent",
					id: agentId,
					contaminatedAt: new Date().toISOString(),
					contaminationPath: [serverId, agentId],
					depth: 1,
				});
				edges.push({
					from: serverId,
					to: agentId,
					relationship: "used_server",
				});
				visited.add(key);
			}
		}

		// Depth 2: entries written by affected agents
		const affectedEntryIds = new Set<string>();
		for (const prov of this.entryProvenance) {
			if (directAgents.has(prov.writtenBy) || prov.sourceServer === serverId) {
				const key = `entry:${prov.entryId}`;
				if (!visited.has(key)) {
					nodes.push({
						type: "entry",
						id: prov.entryId,
						contaminatedAt: new Date().toISOString(),
						contaminationPath: [serverId, prov.writtenBy, prov.entryId],
						depth: 2,
					});
					edges.push({
						from: prov.writtenBy,
						to: prov.entryId,
						relationship: "wrote_entry",
					});
					visited.add(key);
					affectedEntryIds.add(prov.entryId);
				}
			}
		}

		// Depth 3: agents that read affected entries (secondary contamination)
		const secondaryAgents = new Set<string>();
		for (const prov of this.entryProvenance) {
			if (affectedEntryIds.has(prov.entryId)) {
				for (const readerId of prov.readBy) {
					if (!directAgents.has(readerId)) {
						secondaryAgents.add(readerId);
						const key = `agent:${readerId}`;
						if (!visited.has(key)) {
							nodes.push({
								type: "agent",
								id: readerId,
								contaminatedAt: new Date().toISOString(),
								contaminationPath: [serverId, "...", prov.entryId, readerId],
								depth: 3,
							});
							edges.push({
								from: prov.entryId,
								to: readerId,
								relationship: "read_entry",
							});
							visited.add(key);
						}
					}
				}
			}
		}

		// Depth 3+: delegation chain contamination
		for (const delegation of this.agentDelegations) {
			if (directAgents.has(delegation.from) || secondaryAgents.has(delegation.from)) {
				const key = `agent:${delegation.to}`;
				if (!visited.has(key)) {
					nodes.push({
						type: "agent",
						id: delegation.to,
						contaminatedAt: new Date().toISOString(),
						contaminationPath: [serverId, "...", delegation.from, delegation.to],
						depth: 3,
					});
					edges.push({
						from: delegation.from,
						to: delegation.to,
						relationship: "delegated_to",
					});
					visited.add(key);
				}
			}
		}

		const totalAgents = nodes.filter((n) => n.type === "agent").length;
		const totalEntries = nodes.filter((n) => n.type === "entry").length;

		return {
			nodes,
			edges,
			rootServer: serverId,
			computedAt: new Date().toISOString(),
			totalAffectedAgents: totalAgents,
			totalAffectedEntries: totalEntries,
		};
	}

	/** Check if a server is compromised */
	isCompromised(serverId: string): boolean {
		return this.compromisedServers.has(serverId);
	}

	/** Check if an entry is quarantined */
	isQuarantined(entryId: string): boolean {
		const entry = this.quarantinedEntries.get(entryId);
		return entry?.status === "quarantined";
	}

	/** Check if an agent's connections are suspended */
	isSuspended(agentId: string): boolean {
		const conn = this.suspendedConnections.get(agentId);
		return conn?.status === "suspended";
	}

	/** Restore a quarantined entry after review */
	restoreEntry(entryId: string): void {
		const entry = this.quarantinedEntries.get(entryId);
		if (entry) entry.status = "restored";
	}

	/** Restore an agent's connections after review */
	restoreAgent(agentId: string): void {
		const conn = this.suspendedConnections.get(agentId);
		if (conn) conn.status = "restored";
	}

	/** Get all quarantined entries */
	getQuarantinedEntries(): QuarantinedEntry[] {
		return Array.from(this.quarantinedEntries.values()).filter(
			(e) => e.status === "quarantined",
		);
	}

	/** Get all suspended agents */
	getSuspendedAgents(): SuspendedConnection[] {
		return Array.from(this.suspendedConnections.values()).filter(
			(c) => c.status === "suspended",
		);
	}

	/** Reset (for testing) */
	reset(): void {
		this.compromisedServers.clear();
		this.quarantinedEntries.clear();
		this.suspendedConnections.clear();
		this.agentServerUsage = [];
		this.entryProvenance = [];
		this.agentDelegations = [];
	}
}
