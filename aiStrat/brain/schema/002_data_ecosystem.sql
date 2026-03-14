-- Admiral Framework v0.4.0-alpha
-- Data Ecosystem Schema Extension
-- Reference: admiral/part12-data-ecosystem.md, Sections 42-48
--
-- Prerequisites:
--   001_initial.sql applied
--   \c fleet_brain

-- ── Customer Engagement Events ─────────────────────────────────
-- High-volume event stream. NOT stored in Brain entries (firehose prevention).
-- The Engagement Analyst aggregates these into Brain entries.

CREATE TABLE engagement_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
    event_type      TEXT NOT NULL CHECK (event_type IN ('interaction', 'feedback', 'support', 'session')),

    -- Anonymized customer reference (never PII)
    customer_hash   TEXT NOT NULL,

    -- Context
    surface         TEXT NOT NULL CHECK (surface IN ('web', 'mobile', 'api', 'support', 'other')),
    session_id      UUID,
    feature_area    TEXT NOT NULL,
    action          TEXT NOT NULL,

    -- Payload (flexible event-specific data)
    payload         JSONB NOT NULL DEFAULT '{}',

    -- AI attribution: links this event to the agent decision that influenced it
    attributed_agent_id     TEXT,
    attributed_brain_entry  UUID REFERENCES entries(id) ON DELETE SET NULL,
    attributed_decision_id  UUID REFERENCES entries(id) ON DELETE SET NULL,
    attribution_confidence  FLOAT CHECK (attribution_confidence BETWEEN 0.0 AND 1.0)
);

-- Indexes for engagement event queries
CREATE INDEX idx_engagement_timestamp ON engagement_events (timestamp);
CREATE INDEX idx_engagement_customer ON engagement_events (customer_hash);
CREATE INDEX idx_engagement_feature ON engagement_events (feature_area);
CREATE INDEX idx_engagement_type ON engagement_events (event_type);
CREATE INDEX idx_engagement_session ON engagement_events (session_id);
CREATE INDEX idx_engagement_attributed ON engagement_events (attributed_brain_entry) WHERE attributed_brain_entry IS NOT NULL;

-- ── Trend Snapshots ────────────────────────────────────────────
-- Computed trends stored for time-series analysis.
-- The Trend Analyst computes these on schedule and records significant
-- shifts as Brain entries.

CREATE TABLE trend_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    trend_type      TEXT NOT NULL CHECK (trend_type IN (
        'usage_shift', 'cohort_behavior', 'adoption_curve',
        'churn_signal', 'sentiment_drift', 'market_response'
    )),

    -- Time window
    window_start    TIMESTAMPTZ NOT NULL,
    window_end      TIMESTAMPTZ NOT NULL,
    granularity     TEXT NOT NULL CHECK (granularity IN ('hourly', 'daily', 'weekly', 'monthly')),

    -- Dimensions
    feature_area    TEXT,
    customer_segment TEXT,
    surface         TEXT,

    -- Metrics
    current_value   FLOAT NOT NULL,
    previous_value  FLOAT,
    change_rate     FLOAT,
    confidence      FLOAT CHECK (confidence BETWEEN 0.0 AND 1.0),
    sample_size     INT NOT NULL DEFAULT 0,

    -- Anomaly detection
    anomaly_detected    BOOLEAN NOT NULL DEFAULT false,
    anomaly_severity    TEXT CHECK (anomaly_severity IN ('low', 'medium', 'high', 'critical')),
    baseline_deviation  FLOAT,

    -- Link to Brain entry if this trend was significant enough to record
    brain_entry_id  UUID REFERENCES entries(id) ON DELETE SET NULL
);

CREATE INDEX idx_trend_computed ON trend_snapshots (computed_at);
CREATE INDEX idx_trend_type ON trend_snapshots (trend_type);
CREATE INDEX idx_trend_feature ON trend_snapshots (feature_area);
CREATE INDEX idx_trend_anomaly ON trend_snapshots (anomaly_detected) WHERE anomaly_detected = true;

-- ── Agent Output Tracking ──────────────────────────────────────
-- Extended metadata for agent outputs beyond what Brain entries capture.
-- Links Brain entries to resource consumption and attribution chains.

CREATE TABLE agent_output_metadata (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
    output_type     TEXT NOT NULL CHECK (output_type IN (
        'brain_entry', 'handoff', 'recommendation', 'artifact',
        'tool_result', 'escalation'
    )),

    -- Agent provenance
    agent_id        TEXT NOT NULL,
    session_id      TEXT NOT NULL,
    project         TEXT NOT NULL,

    -- Task context
    task_id         TEXT,
    chunk_id        TEXT,
    authority_tier  TEXT CHECK (authority_tier IN ('enforced', 'autonomous', 'propose', 'escalate')),
    model_tier      TEXT CHECK (model_tier IN ('tier1', 'tier2', 'tier3', 'tier4')),

    -- Content summary
    summary         TEXT NOT NULL,
    confidence      FLOAT CHECK (confidence BETWEEN 0.0 AND 1.0),

    -- Resource consumption
    tokens_input    INT,
    tokens_output   INT,
    cost_usd        FLOAT,
    duration_ms     INT,

    -- Attribution: which Brain entries were consulted and created
    brain_entries_consulted  UUID[] DEFAULT '{}',
    brain_entries_created    UUID[] DEFAULT '{}',
    upstream_agent           TEXT,
    downstream_agent         TEXT,

    -- Link to the primary Brain entry this output produced (if any)
    primary_brain_entry      UUID REFERENCES entries(id) ON DELETE SET NULL
);

