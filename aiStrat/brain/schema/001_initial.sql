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
