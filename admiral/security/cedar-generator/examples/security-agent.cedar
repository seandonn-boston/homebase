// Cedar Policy: security-agent
// Generated from agent-definition: security-agent v1.0.0
// Role: security
// Generated at: 2026-03-28T00:00:00Z
//
// Authority tiers:
//   autonomous: scan_vulnerabilities, read_files, modify_permissions, audit_review
//   propose:    quarantine_entry, security_exception
//   escalate:   delete_data, standing_order_override

// --- Autonomous tier (permit) ---

permit (
  principal == Admiral::Agent::"security-agent",
  action == Admiral::Action::"scan_vulnerabilities",
  resource
);

permit (
  principal == Admiral::Agent::"security-agent",
  action == Admiral::Action::"read_files",
  resource
);

permit (
  principal == Admiral::Agent::"security-agent",
  action == Admiral::Action::"modify_permissions",
  resource
);

permit (
  principal == Admiral::Agent::"security-agent",
  action == Admiral::Action::"audit_review",
  resource
);

// --- Propose tier (forbid unless approved) ---

forbid (
  principal == Admiral::Agent::"security-agent",
  action == Admiral::Action::"quarantine_entry",
  resource
)
unless { context.approval_status == "approved" };

forbid (
  principal == Admiral::Agent::"security-agent",
  action == Admiral::Action::"security_exception",
  resource
)
unless { context.approval_status == "approved" };

// --- Escalate tier (unconditional forbid) ---

forbid (
  principal == Admiral::Agent::"security-agent",
  action == Admiral::Action::"delete_data",
  resource
);

forbid (
  principal == Admiral::Agent::"security-agent",
  action == Admiral::Action::"standing_order_override",
  resource
);
