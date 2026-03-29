import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { CrossProjectSharing } from "./cross-project-sharing";
import type { ShareRequest } from "./cross-project-sharing";

describe("CrossProjectSharing", () => {
	let sharing: CrossProjectSharing;

	beforeEach(() => {
		sharing = new CrossProjectSharing();
		sharing.registerProject({
			projectId: "project-a",
			allowedTargets: ["project-b", "project-c"],
			defaultPermission: "read-only",
			maxShareDepth: 3,
			requireApproval: false,
		});
		sharing.registerProject({
			projectId: "project-b",
			allowedTargets: [],
			defaultPermission: "read-write",
			maxShareDepth: 2,
			requireApproval: false,
		});
	});

	function makeRequest(overrides: Partial<ShareRequest> = {}): ShareRequest {
		return {
			entryId: "entry-1",
			title: "Lesson learned",
			content: "Always validate inputs",
			category: "lesson",
			tags: ["security", "validation"],
			sourceProject: "project-a",
			targetProject: "project-b",
			sharedBy: "agent-1",
			...overrides,
		};
	}

	describe("share", () => {
		it("shares entry successfully", () => {
			const result = sharing.share(makeRequest());
			assert.equal(result.success, true);
			assert.ok(result.sharedEntryId);
		});

		it("rejects unregistered source project", () => {
			const result = sharing.share(
				makeRequest({ sourceProject: "unknown" }),
			);
			assert.equal(result.success, false);
			assert.ok(result.reason?.includes("not registered"));
		});

		it("rejects disallowed target project", () => {
			const result = sharing.share(
				makeRequest({ targetProject: "project-d" }),
			);
			assert.equal(result.success, false);
			assert.ok(result.reason?.includes("not in allowed targets"));
		});

		it("allows any target when allowedTargets is empty", () => {
			const result = sharing.share(
				makeRequest({
					sourceProject: "project-b",
					targetProject: "project-z",
				}),
			);
			assert.equal(result.success, true);
		});

		it("uses default permission when not specified", () => {
			const result = sharing.share(makeRequest());
			const entries = sharing.getSharedEntries("project-b");
			assert.equal(entries[0].permission, "read-only");
		});

		it("uses explicit permission when specified", () => {
			sharing.share(makeRequest({ permission: "admin" }));
			const entries = sharing.getSharedEntries("project-b");
			assert.equal(entries[0].permission, "admin");
		});

		it("adds provenance tag", () => {
			sharing.share(makeRequest());
			const entries = sharing.getSharedEntries("project-b");
			assert.ok(entries[0].tags.includes("shared-from:project-a"));
		});
	});

	describe("provenance tracking", () => {
		it("records share provenance", () => {
			const result = sharing.share(makeRequest());
			const provenance = sharing.getProvenance(result.sharedEntryId!);
			assert.ok(provenance);
			assert.equal(provenance.originalProject, "project-a");
			assert.equal(provenance.shareChain.length, 1);
			assert.equal(provenance.shareChain[0].fromProject, "project-a");
			assert.equal(provenance.shareChain[0].toProject, "project-b");
		});

		it("returns undefined for unknown entry", () => {
			assert.equal(sharing.getProvenance("nonexistent"), undefined);
		});
	});

	describe("retrieval", () => {
		it("getSharedEntries returns entries for target", () => {
			sharing.share(makeRequest());
			sharing.share(
				makeRequest({ entryId: "entry-2", title: "Another lesson" }),
			);
			const entries = sharing.getSharedEntries("project-b");
			assert.equal(entries.length, 2);
		});

		it("getSharedEntries returns empty for unknown project", () => {
			assert.equal(sharing.getSharedEntries("unknown").length, 0);
		});

		it("getExportedEntries returns entries from source", () => {
			sharing.share(makeRequest());
			const exported = sharing.getExportedEntries("project-a");
			assert.equal(exported.length, 1);
		});
	});

	describe("permissions", () => {
		it("canModify returns true for read-write", () => {
			const result = sharing.share(
				makeRequest({ permission: "read-write" }),
			);
			assert.equal(sharing.canModify(result.sharedEntryId!, "any-agent"), true);
		});

		it("canModify returns false for read-only", () => {
			const result = sharing.share(
				makeRequest({ permission: "read-only" }),
			);
			assert.equal(sharing.canModify(result.sharedEntryId!, "any-agent"), false);
		});

		it("canModify returns false for unknown entry", () => {
			assert.equal(sharing.canModify("nonexistent", "agent"), false);
		});
	});

	describe("revocation", () => {
		it("revokes shared entry", () => {
			const result = sharing.share(makeRequest());
			assert.equal(sharing.revoke(result.sharedEntryId!), true);
			assert.equal(sharing.getSharedEntries("project-b").length, 0);
		});

		it("returns false for unknown entry", () => {
			assert.equal(sharing.revoke("nonexistent"), false);
		});
	});

	describe("share log", () => {
		it("logs all shares", () => {
			sharing.share(makeRequest());
			sharing.share(
				makeRequest({ entryId: "entry-2", targetProject: "project-c" }),
			);
			const log = sharing.getShareLog();
			assert.equal(log.length, 2);
			assert.equal(log[0].toProject, "project-b");
			assert.equal(log[1].toProject, "project-c");
		});
	});

	describe("share depth limit", () => {
		it("enforces max share depth", () => {
			// project-b has maxShareDepth 2
			// First share to project-b
			const r1 = sharing.share(makeRequest({
				sourceProject: "project-b",
				targetProject: "project-a",
			}));
			assert.equal(r1.success, true);

			// Re-share from the shared entry (depth 1)
			const r2 = sharing.share(makeRequest({
				entryId: r1.sharedEntryId!,
				sourceProject: "project-b",
				targetProject: "project-a",
			}));
			assert.equal(r2.success, true);

			// Third share should fail (depth >= 2)
			const r3 = sharing.share(makeRequest({
				entryId: r2.sharedEntryId!,
				sourceProject: "project-b",
				targetProject: "project-a",
			}));
			assert.equal(r3.success, false);
			assert.ok(r3.reason?.includes("depth"));
		});
	});
});
