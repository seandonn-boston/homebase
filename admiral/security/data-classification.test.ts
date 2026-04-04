import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { DataClassifier } from "./data-classification";
import type {
	SensitivityLevel,
	ClassificationTag,
	TransferApproval,
} from "./data-classification";

describe("DataClassifier", () => {
	let classifier: DataClassifier;

	beforeEach(() => {
		classifier = new DataClassifier();
		classifier.registerServer({
			serverName: "brain-server",
			maxReceiveCeiling: "CONFIDENTIAL",
			defaultOutputClassification: "INTERNAL",
		});
		classifier.registerServer({
			serverName: "public-api",
			maxReceiveCeiling: "PUBLIC",
			defaultOutputClassification: "PUBLIC",
		});
		classifier.registerServer({
			serverName: "admin-server",
			maxReceiveCeiling: "RESTRICTED",
			defaultOutputClassification: "CONFIDENTIAL",
		});
	});

	describe("classify", () => {
		it("uses server default output classification", () => {
			const tag = classifier.classify("some data", "brain-server", "agent-1");
			assert.equal(tag.level, "INTERNAL");
			assert.equal(tag.sourceServer, "brain-server");
			assert.equal(tag.sourceAgent, "agent-1");
			assert.ok(tag.classifiedAt);
		});

		it("uses explicit level when provided", () => {
			const tag = classifier.classify(
				"secret data",
				"brain-server",
				"agent-1",
				"RESTRICTED",
			);
			assert.equal(tag.level, "RESTRICTED");
		});

		it("defaults to INTERNAL for unknown servers", () => {
			const tag = classifier.classify("data", "unknown-server", "agent-1");
			assert.equal(tag.level, "INTERNAL");
		});
	});

	describe("checkFlow", () => {
		it("allows data within ceiling", () => {
			const tag: ClassificationTag = {
				level: "PUBLIC",
				sourceServer: "public-api",
				sourceAgent: "agent-1",
				classifiedAt: new Date().toISOString(),
			};
			const result = classifier.checkFlow(tag, "brain-server");
			assert.equal(result.allowed, true);
			assert.equal(result.requiresApproval, false);
		});

		it("allows data at exact ceiling", () => {
			const tag: ClassificationTag = {
				level: "CONFIDENTIAL",
				sourceServer: "admin-server",
				sourceAgent: "agent-1",
				classifiedAt: new Date().toISOString(),
			};
			const result = classifier.checkFlow(tag, "brain-server");
			assert.equal(result.allowed, true);
		});

		it("blocks data exceeding ceiling", () => {
			const tag: ClassificationTag = {
				level: "CONFIDENTIAL",
				sourceServer: "admin-server",
				sourceAgent: "agent-1",
				classifiedAt: new Date().toISOString(),
			};
			const result = classifier.checkFlow(tag, "public-api");
			assert.equal(result.allowed, false);
			assert.equal(result.requiresApproval, true);
			assert.ok(result.reason.includes("Admiral approval required"));
		});

		it("blocks RESTRICTED data to INTERNAL ceiling", () => {
			const tag: ClassificationTag = {
				level: "RESTRICTED",
				sourceServer: "admin-server",
				sourceAgent: "agent-1",
				classifiedAt: new Date().toISOString(),
			};
			const result = classifier.checkFlow(tag, "brain-server");
			assert.equal(result.allowed, false);
			assert.equal(result.sourceLevel, "RESTRICTED");
			assert.equal(result.targetCeiling, "CONFIDENTIAL");
		});

		it("blocks unknown target servers", () => {
			const tag: ClassificationTag = {
				level: "PUBLIC",
				sourceServer: "public-api",
				sourceAgent: "agent-1",
				classifiedAt: new Date().toISOString(),
			};
			const result = classifier.checkFlow(tag, "unknown-server");
			assert.equal(result.allowed, false);
			assert.ok(result.reason.includes("no sensitivity configuration"));
		});

		it("records violations", () => {
			const tag: ClassificationTag = {
				level: "RESTRICTED",
				sourceServer: "admin-server",
				sourceAgent: "agent-1",
				classifiedAt: new Date().toISOString(),
			};
			classifier.checkFlow(tag, "public-api");
			const violations = classifier.getViolations();
			assert.equal(violations.length, 1);
			assert.equal(violations[0].sourceLevel, "RESTRICTED");
		});
	});

	describe("transfer approvals", () => {
		it("allows blocked transfer with valid approval", () => {
			const approval: TransferApproval = {
				id: "approval-1",
				fromServer: "admin-server",
				toServer: "public-api",
				dataClassification: "CONFIDENTIAL",
				approvedBy: "Admiral",
				approvedAt: new Date().toISOString(),
			};
			classifier.recordApproval(approval);

			const tag: ClassificationTag = {
				level: "CONFIDENTIAL",
				sourceServer: "admin-server",
				sourceAgent: "agent-1",
				classifiedAt: new Date().toISOString(),
			};
			const result = classifier.checkFlow(tag, "public-api");
			assert.equal(result.allowed, true);
			assert.ok(result.reason.includes("approved by Admiral"));
		});

		it("rejects expired approval", () => {
			const approval: TransferApproval = {
				id: "approval-2",
				fromServer: "admin-server",
				toServer: "public-api",
				dataClassification: "CONFIDENTIAL",
				approvedBy: "Admiral",
				approvedAt: "2024-01-01T00:00:00Z",
				expiresAt: "2024-01-02T00:00:00Z",
			};
			classifier.recordApproval(approval);

			const tag: ClassificationTag = {
				level: "CONFIDENTIAL",
				sourceServer: "admin-server",
				sourceAgent: "agent-1",
				classifiedAt: new Date().toISOString(),
			};
			const result = classifier.checkFlow(tag, "public-api");
			assert.equal(result.allowed, false);
		});
	});

	describe("provenance tracking", () => {
		it("creates provenance chain from classification tag", () => {
			const tag = classifier.classify("data", "brain-server", "agent-1");
			const chain = classifier.createProvenanceChain(tag);
			assert.equal(chain.originTag, tag);
			assert.equal(chain.chain.length, 1);
			assert.equal(chain.chain[0].server, "brain-server");
			assert.equal(chain.chain[0].action, "write");
		});

		it("appends provenance entries", () => {
			const tag = classifier.classify("data", "brain-server", "agent-1");
			let chain = classifier.createProvenanceChain(tag);
			chain = classifier.appendProvenance(chain, {
				server: "admin-server",
				agent: "agent-2",
				action: "read",
				timestamp: new Date().toISOString(),
			});
			chain = classifier.appendProvenance(chain, {
				server: "admin-server",
				agent: "agent-2",
				action: "transform",
				timestamp: new Date().toISOString(),
			});
			assert.equal(chain.chain.length, 3);
			assert.equal(chain.chain[1].action, "read");
			assert.equal(chain.chain[2].action, "transform");
		});

		it("preserves classification through chain", () => {
			const tag = classifier.classify(
				"secret",
				"admin-server",
				"agent-1",
				"CONFIDENTIAL",
			);
			let chain = classifier.createProvenanceChain(tag);
			chain = classifier.appendProvenance(chain, {
				server: "brain-server",
				agent: "agent-2",
				action: "transfer",
				timestamp: new Date().toISOString(),
			});
			assert.equal(chain.chain[1].classification, "CONFIDENTIAL");
		});
	});

	describe("static utilities", () => {
		it("compareLevels orders correctly", () => {
			assert.ok(DataClassifier.compareLevels("PUBLIC", "INTERNAL") < 0);
			assert.ok(DataClassifier.compareLevels("RESTRICTED", "PUBLIC") > 0);
			assert.equal(DataClassifier.compareLevels("INTERNAL", "INTERNAL"), 0);
			assert.ok(DataClassifier.compareLevels("CONFIDENTIAL", "RESTRICTED") < 0);
		});

		it("isValidLevel validates correctly", () => {
			assert.equal(DataClassifier.isValidLevel("PUBLIC"), true);
			assert.equal(DataClassifier.isValidLevel("INTERNAL"), true);
			assert.equal(DataClassifier.isValidLevel("CONFIDENTIAL"), true);
			assert.equal(DataClassifier.isValidLevel("RESTRICTED"), true);
			assert.equal(DataClassifier.isValidLevel("SECRET"), false);
			assert.equal(DataClassifier.isValidLevel(""), false);
		});
	});

	describe("server configuration", () => {
		it("returns registered config", () => {
			const config = classifier.getServerConfig("brain-server");
			assert.ok(config);
			assert.equal(config.maxReceiveCeiling, "CONFIDENTIAL");
		});

		it("returns undefined for unknown server", () => {
			assert.equal(classifier.getServerConfig("unknown"), undefined);
		});

		it("lists all registered servers", () => {
			const configs = classifier.getAllServerConfigs();
			assert.equal(configs.length, 3);
		});
	});

	describe("reset", () => {
		it("clears all state", () => {
			const tag: ClassificationTag = {
				level: "RESTRICTED",
				sourceServer: "admin-server",
				sourceAgent: "agent-1",
				classifiedAt: new Date().toISOString(),
			};
			classifier.checkFlow(tag, "public-api");
			classifier.reset();
			assert.equal(classifier.getViolations().length, 0);
			assert.equal(classifier.getAllServerConfigs().length, 0);
		});
	});
});
