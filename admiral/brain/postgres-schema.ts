/**
 * Postgres + pgvector Schema Deployment (B-13)
 *
 * Migration definitions, rollback support, and connection pooling
 * configuration for Brain B3 production tier.
 *
 * Note: Actual Postgres deployment requires infrastructure. This module
 * provides the schema definitions, migration runner interface, and
 * connection pool configuration that a deployer would use.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Database migration step */
export interface PostgresMigration {
	version: number;
	description: string;
	up: string;
	down: string;
}

/** Connection pool configuration */
export interface ConnectionPoolConfig {
	host: string;
	port: number;
	database: string;
	user: string;
	password: string;
	maxConnections: number;
	idleTimeoutMs: number;
	connectionTimeoutMs: number;
	ssl: boolean;
}

/** Migration status */
export interface MigrationStatus {
	currentVersion: number;
	targetVersion: number;
	pendingMigrations: number;
	appliedMigrations: number[];
}

/** Migration result */
export interface MigrationResult {
	success: boolean;
	fromVersion: number;
	toVersion: number;
	migrationsApplied: number;
	errors: string[];
	duration: number;
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

export const POSTGRES_MIGRATIONS: PostgresMigration[] = [
	{
		version: 1,
		description: "Create brain_entries table with full-text search",
		up: `
			CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

			CREATE TABLE brain_entries (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				title TEXT NOT NULL,
				content TEXT NOT NULL,
				category TEXT NOT NULL DEFAULT '',
				scope TEXT NOT NULL DEFAULT '',
				tags JSONB NOT NULL DEFAULT '[]',
				created_at BIGINT NOT NULL,
				updated_at BIGINT NOT NULL,
				usefulness_score REAL NOT NULL DEFAULT 0,
				access_count INTEGER NOT NULL DEFAULT 0,
				source_agent TEXT,
				source_type TEXT,
				confidence REAL,
				superseded_by UUID REFERENCES brain_entries(id),
				contradicts JSONB NOT NULL DEFAULT '[]',
				metadata JSONB NOT NULL DEFAULT '{}'
			);

			CREATE INDEX idx_entries_category ON brain_entries(category);
			CREATE INDEX idx_entries_scope ON brain_entries(scope);
			CREATE INDEX idx_entries_created ON brain_entries(created_at);
			CREATE INDEX idx_entries_source_agent ON brain_entries(source_agent);

			-- Full-text search index using GIN
			CREATE INDEX idx_entries_fts ON brain_entries USING gin(
				to_tsvector('english', title || ' ' || content)
			);
		`,
		down: `
			DROP TABLE IF EXISTS brain_entries CASCADE;
		`,
	},
	{
		version: 2,
		description: "Create brain_links table for knowledge graph",
		up: `
			CREATE TABLE brain_links (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				from_entry UUID NOT NULL REFERENCES brain_entries(id) ON DELETE CASCADE,
				to_entry UUID NOT NULL REFERENCES brain_entries(id) ON DELETE CASCADE,
				link_type TEXT NOT NULL CHECK (link_type IN (
					'supports', 'contradicts', 'supersedes',
					'related_to', 'derived_from', 'caused_by'
				)),
				confidence REAL NOT NULL DEFAULT 1.0,
				created_at BIGINT NOT NULL,
				created_by TEXT,
				UNIQUE(from_entry, to_entry, link_type)
			);

			CREATE INDEX idx_links_from ON brain_links(from_entry);
			CREATE INDEX idx_links_to ON brain_links(to_entry);
			CREATE INDEX idx_links_type ON brain_links(link_type);
		`,
		down: `
			DROP TABLE IF EXISTS brain_links CASCADE;
		`,
	},
	{
		version: 3,
		description: "Create pgvector extension and embeddings table",
		up: `
			CREATE EXTENSION IF NOT EXISTS vector;

			CREATE TABLE brain_embeddings (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				entry_id UUID NOT NULL REFERENCES brain_entries(id) ON DELETE CASCADE,
				vector vector(1536),
				model_name TEXT NOT NULL,
				model_version TEXT NOT NULL,
				generated_at BIGINT NOT NULL,
				text_hash TEXT NOT NULL,
				UNIQUE(entry_id, model_name)
			);

			CREATE INDEX idx_embeddings_entry ON brain_embeddings(entry_id);
			CREATE INDEX idx_embeddings_model ON brain_embeddings(model_name, model_version);

			-- IVFFlat index for approximate nearest neighbor search
			-- Requires at least some rows to exist before building
			-- CREATE INDEX idx_embeddings_vector ON brain_embeddings
			--     USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);
		`,
		down: `
			DROP TABLE IF EXISTS brain_embeddings CASCADE;
			DROP EXTENSION IF EXISTS vector;
		`,
	},
	{
		version: 4,
		description: "Create demand_signals and audit tables",
		up: `
			CREATE TABLE demand_signals (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				query TEXT NOT NULL,
				timestamp BIGINT NOT NULL,
				agent_id TEXT,
				results_found INTEGER NOT NULL DEFAULT 0
			);

			CREATE INDEX idx_demand_timestamp ON demand_signals(timestamp);
			CREATE INDEX idx_demand_agent ON demand_signals(agent_id);

			CREATE TABLE brain_audit_log (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				operation TEXT NOT NULL,
				entry_id UUID REFERENCES brain_entries(id),
				agent_id TEXT NOT NULL,
				timestamp BIGINT NOT NULL,
				details JSONB NOT NULL DEFAULT '{}'
			);

			CREATE INDEX idx_audit_timestamp ON brain_audit_log(timestamp);
			CREATE INDEX idx_audit_agent ON brain_audit_log(agent_id);
			CREATE INDEX idx_audit_entry ON brain_audit_log(entry_id);
			CREATE INDEX idx_audit_operation ON brain_audit_log(operation);
		`,
		down: `
			DROP TABLE IF EXISTS brain_audit_log CASCADE;
			DROP TABLE IF EXISTS demand_signals CASCADE;
		`,
	},
	{
		version: 5,
		description: "Create schema version tracking table",
		up: `
			CREATE TABLE brain_meta (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL
			);

			INSERT INTO brain_meta(key, value) VALUES ('schema_version', '5');
			INSERT INTO brain_meta(key, value) VALUES ('tier', 'B3');
			INSERT INTO brain_meta(key, value) VALUES ('engine', 'postgres+pgvector');
		`,
		down: `
			DROP TABLE IF EXISTS brain_meta CASCADE;
		`,
	},
];

// ---------------------------------------------------------------------------
// PostgresSchemaManager
// ---------------------------------------------------------------------------

export class PostgresSchemaManager {
	private appliedVersions: Set<number> = new Set();
	private currentVersion = 0;

