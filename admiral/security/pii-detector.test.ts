/**
 * Tests for PiiDetector (S-20)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PiiDetector } from "./pii-detector.js";

describe("PiiDetector", () => {
	const detector = new PiiDetector();

	describe("detectEmails", () => {
		it("should detect email addresses", () => {
			const results = detector.detectEmails("Contact user@example.com for info");
			assert.equal(results.length, 1);
			assert.equal(results[0].type, "email");
			assert.equal(results[0].match, "user@example.com");
		});

		it("should detect multiple emails", () => {
			const results = detector.detectEmails("a@b.com and c@d.org");
			assert.equal(results.length, 2);
		});
	});

	describe("detectSSN", () => {
		it("should detect SSN patterns", () => {
			const results = detector.detectSSN("SSN: 123-45-6789");
			assert.equal(results.length, 1);
			assert.equal(results[0].type, "ssn");
			assert.equal(results[0].redacted, "[SSN_REDACTED]");
		});

		it("should not match non-SSN numbers", () => {
			const results = detector.detectSSN("Phone: 1234567890");
			assert.equal(results.length, 0);
		});
	});

	describe("detectCreditCards", () => {
		it("should detect credit card numbers with spaces", () => {
			const results = detector.detectCreditCards("Card: 4111 1111 1111 1111");
			assert.equal(results.length, 1);
			assert.equal(results[0].type, "credit_card");
		});

		it("should detect credit card numbers with dashes", () => {
			const results = detector.detectCreditCards("Card: 4111-1111-1111-1111");
			assert.equal(results.length, 1);
		});
	});

	describe("detectApiKeys", () => {
		it("should detect OpenAI-style keys", () => {
			const results = detector.detectApiKeys("key: sk-abc123def456ghijklmn");
			assert.equal(results.length, 1);
			assert.equal(results[0].type, "api_key");
		});

		it("should detect GitHub tokens", () => {
			const results = detector.detectApiKeys("token: ghp_1234567890abcdefgh");
			assert.equal(results.length, 1);
		});

		it("should detect AWS keys", () => {
			const results = detector.detectApiKeys("key: AKIA1234567890ABCDEF");
			assert.equal(results.length, 1);
		});
	});

	describe("detectJWT", () => {
		it("should detect JWT tokens", () => {
			const jwt =
				"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
			const results = detector.detectJWT(`Bearer ${jwt}`);
			assert.equal(results.length, 1);
			assert.equal(results[0].type, "jwt");
		});
	});

	describe("detectPhones", () => {
		it("should detect US phone numbers", () => {
			const results = detector.detectPhones("Call (555) 123-4567");
			assert.equal(results.length, 1);
			assert.equal(results[0].type, "phone");
		});
	});

	describe("detectIpAddresses", () => {
		it("should detect valid IPv4 addresses", () => {
			const results = detector.detectIpAddresses("Server at 192.168.1.1");
			assert.equal(results.length, 1);
			assert.equal(results[0].type, "ip_address");
		});

		it("should reject invalid octets", () => {
			const results = detector.detectIpAddresses("Value 999.999.999.999");
			assert.equal(results.length, 0);
		});
	});

	describe("scan", () => {
		it("should detect multiple PII types in one scan", () => {
			const text =
				"Email admin@test.com, SSN 123-45-6789, key sk-abc123xyz456mnop";
			const results = detector.scan(text);
			assert.ok(results.length >= 3);
		});
	});

	describe("sanitize", () => {
		it("should return clean report for safe content", () => {
			const report = detector.sanitize("Hello world, no PII here.");
			assert.equal(report.clean, true);
			assert.equal(report.detections.length, 0);
			assert.equal(report.sanitizedContent, "Hello world, no PII here.");
		});

		it("should redact PII and return sanitized content", () => {
			const report = detector.sanitize("Contact user@example.com now");
			assert.equal(report.clean, false);
			assert.ok(report.sanitizedContent.includes("[EMAIL_REDACTED]"));
			assert.ok(!report.sanitizedContent.includes("user@example.com"));
		});
	});
});
