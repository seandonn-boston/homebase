-- Admiral Framework v0.1.1-alpha
-- Test-adapted schema: omits pgvector (embedding column + HNSW index)
-- Everything else is identical to 001_initial.sql

CREATE TABLE entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    project         TEXT NOT NULL,
    category        TEXT NOT NULL CHECK (category IN ('decision', 'outcome', 'lesson', 'context', 'failure', 'pattern')),
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    metadata        JSONB NOT NULL DEFAULT '{}',
    source_agent    TEXT NOT NULL,
    source_session  TEXT NOT NULL,
    authority_tier  TEXT CHECK (authority_tier IN ('enforced', 'autonomous', 'propose', 'escalate')),
    sensitivity     TEXT NOT NULL DEFAULT 'standard'
                    CHECK (sensitivity IN ('standard', 'elevated', 'restricted')),
    approved        BOOLEAN NOT NULL DEFAULT true,
    access_count    INT NOT NULL DEFAULT 0,
    usefulness      INT NOT NULL DEFAULT 0,
    superseded_by   UUID REFERENCES entries(id) ON DELETE SET NULL,
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    purged_at       TIMESTAMPTZ,
    purge_reason    TEXT
);

CREATE INDEX idx_entries_project_category ON entries (project, category);
CREATE INDEX idx_entries_created_at ON entries (created_at);
CREATE INDEX idx_entries_authority_tier ON entries (authority_tier);
CREATE INDEX idx_entries_metadata_tags ON entries USING gin ((metadata->'tags') jsonb_path_ops);
CREATE INDEX idx_entries_superseded_by ON entries (superseded_by);
CREATE INDEX idx_entries_approved ON entries (approved) WHERE approved = false;
CREATE INDEX idx_entries_last_accessed ON entries (last_accessed_at);

CREATE TABLE entry_links (
    source_id   UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    target_id   UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    link_type   TEXT NOT NULL CHECK (link_type IN ('supports', 'contradicts', 'supersedes', 'elaborates', 'caused_by')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (source_id, target_id, link_type)
);

CREATE TABLE audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
    operation   TEXT NOT NULL CHECK (operation IN ('record', 'query', 'retrieve', 'strengthen', 'supersede', 'audit', 'purge', 'status')),
    agent_id    TEXT NOT NULL,
    session_id  TEXT NOT NULL,
    project     TEXT NOT NULL,
    entry_id    UUID,
    entry_ids   UUID[],
    result      TEXT NOT NULL CHECK (result IN ('success', 'denied', 'error')),
    risk_flags  JSONB NOT NULL DEFAULT '[]',
    details     JSONB NOT NULL DEFAULT '{}',
    ip_or_source TEXT
);

CREATE INDEX idx_audit_log_timestamp ON audit_log (timestamp);
CREATE INDEX idx_audit_log_agent_id ON audit_log (agent_id);
CREATE INDEX idx_audit_log_project ON audit_log (project);
CREATE INDEX idx_audit_log_operation ON audit_log (operation);

CREATE RULE audit_log_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_log_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;
REVOKE TRUNCATE ON audit_log FROM PUBLIC;

-- Sensitive Data Guard (from 001_initial.sql)
CREATE OR REPLACE FUNCTION reject_sensitive_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip checks for purged entries (title/content/metadata are NULLed during purge)
    IF NEW.purged_at IS NOT NULL THEN
        RETURN NEW;
    END IF;
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

-- Auto-update updated_at
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