CREATE INDEX idx_agent_output_timestamp ON agent_output_metadata (timestamp);
CREATE INDEX idx_agent_output_agent ON agent_output_metadata (agent_id);
CREATE INDEX idx_agent_output_project ON agent_output_metadata (project);
CREATE INDEX idx_agent_output_type ON agent_output_metadata (output_type);
CREATE INDEX idx_agent_output_model_tier ON agent_output_metadata (model_tier);
CREATE INDEX idx_agent_output_primary_entry ON agent_output_metadata (primary_brain_entry) WHERE primary_brain_entry IS NOT NULL;

-- ── Outcome Attributions ───────────────────────────────────────
-- Links between outcomes and the decisions that caused them.
-- The Attribution Engine creates and maintains these links.

CREATE TABLE outcome_attributions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- The outcome and decision being linked
    outcome_entry_id    UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    decision_entry_id   UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,

    -- Attribution metadata
    attribution_type    TEXT NOT NULL CHECK (attribution_type IN ('direct', 'temporal', 'semantic')),
    confidence          FLOAT NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
    attribution_lag_ms  BIGINT,

    -- Approval tracking (medium-confidence attributions require Admiral review)
    approved            BOOLEAN NOT NULL DEFAULT false,
    approved_by         TEXT,
    approved_at         TIMESTAMPTZ,

    -- Outcome quality (set by Feedback Synthesizer)
    outcome_positive    BOOLEAN,
    outcome_score       FLOAT CHECK (outcome_score BETWEEN -1.0 AND 1.0),

    UNIQUE (outcome_entry_id, decision_entry_id)
);

CREATE INDEX idx_attribution_outcome ON outcome_attributions (outcome_entry_id);
CREATE INDEX idx_attribution_decision ON outcome_attributions (decision_entry_id);
CREATE INDEX idx_attribution_type ON outcome_attributions (attribution_type);
CREATE INDEX idx_attribution_unapproved ON outcome_attributions (approved) WHERE approved = false;

-- ── Calibration History ────────────────────────────────────────
-- Records trust calibration changes driven by the feedback loop.
-- Immutable history — shows how agent trust evolved over time.

CREATE TABLE calibration_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Which agent was calibrated
    agent_id        TEXT NOT NULL,
    category        TEXT NOT NULL,

    -- What changed
    previous_tier   TEXT NOT NULL CHECK (previous_tier IN ('enforced', 'autonomous', 'propose', 'escalate')),
    new_tier        TEXT NOT NULL CHECK (new_tier IN ('enforced', 'autonomous', 'propose', 'escalate')),
    direction       TEXT NOT NULL CHECK (direction IN ('expanded', 'contracted', 'unchanged')),

    -- Evidence
    evidence_summary    TEXT NOT NULL,
    outcome_count       INT NOT NULL DEFAULT 0,
    positive_rate       FLOAT CHECK (positive_rate BETWEEN 0.0 AND 1.0),
    attribution_ids     UUID[] DEFAULT '{}',

    -- Approval
    recommended_by      TEXT NOT NULL,
    approved_by         TEXT,
    approved_at         TIMESTAMPTZ
);

CREATE INDEX idx_calibration_agent ON calibration_history (agent_id);
CREATE INDEX idx_calibration_timestamp ON calibration_history (timestamp);
CREATE INDEX idx_calibration_direction ON calibration_history (direction);

-- ── Ecosystem Health Metrics ───────────────────────────────────
-- Pipeline health tracking for the Ecosystem Health Monitor.

CREATE TABLE ecosystem_health (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Which stream/component
    stream          TEXT NOT NULL CHECK (stream IN ('engagement', 'trends', 'agent_output', 'operational', 'attribution', 'feedback')),
    component       TEXT NOT NULL,

    -- Health metrics
    status          TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
    latency_ms      INT,
    throughput      FLOAT,
    error_rate      FLOAT CHECK (error_rate BETWEEN 0.0 AND 1.0),
    last_event_at   TIMESTAMPTZ,

    -- Freshness
    freshness_ok    BOOLEAN NOT NULL DEFAULT true,
    staleness_seconds INT,

    details         JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_ecosystem_health_timestamp ON ecosystem_health (timestamp);
CREATE INDEX idx_ecosystem_health_stream ON ecosystem_health (stream);
CREATE INDEX idx_ecosystem_health_status ON ecosystem_health (status) WHERE status != 'healthy';

-- ── Engagement Event Retention ─────────────────────────────────
-- Engagement events are high-volume. Partition by month and retain
-- per policy. Aggregated patterns live in the Brain; raw events age out.
-- Note: Actual partitioning implementation depends on Postgres version
-- and operational requirements. This comment documents the intent;
-- implementers should use native declarative partitioning (PG 10+).

COMMENT ON TABLE engagement_events IS
    'High-volume customer events. Retain raw events for 90 days. '
    'Aggregated patterns are stored as Brain entries by the Engagement Analyst. '
    'Consider partitioning by month for retention management.';

COMMENT ON TABLE trend_snapshots IS
    'Computed trend data. Retained indefinitely for historical analysis. '
    'Significant trends are also recorded as Brain entries.';

COMMENT ON TABLE agent_output_metadata IS
    'Extended metadata for agent outputs. Complements Brain entries with '
    'resource consumption and attribution chain data.';

COMMENT ON TABLE outcome_attributions IS
    'Links between outcomes and decisions. The Attribution Engine creates these. '
    'Medium-confidence attributions require Admiral approval before strengthening.';

COMMENT ON TABLE calibration_history IS
    'Immutable record of trust calibration changes driven by outcome data. '
    'Shows how agent trust evolved over time.';

COMMENT ON TABLE ecosystem_health IS
    'Pipeline health metrics for the Ecosystem Health Monitor. '
    'Tracks freshness, latency, throughput, and error rates across all streams.';
