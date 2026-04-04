import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
	PostgresSchemaManager,
	POSTGRES_MIGRATIONS,
} from "./postgres-schema";

describe("PostgresSchemaManager", () => {
	let manager: PostgresSchemaManager;

	beforeEach(() => {
		manager = new PostgresSchemaManager();
	});

	describe("migrations definition", () => {
		it("has 5 migrations", () => {
			assert.equal(POSTGRES_MIGRATIONS.length, 5);
		});

		it("migrations are sequentially versioned", () => {
			for (let i = 0; i < POSTGRES_MIGRATIONS.length; i++) {
				assert.equal(POSTGRES_MIGRATIONS[i].version, i + 1);
			}
		});

		it("all migrations have up and down SQL", () => {
			for (const m of POSTGRES_MIGRATIONS) {
				assert.ok(m.up.length > 0, `Migration ${m.version} missing up SQL`);
				assert.ok(m.down.length > 0, `Migration ${m.version} missing down SQL`);
			}
		});

		it("migration 1 creates brain_entries", () => {
			assert.ok(POSTGRES_MIGRATIONS[0].up.includes("brain_entries"));
		});

		it("migration 2 creates brain_links", () => {
			assert.ok(POSTGRES_MIGRATIONS[1].up.includes("brain_links"));
		});

		it("migration 3 creates pgvector and brain_embeddings", () => {
			assert.ok(POSTGRES_MIGRATIONS[2].up.includes("vector"));
			assert.ok(POSTGRES_MIGRATIONS[2].up.includes("brain_embeddings"));
		});

		it("migration 4 creates audit and demand tables", () => {
			assert.ok(POSTGRES_MIGRATIONS[3].up.includes("brain_audit_log"));
			assert.ok(POSTGRES_MIGRATIONS[3].up.includes("demand_signals"));
		});

		it("migration 5 creates brain_meta", () => {
			assert.ok(POSTGRES_MIGRATIONS[4].up.includes("brain_meta"));
			assert.ok(POSTGRES_MIGRATIONS[4].up.includes("schema_version"));
		});
	});

	describe("migrateUp", () => {
		it("applies all migrations", () => {
			const result = manager.migrateUp();
			assert.equal(result.success, true);
			assert.equal(result.migrationsApplied, 5);
			assert.equal(result.toVersion, 5);
		});

		it("applies up to target version", () => {
			const result = manager.migrateUp(3);
			assert.equal(result.success, true);
			assert.equal(result.migrationsApplied, 3);
			assert.equal(result.toVersion, 3);
		});

		it("skips already applied", () => {
			manager.migrateUp(3);
			const result = manager.migrateUp(5);
			assert.equal(result.migrationsApplied, 2);
		});

		it("no-op when all applied", () => {
			manager.migrateUp();
			const result = manager.migrateUp();
			assert.equal(result.migrationsApplied, 0);
		});
	});

	describe("rollbackTo", () => {
		it("rolls back to target version", () => {
			manager.migrateUp();
			const result = manager.rollbackTo(2);
			assert.equal(result.success, true);
			assert.equal(result.toVersion, 2);
		});

		it("rolls back to version 0", () => {
			manager.migrateUp();
			const result = manager.rollbackTo(0);
			assert.equal(result.toVersion, 0);
		});
	});

	describe("getStatus", () => {
		it("shows pending migrations", () => {
			const status = manager.getStatus();
			assert.equal(status.currentVersion, 0);
			assert.equal(status.targetVersion, 5);
			assert.equal(status.pendingMigrations, 5);
		});

		it("shows applied migrations", () => {
			manager.migrateUp(3);
			const status = manager.getStatus();
			assert.equal(status.currentVersion, 3);
			assert.equal(status.pendingMigrations, 2);
			assert.deepEqual(status.appliedMigrations, [1, 2, 3]);
		});
	});

	describe("applyMigration", () => {
		it("rejects unknown version", () => {
			const result = manager.applyMigration(99);
			assert.equal(result.success, false);
		});

		it("rejects duplicate application", () => {
			manager.applyMigration(1);
			const result = manager.applyMigration(1);
			assert.equal(result.success, false);
		});
	});

	describe("connection pool config", () => {
		it("returns default config", () => {
			const config = PostgresSchemaManager.getDefaultPoolConfig();
			assert.equal(config.host, "localhost");
			assert.equal(config.port, 5432);
			assert.equal(config.database, "admiral_brain");
			assert.equal(config.maxConnections, 20);
			assert.equal(config.ssl, false);
		});
	});
});
