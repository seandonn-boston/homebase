/**
 * Tests for CanaryFramework (M-14).
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CanaryFramework } from "./canary.js";

describe("CanaryFramework", () => {
	it("creates a canary with unique data", () => {
		const framework = new CanaryFramework();
		const canary = framework.createCanary("srv-1");
		assert.ok(canary.id.startsWith("canary_"));
		assert.equal(canary.serverId, "srv-1");
		assert.ok(canary.data.length > 0);
		assert.equal(canary.passedThrough, false);
		assert.equal(canary.modifiedInTransit, false);
		assert.equal(canary.detectedInEgress, false);
	});

	it("verifyCanary detects unmodified response", () => {
		const framework = new CanaryFramework();
		const canary = framework.createCanary("srv-1");
		const verified = framework.verifyCanary(canary.id, canary.data);
		assert.equal(verified.passedThrough, true);
		assert.equal(verified.modifiedInTransit, false);
	});

	it("verifyCanary detects modified response", () => {
		const framework = new CanaryFramework();
		const canary = framework.createCanary("srv-1");
		const verified = framework.verifyCanary(canary.id, "tampered-data");
		assert.equal(verified.passedThrough, true);
		assert.equal(verified.modifiedInTransit, true);
	});

	it("checkEgress detects canary data in egress", () => {
		const framework = new CanaryFramework();
		const canary = framework.createCanary("srv-1");
		const result = framework.checkEgress(
			canary.id,
			`leaked: ${canary.data} in outbound`,
		);
		assert.equal(result.detectedInEgress, true);
	});

	it("getCompromised returns only compromised canaries", () => {
		const framework = new CanaryFramework();
		const canary1 = framework.createCanary("srv-1");
		const canary2 = framework.createCanary("srv-2");
		// canary1: modified in transit
		framework.verifyCanary(canary1.id, "tampered");
		// canary2: clean
		framework.verifyCanary(canary2.id, canary2.data);
		const compromised = framework.getCompromised();
		assert.equal(compromised.length, 1);
		assert.equal(compromised[0].id, canary1.id);
	});

	it("getCanaries filters by serverId", () => {
		const framework = new CanaryFramework();
		framework.createCanary("srv-1");
		framework.createCanary("srv-2");
		framework.createCanary("srv-1");
		assert.equal(framework.getCanaries("srv-1").length, 2);
		assert.equal(framework.getCanaries("srv-2").length, 1);
		assert.equal(framework.getCanaries().length, 3);
	});
});
