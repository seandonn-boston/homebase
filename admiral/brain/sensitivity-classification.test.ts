import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { SensitivityClassifier } from "./sensitivity-classification";

describe("SensitivityClassifier", () => {
	let classifier: SensitivityClassifier;

	beforeEach(() => {
		classifier = new SensitivityClassifier();
		classifier.grantClearance({
			agentId: "public-agent",
			clearanceLevel: "PUBLIC",
			grantedBy: "Admiral",
			grantedAt: new Date().toISOString(),
		});
		classifier.grantClearance({
			agentId: "internal-agent",
			clearanceLevel: "INTERNAL",
			grantedBy: "Admiral",
			grantedAt: new Date().toISOString(),
		});
		classifier.grantClearance({
			agentId: "admin-agent",
			clearanceLevel: "RESTRICTED",
			grantedBy: "Admiral",
			grantedAt: new Date().toISOString(),
		});
	});

	describe("classify", () => {
		it("classifies an entry", () => {
			const result = classifier.classify("e1", "CONFIDENTIAL", "agent-1");
			assert.equal(result.entryId, "e1");
			assert.equal(result.sensitivity, "CONFIDENTIAL");
			assert.ok(result.classifiedAt);
		});

		it("returns default level for unclassified entries", () => {
			assert.equal(classifier.getLevel("unknown"), "INTERNAL");
		});

		it("returns classified level", () => {
			classifier.classify("e1", "RESTRICTED", "agent-1");
			assert.equal(classifier.getLevel("e1"), "RESTRICTED");
		});
	});

	describe("access control", () => {
		it("allows access when clearance >= sensitivity", () => {
			classifier.classify("e1", "INTERNAL", "agent-1");
			const result = classifier.checkAccess("internal-agent", "e1");
			assert.equal(result.allowed, true);
		});

		it("allows higher clearance to access lower sensitivity", () => {
			classifier.classify("e1", "PUBLIC", "agent-1");
			const result = classifier.checkAccess("admin-agent", "e1");
			assert.equal(result.allowed, true);
		});

		it("blocks access when clearance < sensitivity", () => {
			classifier.classify("e1", "RESTRICTED", "agent-1");
			const result = classifier.checkAccess("public-agent", "e1");
			assert.equal(result.allowed, false);
			assert.ok(result.reason.includes("insufficient"));
		});

		it("blocks INTERNAL entries for PUBLIC agents", () => {
			classifier.classify("e1", "INTERNAL", "agent-1");
			const result = classifier.checkAccess("public-agent", "e1");
			assert.equal(result.allowed, false);
		});

		it("defaults unregistered agents to PUBLIC clearance", () => {
			classifier.classify("e1", "INTERNAL", "agent-1");
			const result = classifier.checkAccess("unknown-agent", "e1");
			assert.equal(result.allowed, false);
			assert.equal(result.agentClearance, "PUBLIC");
		});
	});

	describe("filterByAccess", () => {
		it("filters entries by agent clearance", () => {
			classifier.classify("e1", "PUBLIC", "a");
			classifier.classify("e2", "INTERNAL", "a");
			classifier.classify("e3", "CONFIDENTIAL", "a");
			classifier.classify("e4", "RESTRICTED", "a");

			const publicVisible = classifier.filterByAccess(
				["e1", "e2", "e3", "e4"],
				"public-agent",
			);
			assert.deepEqual(publicVisible, ["e1"]);

			const internalVisible = classifier.filterByAccess(
				["e1", "e2", "e3", "e4"],
				"internal-agent",
			);
			assert.deepEqual(internalVisible, ["e1", "e2"]);

			const adminVisible = classifier.filterByAccess(
				["e1", "e2", "e3", "e4"],
				"admin-agent",
			);
			assert.deepEqual(adminVisible, ["e1", "e2", "e3", "e4"]);
		});
	});

	describe("reclassify", () => {
		it("changes entry sensitivity", () => {
			classifier.classify("e1", "PUBLIC", "a");
			const record = classifier.reclassify(
				"e1",
				"CONFIDENTIAL",
				"admin",
				"Contains sensitive data",
			);
			assert.equal(record.previousLevel, "PUBLIC");
			assert.equal(record.newLevel, "CONFIDENTIAL");
			assert.equal(classifier.getLevel("e1"), "CONFIDENTIAL");
		});

		it("records in audit log", () => {
			classifier.classify("e1", "PUBLIC", "a");
			classifier.reclassify("e1", "INTERNAL", "admin", "Upgraded");
			const log = classifier.getReclassificationLog();
			assert.equal(log.length, 1);
			assert.equal(log[0].reason, "Upgraded");
		});
	});

	describe("bulkReclassify", () => {
		it("reclassifies multiple entries", () => {
			classifier.classify("e1", "PUBLIC", "a");
			classifier.classify("e2", "PUBLIC", "a");
			classifier.classify("e3", "INTERNAL", "a");

			const records = classifier.bulkReclassify(
				["e1", "e2", "e3"],
				"CONFIDENTIAL",
				"admin",
				"Bulk upgrade",
			);
			assert.equal(records.length, 3);
			assert.equal(classifier.getLevel("e1"), "CONFIDENTIAL");
			assert.equal(classifier.getLevel("e2"), "CONFIDENTIAL");
			assert.equal(classifier.getLevel("e3"), "CONFIDENTIAL");
		});
	});

	describe("getEntriesByLevel", () => {
		it("returns entries at specific level", () => {
			classifier.classify("e1", "PUBLIC", "a");
			classifier.classify("e2", "PUBLIC", "a");
			classifier.classify("e3", "INTERNAL", "a");

			assert.equal(classifier.getEntriesByLevel("PUBLIC").length, 2);
			assert.equal(classifier.getEntriesByLevel("INTERNAL").length, 1);
			assert.equal(classifier.getEntriesByLevel("RESTRICTED").length, 0);
		});
	});

	describe("static utilities", () => {
		it("compareLevels orders correctly", () => {
			assert.ok(SensitivityClassifier.compareLevels("PUBLIC", "RESTRICTED") < 0);
			assert.ok(SensitivityClassifier.compareLevels("RESTRICTED", "PUBLIC") > 0);
			assert.equal(SensitivityClassifier.compareLevels("INTERNAL", "INTERNAL"), 0);
		});

		it("isValidLevel validates", () => {
			assert.equal(SensitivityClassifier.isValidLevel("PUBLIC"), true);
			assert.equal(SensitivityClassifier.isValidLevel("SECRET"), false);
		});
	});
});
