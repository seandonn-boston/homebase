/**
 * Knowledge Harvester (DE-04)
 *
 * Extracts knowledge from development artifacts: git diffs, PR descriptions,
 * commit messages, and code reviews. Produces ProposedEntry objects for
 * brain ingestion. Filters sensitive content before proposal.
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HarvestSource {
	type: "git_diff" | "pr_description" | "commit_message" | "code_review";
	content: string;
	timestamp: number;
	author?: string;
}

export interface HarvestResult {
	entries: ProposedEntry[];
	source: HarvestSource;
}

export interface ProposedEntry {
	title: string;
	content: string;
	category: string;
	tags: string[];
	sourceAttribution: string;
	confidence: number;
}

// ---------------------------------------------------------------------------
// Sensitive content patterns
// ---------------------------------------------------------------------------

const SENSITIVE_PATTERNS: RegExp[] = [
	// API keys / tokens
	/(?:sk-|ghp_|gho_|ghu_|ghs_|ghr_|AKIA)[A-Za-z0-9]{10,}/,
	// JWT tokens
	/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
	// Email addresses (basic)
	/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
	// SSN
	/\b\d{3}-\d{2}-\d{4}\b/,
	// Credit card (basic Luhn-candidate 16-digit)
	/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
	// Generic secrets in key=value form
	/(?:password|secret|token|api_key|apikey|auth)\s*[:=]\s*['"][^'"]{8,}['"]/i,
];

// ---------------------------------------------------------------------------
// KnowledgeHarvester
// ---------------------------------------------------------------------------

export class KnowledgeHarvester {
	harvest(source: HarvestSource): HarvestResult {
		let entries: ProposedEntry[];

		switch (source.type) {
			case "git_diff":
				entries = this.extractFromDiff(source.content);
				break;
			case "pr_description":
				entries = this.extractFromPR(source.content);
				break;
			case "commit_message":
				entries = this.extractFromCommit(source.content);
				break;
			case "code_review":
				entries = this.extractFromCodeReview(source.content);
				break;
			default:
				entries = [];
		}

		// Attribute and filter
		entries = entries
			.map((e) => ({
				...e,
				sourceAttribution: source.author ?? e.sourceAttribution ?? "unknown",
			}))
			.filter((e) => !this.filterSensitive(e));

		return { entries, source };
	}

	/** Extract knowledge from git diff: new patterns, removed patterns, renamed concepts. */
	extractFromDiff(diff: string): ProposedEntry[] {
		const entries: ProposedEntry[] = [];
		const lines = diff.split("\n");

		// Detect new file additions
		const _newFiles: string[] = [];
		const removedFiles: string[] = [];
		const modifiedFiles: string[] = [];

		for (const line of lines) {
			if (line.startsWith("+++ b/")) {
				const file = line.slice(6);
				if (file !== "/dev/null") modifiedFiles.push(file);
			}
			if (line.startsWith("--- a/") && lines.includes("+++ /dev/null")) {
				removedFiles.push(line.slice(6));
			}
		}

		// Extract new exports / function signatures from added lines
		const addedLines = lines
			.filter((l) => l.startsWith("+") && !l.startsWith("+++"))
			.map((l) => l.slice(1));

		const exportPattern =
			/export\s+(?:class|function|interface|type|const|enum)\s+(\w+)/;
		const newExports: string[] = [];

		for (const line of addedLines) {
			const match = line.match(exportPattern);
			if (match) newExports.push(match[1]);
		}

		if (newExports.length > 0) {
			entries.push({
				title: `New exports: ${newExports.slice(0, 5).join(", ")}`,
				content: `Added exports: ${newExports.join(", ")}. Files modified: ${modifiedFiles.slice(0, 5).join(", ")}`,
				category: "code_change",
				tags: ["export", "api", ...newExports.slice(0, 3)],
				sourceAttribution: "git_diff",
				confidence: 0.7,
			});
		}

		// Detect renamed patterns (removed export + added export with similar name)
		const removedLines = lines
			.filter((l) => l.startsWith("-") && !l.startsWith("---"))
			.map((l) => l.slice(1));

		const removedExports: string[] = [];
		for (const line of removedLines) {
			const match = line.match(exportPattern);
			if (match) removedExports.push(match[1]);
		}

		if (removedExports.length > 0 && newExports.length > 0) {
			entries.push({
				title: `Refactoring: renamed/replaced exports`,
				content: `Removed: ${removedExports.join(", ")}. Added: ${newExports.join(", ")}`,
				category: "refactoring",
				tags: ["rename", "refactor"],
				sourceAttribution: "git_diff",
				confidence: 0.5,
			});
		}

		return entries;
	}

	/** Extract knowledge from PR description: rationale, decisions, lessons learned. */
	extractFromPR(description: string): ProposedEntry[] {
		const entries: ProposedEntry[] = [];
		if (!description || description.trim().length === 0) return entries;

		// Extract title (first line or first heading)
		const lines = description.split("\n").filter((l) => l.trim());
		const title = lines[0]?.replace(/^#+\s*/, "").trim() ?? "PR knowledge";

		// Look for rationale sections
		const rationalePatterns = [
			/(?:^|\n)#+\s*(?:rationale|motivation|why|background|context)\s*\n([\s\S]*?)(?=\n#+|\n$|$)/i,
			/(?:^|\n)(?:rationale|motivation|why|background|context):\s*([\s\S]*?)(?=\n\n|$)/i,
		];

		for (const pattern of rationalePatterns) {
			const match = description.match(pattern);
			if (match?.[1]?.trim()) {
				entries.push({
					title: `Decision rationale: ${title.slice(0, 60)}`,
					content: match[1].trim(),
					category: "decision",
					tags: ["rationale", "pr"],
					sourceAttribution: "pr_description",
					confidence: 0.8,
				});
			}
		}

		// Look for lessons learned
		const lessonPatterns = [
			/(?:^|\n)#+\s*(?:lessons?|takeaways?|learnings?|notes?)\s*\n([\s\S]*?)(?=\n#+|\n$|$)/i,
		];

		for (const pattern of lessonPatterns) {
			const match = description.match(pattern);
			if (match?.[1]?.trim()) {
				entries.push({
					title: `Lessons: ${title.slice(0, 60)}`,
					content: match[1].trim(),
					category: "lesson",
					tags: ["lesson", "pr"],
					sourceAttribution: "pr_description",
					confidence: 0.7,
				});
			}
		}

		// General summary if no structured sections found
		if (entries.length === 0 && description.length > 50) {
			entries.push({
				title: `PR: ${title.slice(0, 80)}`,
				content: description.slice(0, 500),
				category: "change",
				tags: ["pr"],
				sourceAttribution: "pr_description",
				confidence: 0.5,
			});
		}

		return entries;
	}

	/** Extract knowledge from commit message: bug fixes, features. */
	extractFromCommit(message: string): ProposedEntry[] {
		const entries: ProposedEntry[] = [];
		if (!message || message.trim().length === 0) return entries;

		const firstLine = message.split("\n")[0].trim();
		const body = message.split("\n").slice(1).join("\n").trim();

		// Detect conventional commit prefixes
		const prefixMatch = firstLine.match(
			/^(fix|feat|refactor|docs|test|chore|perf|ci|build)(?:\(([^)]+)\))?:\s*(.+)/i,
		);

		if (prefixMatch) {
			const [, type, scope, desc] = prefixMatch;
			const category = type.toLowerCase() === "fix" ? "bug_fix" : "feature";

			entries.push({
				title: `${type}: ${desc}`,
				content: body || desc,
				category,
				tags: [type.toLowerCase(), ...(scope ? [scope.toLowerCase()] : [])],
				sourceAttribution: "commit_message",
				confidence: 0.6,
			});
		} else if (firstLine.length > 10) {
			// Non-conventional commit
			entries.push({
				title: firstLine.slice(0, 100),
				content: body || firstLine,
				category: "change",
				tags: ["commit"],
				sourceAttribution: "commit_message",
				confidence: 0.4,
			});
		}

		return entries;
	}

	/** Extract knowledge from code review comments. */
	private extractFromCodeReview(content: string): ProposedEntry[] {
		const entries: ProposedEntry[] = [];
		if (!content || content.trim().length === 0) return entries;

		entries.push({
			title: `Code review insight`,
			content: content.slice(0, 500),
			category: "review",
			tags: ["code_review", "feedback"],
			sourceAttribution: "code_review",
			confidence: 0.6,
		});

		return entries;
	}

	/** Returns true if entry contains potential secrets/PII. */
	filterSensitive(entry: ProposedEntry): boolean {
		const text = `${entry.title} ${entry.content}`;
		for (const pattern of SENSITIVE_PATTERNS) {
			if (pattern.test(text)) return true;
		}
		return false;
	}
}
