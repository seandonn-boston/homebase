-- Fleet Brain Schema
-- Reference: admiral/part5-brain.md, Section 15
--
-- Prerequisites:
--   CREATE DATABASE fleet_brain;
--   \c fleet_brain
--   CREATE EXTENSION IF NOT EXISTS vector;

-- The atomic unit of knowledge
CREATE TABLE entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Classification
    project         TEXT NOT NULL,
    category        TEXT NOT NULL CHECK (category IN ('decision', 'outcome', 'lesson', 'context', 'failure', 'pattern')),

    -- Content
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,

    -- Semantic search
    embedding       vector(1536),

    -- Embedding provenance — tracks which model produced each embedding
    -- Makes future model migrations queryable: SELECT * FROM entries WHERE embedding_model != 'new-model'
    embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',

    -- Metadata
    metadata        JSONB NOT NULL DEFAULT '{}',

    -- Provenance (sentinel values: 'SYSTEM' / 'BOOTSTRAP' for system-generated entries)
    source_agent    TEXT NOT NULL,
    source_session  TEXT NOT NULL,
    authority_tier  TEXT CHECK (authority_tier IN ('enforced', 'autonomous', 'propose', 'escalate')),

    -- Access control — determines visibility and handling requirements
    sensitivity     TEXT NOT NULL DEFAULT 'standard'
                    CHECK (sensitivity IN ('standard', 'elevated', 'restricted')),

    -- Monitor integration — seed candidates arrive with approved = false
    -- Brain queries default to WHERE approved = true. Admiral flips to true after review.
    approved        BOOLEAN NOT NULL DEFAULT true,

    -- Strengthening
    access_count    INT NOT NULL DEFAULT 0,
    usefulness      INT NOT NULL DEFAULT 0,
    superseded_by   UUID REFERENCES entries(id) ON DELETE SET NULL,

    -- Decay tracking — entries not accessed in 90 days flagged for review
    -- Application code updates last_accessed_at on every brain_query/brain_retrieve hit
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Semantic search index (HNSW for fast approximate nearest neighbor)
CREATE INDEX idx_entries_embedding ON entries USING hnsw (embedding vector_cosine_ops);

-- Filtered search indexes
CREATE INDEX idx_entries_project_category ON entries (project, category);
CREATE INDEX idx_entries_created_at ON entries (created_at);
CREATE INDEX idx_entries_authority_tier ON entries (authority_tier);

-- GIN index on metadata tags — uses jsonb_path_ops for efficient JSONB array containment queries
CREATE INDEX idx_entries_metadata_tags ON entries USING gin ((metadata->'tags') jsonb_path_ops);

-- Index on superseded_by for efficiently finding active (non-superseded) entries
CREATE INDEX idx_entries_superseded_by ON entries (superseded_by);

-- Partial index for unapproved entries (seed candidates pending Admiral review)
CREATE INDEX idx_entries_approved ON entries (approved) WHERE approved = false;

-- Index for decay awareness queries
CREATE INDEX idx_entries_last_accessed ON entries (last_accessed_at);

-- Relationships between entries
CREATE TABLE entry_links (
    source_id   UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    target_id   UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    link_type   TEXT NOT NULL CHECK (link_type IN ('supports', 'contradicts', 'supersedes', 'elaborates', 'caused_by')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (source_id, target_id, link_type)
);

-- Immutable, append-only audit log — tracks all Brain operations for traceability
-- Security note: The audit_log table owner should be a restricted database role, not the
-- application user. The application connects via a role that has INSERT but not TRUNCATE,
-- UPDATE, DELETE, or rule-alter privileges on this table.
CREATE TABLE audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
    operation   TEXT NOT NULL CHECK (operation IN ('record', 'query', 'retrieve', 'strengthen', 'supersede', 'audit')),
    agent_id    TEXT NOT NULL,
    session_id  TEXT NOT NULL,
    project     TEXT NOT NULL,
    entry_id    UUID REFERENCES entries(id) ON DELETE SET NULL,
    entry_ids   UUID[],
    result      TEXT NOT NULL CHECK (result IN ('success', 'denied', 'error')),
    risk_flags  JSONB NOT NULL DEFAULT '[]',
    details     JSONB NOT NULL DEFAULT '{}',
    ip_or_source TEXT
);

-- Audit log indexes
CREATE INDEX idx_audit_log_timestamp ON audit_log (timestamp);
CREATE INDEX idx_audit_log_agent_id ON audit_log (agent_id);
CREATE INDEX idx_audit_log_project ON audit_log (project);
CREATE INDEX idx_audit_log_operation ON audit_log (operation);

-- Prevent any modification or deletion of audit records — append-only enforcement
CREATE RULE audit_log_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_log_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;
REVOKE TRUNCATE ON audit_log FROM PUBLIC;

-- Auto-update updated_at on entry modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entries_updated_at
    BEFORE UPDATE ON entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
