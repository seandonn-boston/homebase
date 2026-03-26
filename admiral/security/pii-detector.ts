/**
 * PII Detector (S-20)
 *
 * Scans content for personally identifiable information and secrets.
 * Provides detection and sanitization (redaction) capabilities.
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PiiDetection {
	type:
		| "email"
		| "ssn"
		| "credit_card"
		| "api_key"
		| "jwt"
		| "phone"
		| "ip_address";
	match: string;
	position: number;
	redacted: string;
}

export interface SanitizationReport {
	clean: boolean;
	detections: PiiDetection[];
	sanitizedContent: string;
}

// ---------------------------------------------------------------------------
// PiiDetector
// ---------------------------------------------------------------------------

export class PiiDetector {
	constructor() {
		// stateless
	}

	/** Scan content for all PII types. */
	scan(content: string): PiiDetection[] {
		return [
			...this.detectEmails(content),
			...this.detectSSN(content),
			...this.detectCreditCards(content),
			...this.detectApiKeys(content),
			...this.detectJWT(content),
			...this.detectPhones(content),
			...this.detectIpAddresses(content),
		];
	}

	/** Scan and sanitize content, replacing PII with redaction markers. */
	sanitize(content: string): SanitizationReport {
		const detections = this.scan(content);

		if (detections.length === 0) {
			return { clean: true, detections: [], sanitizedContent: content };
		}

		// Sort detections by position descending so we can replace from end
		const sorted = [...detections].sort(
			(a, b) => b.position - a.position,
		);
		let sanitized = content;

		for (const d of sorted) {
			sanitized =
				sanitized.slice(0, d.position) +
				d.redacted +
				sanitized.slice(d.position + d.match.length);
		}

		return {
			clean: false,
			detections,
			sanitizedContent: sanitized,
		};
	}

	/** Detect email addresses. */
	detectEmails(content: string): PiiDetection[] {
		const pattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
		return this.findAll(content, pattern, "email", (m) => "[EMAIL_REDACTED]");
	}

	/** Detect SSN patterns (XXX-XX-XXXX). */
	detectSSN(content: string): PiiDetection[] {
		const pattern = /\b\d{3}-\d{2}-\d{4}\b/g;
		return this.findAll(content, pattern, "ssn", (m) => "[SSN_REDACTED]");
	}

	/** Detect credit card numbers. */
	detectCreditCards(content: string): PiiDetection[] {
		const pattern = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
		return this.findAll(
			content,
			pattern,
			"credit_card",
			(m) => "[CC_REDACTED]",
		);
	}

	/** Detect API keys (sk-, ghp_, gho_, ghu_, ghs_, ghr_, AKIA). */
	detectApiKeys(content: string): PiiDetection[] {
		const pattern =
			/(?:sk-|ghp_|gho_|ghu_|ghs_|ghr_|AKIA)[A-Za-z0-9]{10,}/g;
		return this.findAll(
			content,
			pattern,
			"api_key",
			(m) => "[API_KEY_REDACTED]",
		);
	}

	/** Detect JWT tokens. */
	detectJWT(content: string): PiiDetection[] {
		const pattern =
			/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
		return this.findAll(content, pattern, "jwt", (m) => "[JWT_REDACTED]");
	}

	/** Detect phone numbers. */
	detectPhones(content: string): PiiDetection[] {
		const pattern =
			/(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
		return this.findAll(
			content,
			pattern,
			"phone",
			(m) => "[PHONE_REDACTED]",
		);
	}

	/** Detect IP addresses (IPv4). */
	detectIpAddresses(content: string): PiiDetection[] {
		const pattern = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
		return this.findAll(
			content,
			pattern,
			"ip_address",
			(m) => "[IP_REDACTED]",
		).filter((d) => {
			// Validate octets are 0-255
			const octets = d.match.split(".").map(Number);
			return octets.every((o) => o >= 0 && o <= 255);
		});
	}

	// -----------------------------------------------------------------------
	// Private helpers
	// -----------------------------------------------------------------------

	private findAll(
		content: string,
		pattern: RegExp,
		type: PiiDetection["type"],
		redactFn: (match: string) => string,
	): PiiDetection[] {
		const detections: PiiDetection[] = [];
		let match: RegExpExecArray | null;

		while ((match = pattern.exec(content)) !== null) {
			detections.push({
				type,
				match: match[0],
				position: match.index,
				redacted: redactFn(match[0]),
			});
		}

		return detections;
	}
}
