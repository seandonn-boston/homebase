/**
 * Admiral Framework — Policy Management API (GP-02)
 *
 * Full CRUD for governance policies with append-only versioning.
 * All updates preserve prior versions; deactivation sets status to "inactive"
 * but keeps the record. Every mutation is logged with author, timestamp, and
 * optional rationale.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  version: number;
  enforcement: "enforce" | "monitor" | "disabled";
  scope: "fleet" | "role" | "project";
  rule: Record<string, unknown>;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  rationale?: string;
  deactivatedAt?: string;
  deactivatedBy?: string;
  deactivationReason?: string;
}

export interface CreatePolicyRequest {
  name: string;
  description: string;
  enforcement: "enforce" | "monitor" | "disabled";
  scope: "fleet" | "role" | "project";
  rule: Record<string, unknown>;
  createdBy: string;
}

export interface UpdatePolicyRequest {
  name?: string;
  description?: string;
  enforcement?: "enforce" | "monitor" | "disabled";
  scope?: "fleet" | "role" | "project";
  rule?: Record<string, unknown>;
  updatedBy: string;
  rationale: string;
}

export interface PolicyFilters {
  status?: "active" | "inactive";
  enforcement?: string;
  scope?: string;
}

// ---------------------------------------------------------------------------
// Changelog entry — internal audit trail per policy
// ---------------------------------------------------------------------------

export interface PolicyChangelogEntry {
  version: number;
  timestamp: string;
  action: "created" | "updated" | "deactivated";
  author: string;
  rationale: string;
}

// ---------------------------------------------------------------------------
// PolicyStore interface — the public contract
// ---------------------------------------------------------------------------

export interface PolicyStore {
  create(policy: CreatePolicyRequest): GovernancePolicy;
  get(id: string): GovernancePolicy | undefined;
  list(filters?: PolicyFilters): GovernancePolicy[];
  update(id: string, updates: UpdatePolicyRequest): GovernancePolicy;
  deactivate(id: string, reason: string, author: string): GovernancePolicy;
  getVersionHistory(id: string): GovernancePolicy[];
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const VALID_ENFORCEMENT = ["enforce", "monitor", "disabled"] as const;
const VALID_SCOPE = ["fleet", "role", "project"] as const;

type ValidationResult = { ok: true } | { ok: false; error: string };

function validateCreateRequest(req: unknown): ValidationResult {
  if (typeof req !== "object" || req === null) {
    return { ok: false, error: "Request must be an object" };
  }
  const r = req as Record<string, unknown>;

  if (!r.name || typeof r.name !== "string" || !String(r.name).trim()) {
    return { ok: false, error: "Field 'name' is required and must be a non-empty string" };
  }
  if (!r.createdBy || typeof r.createdBy !== "string" || !String(r.createdBy).trim()) {
    return { ok: false, error: "Field 'createdBy' is required" };
  }
  if (
    r.enforcement !== undefined &&
    !VALID_ENFORCEMENT.includes(r.enforcement as GovernancePolicy["enforcement"])
  ) {
    return {
      ok: false,
      error: `Invalid enforcement '${String(r.enforcement)}'. Must be one of: ${VALID_ENFORCEMENT.join(", ")}`,
    };
  }
  if (r.scope !== undefined && !VALID_SCOPE.includes(r.scope as GovernancePolicy["scope"])) {
    return {
      ok: false,
      error: `Invalid scope '${String(r.scope)}'. Must be one of: ${VALID_SCOPE.join(", ")}`,
    };
  }
  if (
    r.rule !== undefined &&
    (typeof r.rule !== "object" || r.rule === null || Array.isArray(r.rule))
  ) {
    return { ok: false, error: "Field 'rule' must be a JSON object" };
  }
  return { ok: true };
}

function validateUpdateRequest(req: unknown): ValidationResult {
  if (typeof req !== "object" || req === null) {
    return { ok: false, error: "Request must be an object" };
  }
  const r = req as Record<string, unknown>;

  if (!r.updatedBy || typeof r.updatedBy !== "string" || !String(r.updatedBy).trim()) {
    return { ok: false, error: "Field 'updatedBy' is required" };
  }
  if (!r.rationale || typeof r.rationale !== "string" || !String(r.rationale).trim()) {
    return { ok: false, error: "Field 'rationale' is required" };
  }
  if (
    r.enforcement !== undefined &&
    !VALID_ENFORCEMENT.includes(r.enforcement as GovernancePolicy["enforcement"])
  ) {
    return {
      ok: false,
      error: `Invalid enforcement '${String(r.enforcement)}'. Must be one of: ${VALID_ENFORCEMENT.join(", ")}`,
    };
  }
  if (r.scope !== undefined && !VALID_SCOPE.includes(r.scope as GovernancePolicy["scope"])) {
    return {
      ok: false,
      error: `Invalid scope '${String(r.scope)}'. Must be one of: ${VALID_SCOPE.join(", ")}`,
    };
  }
  if (
    r.rule !== undefined &&
    (typeof r.rule !== "object" || r.rule === null || Array.isArray(r.rule))
  ) {
    return { ok: false, error: "Field 'rule' must be a JSON object" };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// PolicyValidationError — thrown on invalid input
// ---------------------------------------------------------------------------

export class PolicyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PolicyValidationError";
  }
}

// ---------------------------------------------------------------------------
// PolicyNotFoundError — thrown when an id is not found
// ---------------------------------------------------------------------------

export class PolicyNotFoundError extends Error {
  constructor(id: string) {
    super(`Policy not found: ${id}`);
    this.name = "PolicyNotFoundError";
  }
}

// ---------------------------------------------------------------------------
// InMemoryPolicyStore — append-only versioned policy store
// ---------------------------------------------------------------------------

export class InMemoryPolicyStore implements PolicyStore {
  /**
   * Current (latest) version of each policy, keyed by policy id.
   * Always reflects the most recent GovernancePolicy snapshot.
   */
  private current: Map<string, GovernancePolicy> = new Map();

  /**
   * Full version history per policy id (append-only).
   * Index 0 = v1 (creation), last entry = latest.
   */
  private history: Map<string, GovernancePolicy[]> = new Map();

  /**
   * Changelog entries per policy id.
   */
  private changelog: Map<string, PolicyChangelogEntry[]> = new Map();

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  create(req: CreatePolicyRequest): GovernancePolicy {
    const validation = validateCreateRequest(req);
    if (!validation.ok) {
      throw new PolicyValidationError(validation.error);
    }

    const now = new Date().toISOString();
    const policy: GovernancePolicy = {
      id: randomUUID(),
      name: req.name.trim(),
      description: req.description ?? "",
      version: 1,
      enforcement: req.enforcement ?? "monitor",
      scope: req.scope ?? "fleet",
      rule: req.rule ?? {},
      status: "active",
      createdAt: now,
      updatedAt: now,
      createdBy: req.createdBy.trim(),
    };

    this.current.set(policy.id, policy);
    this.history.set(policy.id, [policy]);
    this.changelog.set(policy.id, [
      {
        version: 1,
        timestamp: now,
        action: "created",
        author: policy.createdBy,
        rationale: "Initial creation",
      },
    ]);

    return policy;
  }

  // -------------------------------------------------------------------------
  // get
  // -------------------------------------------------------------------------

  get(id: string): GovernancePolicy | undefined {
    return this.current.get(id);
  }

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  list(filters?: PolicyFilters): GovernancePolicy[] {
    let results = Array.from(this.current.values());

    if (filters?.status !== undefined) {
      results = results.filter((p) => p.status === filters.status);
    }
    if (filters?.enforcement !== undefined) {
      results = results.filter((p) => p.enforcement === filters.enforcement);
    }
    if (filters?.scope !== undefined) {
      results = results.filter((p) => p.scope === filters.scope);
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // update — append-only: preserves old snapshot in history
  // -------------------------------------------------------------------------

  update(id: string, req: UpdatePolicyRequest): GovernancePolicy {
    const existing = this.current.get(id);
    if (!existing) {
      throw new PolicyNotFoundError(id);
    }

    const validation = validateUpdateRequest(req);
    if (!validation.ok) {
      throw new PolicyValidationError(validation.error);
    }

    const now = new Date().toISOString();

    const updated: GovernancePolicy = {
      ...existing,
      name: req.name !== undefined ? req.name.trim() : existing.name,
      description: req.description !== undefined ? req.description : existing.description,
      enforcement: req.enforcement !== undefined ? req.enforcement : existing.enforcement,
      scope: req.scope !== undefined ? req.scope : existing.scope,
      rule: req.rule !== undefined ? { ...req.rule } : existing.rule,
      version: existing.version + 1,
      updatedAt: now,
      updatedBy: req.updatedBy.trim(),
      rationale: req.rationale.trim(),
    };

    // Persist latest
    this.current.set(id, updated);

    // Append to version history
    const versionList = this.history.get(id) ?? [];
    versionList.push(updated);
    this.history.set(id, versionList);

    // Append to changelog
    const log = this.changelog.get(id) ?? [];
    log.push({
      version: updated.version,
      timestamp: now,
      action: "updated",
      author: req.updatedBy.trim(),
      rationale: req.rationale.trim(),
    });
    this.changelog.set(id, log);

    return updated;
  }

  // -------------------------------------------------------------------------
  // deactivate — sets status to inactive, preserves record
  // -------------------------------------------------------------------------

  deactivate(id: string, reason: string, author: string): GovernancePolicy {
    const existing = this.current.get(id);
    if (!existing) {
      throw new PolicyNotFoundError(id);
    }
    if (!reason || !reason.trim()) {
      throw new PolicyValidationError("Deactivation reason is required");
    }
    if (!author || !author.trim()) {
      throw new PolicyValidationError("Deactivation author is required");
    }

    const now = new Date().toISOString();

    const deactivated: GovernancePolicy = {
      ...existing,
      status: "inactive",
      version: existing.version + 1,
      updatedAt: now,
      updatedBy: author.trim(),
      rationale: reason.trim(),
      deactivatedAt: now,
      deactivatedBy: author.trim(),
      deactivationReason: reason.trim(),
    };

    this.current.set(id, deactivated);

    const versionList = this.history.get(id) ?? [];
    versionList.push(deactivated);
    this.history.set(id, versionList);

    const log = this.changelog.get(id) ?? [];
    log.push({
      version: deactivated.version,
      timestamp: now,
      action: "deactivated",
      author: author.trim(),
      rationale: reason.trim(),
    });
    this.changelog.set(id, log);

    return deactivated;
  }

  // -------------------------------------------------------------------------
  // getVersionHistory — full append-only history for a policy
  // -------------------------------------------------------------------------

  getVersionHistory(id: string): GovernancePolicy[] {
    if (!this.current.has(id)) {
      throw new PolicyNotFoundError(id);
    }
    return [...(this.history.get(id) ?? [])];
  }

  // -------------------------------------------------------------------------
  // getChangelog — audit log for a policy (not part of PolicyStore interface
  // but useful for testing and operator tooling)
  // -------------------------------------------------------------------------

  getChangelog(id: string): PolicyChangelogEntry[] {
    if (!this.current.has(id)) {
      throw new PolicyNotFoundError(id);
    }
    return [...(this.changelog.get(id) ?? [])];
  }

  // -------------------------------------------------------------------------
  // size — number of distinct policy ids
  // -------------------------------------------------------------------------

  get size(): number {
    return this.current.size;
  }
}
