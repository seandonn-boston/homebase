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

    -- Metadata
    metadata        JSONB NOT NULL DEFAULT '{}',

    -- Provenance
    source_agent    TEXT,
    source_session  TEXT,
    authority_tier  TEXT CHECK (authority_tier IN ('enforced', 'autonomous', 'propose', 'escalate')),

    -- Strengthening
    access_count    INT NOT NULL DEFAULT 0,
    usefulness      INT NOT NULL DEFAULT 0,
    superseded_by   UUID REFERENCES entries(id)
);

-- Semantic search index (HNSW for fast approximate nearest neighbor)
CREATE INDEX idx_entries_embedding ON entries USING hnsw (embedding vector_cosine_ops);

-- Filtered search indexes
CREATE INDEX idx_entries_project_category ON entries (project, category);
CREATE INDEX idx_entries_created_at ON entries (created_at);
CREATE INDEX idx_entries_authority_tier ON entries (authority_tier);
CREATE INDEX idx_entries_metadata_tags ON entries ((metadata->>'tags')) USING gin;

-- Relationships between entries
CREATE TABLE entry_links (
    source_id   UUID NOT NULL REFERENCES entries(id),
    target_id   UUID NOT NULL REFERENCES entries(id),
    link_type   TEXT NOT NULL CHECK (link_type IN ('supports', 'contradicts', 'supersedes', 'elaborates', 'caused_by')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (source_id, target_id, link_type)
);

-- ── Sensitive Data Guard ─────────────────────────────────────────
-- Defense-in-depth: reject entries containing obvious PII/secret patterns
-- at the database level. The application sanitizer (core/sanitizer.py)
-- is the primary enforcement point; this trigger is a safety net.
-- Reference: admiral/part11-protocols.md, Section 40.

CREATE OR REPLACE FUNCTION reject_sensitive_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Email addresses
    IF NEW.content ~* '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
       OR NEW.title ~* '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' THEN
        RAISE EXCEPTION 'Sensitive data rejected: content contains email address';
    END IF;
    -- SSN pattern
    IF NEW.content ~ '\d{3}-\d{2}-\d{4}' OR NEW.title ~ '\d{3}-\d{2}-\d{4}' THEN
        RAISE EXCEPTION 'Sensitive data rejected: content contains SSN pattern';
    END IF;
    -- Connection strings with credentials
    IF NEW.content ~* '(postgresql|mysql|mongodb|redis)://[^@\s]+:[^@\s]+@'
       OR NEW.title ~* '(postgresql|mysql|mongodb|redis)://[^@\s]+:[^@\s]+@' THEN
        RAISE EXCEPTION 'Sensitive data rejected: content contains connection string with credentials';
    END IF;
    -- AWS keys
    IF NEW.content ~ '(AKIA|ASIA)[A-Z0-9]{16}' OR NEW.title ~ '(AKIA|ASIA)[A-Z0-9]{16}' THEN
        RAISE EXCEPTION 'Sensitive data rejected: content contains AWS key';
    END IF;
    -- Metadata keys suggesting PII
    IF NEW.metadata ?| ARRAY['email', 'phone', 'ssn', 'password', 'secret',
                              'api_key', 'credit_card', 'private_key'] THEN
        RAISE EXCEPTION 'Sensitive data rejected: metadata contains PII/secret keys';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entries_reject_sensitive
    BEFORE INSERT OR UPDATE ON entries
    FOR EACH ROW
    EXECUTE FUNCTION reject_sensitive_data();

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
