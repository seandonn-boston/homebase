// Cedar Policy: Standing Orders (Universal)
// These policies apply to ALL agents unconditionally.
// Generated from Standing Orders SO-01 through SO-17.
// Generated at: 2026-03-28T00:00:00Z

// --- SO-10: Prohibitions ---

// No agent may store PII in Brain entries
forbid (
  principal,
  action == Admiral::Action::"brain_write",
  resource
)
when { resource.contains_pii == true };

// No agent may approve its own work
forbid (
  principal,
  action == Admiral::Action::"approve_work",
  resource
)
when { resource.author == principal };

// --- SO-05: Decision Authority ---

// No agent may modify its own authority tier
forbid (
  principal,
  action == Admiral::Action::"modify_authority",
  resource
)
when { resource.target_agent == principal };

// --- SO-12: Zero Trust ---

// No agent may bypass quarantine pipeline
forbid (
  principal,
  action == Admiral::Action::"bypass_quarantine",
  resource
);

// No agent may disable audit logging
forbid (
  principal,
  action == Admiral::Action::"disable_audit",
  resource
);

// --- SO-09: Security Protocol ---

// No agent may access resources above their clearance level
forbid (
  principal,
  action == Admiral::Action::"access_resource",
  resource
)
when { resource.sensitivity_level > principal.clearance_level };