	/** Get all migration definitions */
	getMigrations(): PostgresMigration[] {
		return [...POSTGRES_MIGRATIONS];
	}

	/** Get the latest migration version */
	getLatestVersion(): number {
		return POSTGRES_MIGRATIONS.length > 0
			? POSTGRES_MIGRATIONS[POSTGRES_MIGRATIONS.length - 1].version
			: 0;
	}

	/** Simulate applying a migration (for testing — real impl uses pg client) */
	applyMigration(version: number): MigrationResult {
		const start = Date.now();
		const migration = POSTGRES_MIGRATIONS.find((m) => m.version === version);

		if (!migration) {
			return {
				success: false,
				fromVersion: this.currentVersion,
				toVersion: version,
				migrationsApplied: 0,
				errors: [`Migration version ${version} not found`],
				duration: Date.now() - start,
			};
		}

		if (this.appliedVersions.has(version)) {
			return {
				success: false,
				fromVersion: this.currentVersion,
				toVersion: version,
				migrationsApplied: 0,
				errors: [`Migration ${version} already applied`],
				duration: Date.now() - start,
			};
		}

		this.appliedVersions.add(version);
		this.currentVersion = version;

		return {
			success: true,
			fromVersion: version - 1,
			toVersion: version,
			migrationsApplied: 1,
			errors: [],
			duration: Date.now() - start,
		};
	}

	/** Apply all pending migrations up to target version */
	migrateUp(targetVersion?: number): MigrationResult {
		const target = targetVersion ?? this.getLatestVersion();
		const start = Date.now();
		const errors: string[] = [];
		let applied = 0;
		const fromVersion = this.currentVersion;

		for (const migration of POSTGRES_MIGRATIONS) {
			if (migration.version <= this.currentVersion) continue;
			if (migration.version > target) break;

			const result = this.applyMigration(migration.version);
			if (!result.success) {
				errors.push(...result.errors);
				break;
			}
			applied++;
		}

		return {
			success: errors.length === 0,
			fromVersion,
			toVersion: this.currentVersion,
			migrationsApplied: applied,
			errors,
			duration: Date.now() - start,
		};
	}

	/** Rollback to a specific version */
	rollbackTo(targetVersion: number): MigrationResult {
		const start = Date.now();
		const fromVersion = this.currentVersion;
		let rolled = 0;

		const reversedMigrations = [...POSTGRES_MIGRATIONS].reverse();
		for (const migration of reversedMigrations) {
			if (migration.version <= targetVersion) break;
			if (this.appliedVersions.has(migration.version)) {
				this.appliedVersions.delete(migration.version);
				rolled++;
			}
		}

		this.currentVersion = targetVersion;

		return {
			success: true,
			fromVersion,
			toVersion: targetVersion,
			migrationsApplied: rolled,
			errors: [],
			duration: Date.now() - start,
		};
	}

	/** Get current migration status */
	getStatus(): MigrationStatus {
		return {
			currentVersion: this.currentVersion,
			targetVersion: this.getLatestVersion(),
			pendingMigrations: this.getLatestVersion() - this.currentVersion,
			appliedMigrations: [...this.appliedVersions].sort((a, b) => a - b),
		};
	}

	/** Get default connection pool config */
	static getDefaultPoolConfig(): ConnectionPoolConfig {
		return {
			host: process.env.BRAIN_PG_HOST ?? "localhost",
			port: Number.parseInt(process.env.BRAIN_PG_PORT ?? "5432", 10),
			database: process.env.BRAIN_PG_DATABASE ?? "admiral_brain",
			user: process.env.BRAIN_PG_USER ?? "admiral",
			password: process.env.BRAIN_PG_PASSWORD ?? "",
			maxConnections: Number.parseInt(process.env.BRAIN_PG_MAX_CONNECTIONS ?? "20", 10),
			idleTimeoutMs: 30_000,
			connectionTimeoutMs: 5_000,
			ssl: process.env.BRAIN_PG_SSL === "true",
		};
	}

	/** Reset (for testing) */
	reset(): void {
		this.appliedVersions.clear();
		this.currentVersion = 0;
	}
}
