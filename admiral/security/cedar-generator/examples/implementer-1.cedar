// Cedar Policy: implementer-1
// Generated from agent-definition: implementer-1 v1.0.0
// Role: implementer
// Generated at: 2026-03-28T00:00:00Z
//
// Authority tiers:
//   autonomous: write_code, run_tests, read_files
//   propose:    modify_config, add_dependency
//   escalate:   delete_data, modify_permissions

// --- Autonomous tier (permit) ---

permit (
  principal == Admiral::Agent::"implementer-1",
  action == Admiral::Action::"write_code",
  resource
);

permit (
  principal == Admiral::Agent::"implementer-1",
  action == Admiral::Action::"run_tests",
  resource
);

permit (
  principal == Admiral::Agent::"implementer-1",
  action == Admiral::Action::"read_files",
  resource
);

// --- Propose tier (forbid unless approved) ---

forbid (
  principal == Admiral::Agent::"implementer-1",
  action == Admiral::Action::"modify_config",
  resource
)
unless { context.approval_status == "approved" };

forbid (
  principal == Admiral::Agent::"implementer-1",
  action == Admiral::Action::"add_dependency",
  resource
)
unless { context.approval_status == "approved" };

// --- Escalate tier (unconditional forbid) ---

forbid (
  principal == Admiral::Agent::"implementer-1",
  action == Admiral::Action::"delete_data",
  resource
);

forbid (
  principal == Admiral::Agent::"implementer-1",
  action == Admiral::Action::"modify_permissions",
  resource
);
