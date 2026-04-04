import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { PrivilegeEnforcer } from "./privilege-enforcer";

describe("PrivilegeEnforcer", () => {
	let enforcer: PrivilegeEnforcer;

	beforeEach(() => {
		enforcer = new PrivilegeEnforcer();
		enforcer.registerAgent({
			agentId: "implementer-1",
			autonomous: ["write_code", "run_tests", "read_files"],
			propose: ["modify_config", "add_dependency"],
			escalate: ["delete_data", "modify_permissions"],
		});
		enforcer.registerAgent({
			agentId: "security-agent",
			autonomous: ["scan_vulnerabilities", "read_files", "modify_permissions"],
			propose: ["quarantine_entry"],
			escalate: ["delete_data"],
		});
	});

	describe("checkPrivilege", () => {
		it("allows autonomous actions", () => {
			const result = enforcer.checkPrivilege("implementer-1", "write_code");
			assert.equal(result.allowed, true);
			assert.equal(result.agentTier, "autonomous");
		});

		it("blocks propose-tier actions from autonomous execution", () => {
			const result = enforcer.checkPrivilege("implementer-1", "modify_config");
			assert.equal(result.allowed, false);
			assert.equal(result.agentTier, "propose");
			assert.ok(result.reason.includes("propose"));
		});

		it("blocks escalate-tier actions from autonomous execution", () => {
			const result = enforcer.checkPrivilege("implementer-1", "delete_data");
			assert.equal(result.allowed, false);
			assert.equal(result.agentTier, "escalate");
		});

		it("blocks unregistered agents (default deny)", () => {
			const result = enforcer.checkPrivilege("unknown-agent", "anything");
			assert.equal(result.allowed, false);
			assert.ok(result.reason.includes("no registered authority"));
		});

		it("escalates unclassified actions (fail-safe)", () => {
			const result = enforcer.checkPrivilege("implementer-1", "unknown_action");
			assert.equal(result.allowed, false);
			assert.equal(result.agentTier, "escalate");
		});

		it("different agents have different permissions for same action", () => {
			const impl = enforcer.checkPrivilege("implementer-1", "modify_permissions");
			const sec = enforcer.checkPrivilege("security-agent", "modify_permissions");
			assert.equal(impl.allowed, false);
			assert.equal(sec.allowed, true);
		});
	});

	describe("checkSelfModification (ATK-0003)", () => {
		it("blocks self-modification of authority", () => {
			const result = enforcer.checkSelfModification(
				"implementer-1",
				"implementer-1",
				"authority.autonomous",
			);
			assert.equal(result.allowed, false);
			assert.ok(result.reason.includes("ATK-0003"));
		});

		it("allows cross-agent authority modification", () => {
			const result = enforcer.checkSelfModification(
				"security-agent",
				"implementer-1",
				"authority.autonomous",
			);
			assert.equal(result.allowed, true);
		});

		it("allows self-modification of non-authority fields", () => {
			const result = enforcer.checkSelfModification(
				"implementer-1",
				"implementer-1",
				"description",
			);
			assert.equal(result.allowed, true);
		});
	});

	describe("checkDelegation (ATK-0010)", () => {
		it("allows delegation when delegator has sufficient privilege", () => {
			const result = enforcer.checkDelegation(
				"implementer-1",
				"security-agent",
				"read_files",
			);
			assert.equal(result.allowed, true);
		});

		it("blocks delegation that would escalate privilege", () => {
			// implementer-1 has "propose" for modify_config
			// If security-agent had "autonomous" for it, delegation denied
			enforcer.registerAgent({
				agentId: "helper-agent",
				autonomous: ["modify_config"],
				propose: [],
				escalate: [],
			});
			const result = enforcer.checkDelegation(
				"implementer-1",
				"helper-agent",
				"modify_config",
			);
			assert.equal(result.allowed, false);
			assert.ok(result.reason.includes("ATK-0010"));
		});

		it("allows delegation when both have same tier", () => {
			enforcer.registerAgent({
				agentId: "peer-agent",
				autonomous: ["write_code"],
				propose: [],
				escalate: [],
			});
			const result = enforcer.checkDelegation(
				"implementer-1",
				"peer-agent",
				"write_code",
			);
			assert.equal(result.allowed, true);
		});
	});

	describe("violations tracking", () => {
		it("records violations on blocked actions", () => {
			enforcer.checkPrivilege("implementer-1", "delete_data");
			const violations = enforcer.getViolations();
			assert.equal(violations.length, 1);
			assert.equal(violations[0].agentId, "implementer-1");
			assert.equal(violations[0].action, "delete_data");
			assert.equal(violations[0].blocked, true);
		});

		it("does not record violations on allowed actions", () => {
			enforcer.checkPrivilege("implementer-1", "write_code");
			assert.equal(enforcer.getViolations().length, 0);
		});

		it("accumulates multiple violations", () => {
			enforcer.checkPrivilege("implementer-1", "delete_data");
			enforcer.checkPrivilege("implementer-1", "modify_permissions");
			enforcer.checkSelfModification("implementer-1", "implementer-1", "authority.escalate");
			assert.equal(enforcer.getViolations().length, 3);
		});
	});

	describe("audit log", () => {
		it("logs all checks (allowed and denied)", () => {
			enforcer.checkPrivilege("implementer-1", "write_code");
			enforcer.checkPrivilege("implementer-1", "delete_data");
			const log = enforcer.getCheckLog();
			assert.equal(log.length, 2);
			assert.equal(log[0].allowed, true);
			assert.equal(log[1].allowed, false);
		});

		it("includes timestamps", () => {
			enforcer.checkPrivilege("implementer-1", "write_code");
			const log = enforcer.getCheckLog();
			assert.ok(log[0].timestamp);
			assert.ok(log[0].timestamp.includes("T"));
		});
	});

	describe("loadFromDefinition", () => {
		it("loads authority from agent definition JSON", () => {
			enforcer.loadFromDefinition({
				agent_id: "test-agent",
				authority: {
					autonomous: ["task_a"],
					propose: ["task_b"],
					escalate: ["task_c"],
				},
			});
			const result = enforcer.checkPrivilege("test-agent", "task_a");
			assert.equal(result.allowed, true);
		});

		it("handles missing authority gracefully", () => {
			enforcer.loadFromDefinition({
				agent_id: "minimal-agent",
			});
			const result = enforcer.checkPrivilege("minimal-agent", "anything");
			assert.equal(result.allowed, false);
		});
	});

	describe("getActionTier", () => {
		it("returns correct tier for known actions", () => {
			assert.equal(enforcer.getActionTier("implementer-1", "write_code"), "autonomous");
			assert.equal(enforcer.getActionTier("implementer-1", "modify_config"), "propose");
			assert.equal(enforcer.getActionTier("implementer-1", "delete_data"), "escalate");
		});

		it("returns null for unknown agent", () => {
			assert.equal(enforcer.getActionTier("ghost", "anything"), null);
		});

		it("defaults to escalate for unknown actions", () => {
			assert.equal(enforcer.getActionTier("implementer-1", "new_action"), "escalate");
		});
	});

	describe("reset", () => {
		it("clears all state", () => {
			enforcer.checkPrivilege("implementer-1", "delete_data");
			enforcer.reset();
			assert.equal(enforcer.getViolations().length, 0);
			assert.equal(enforcer.getCheckLog().length, 0);
			assert.equal(enforcer.getAgentAuthority("implementer-1"), undefined);
		});
	});
});
