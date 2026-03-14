-- Admiral Framework v0.4.0-alpha
-- ============================================================================
-- Comprehensive test suite for the Fleet Brain schema
-- Focus: Sensitive Data Guard trigger + schema constraints + normal operations
-- Includes: purge support, audit immutability, cascade behavior
-- ============================================================================

\set ON_ERROR_STOP off

-- Helper: track pass/fail counts
CREATE TEMPORARY TABLE test_results (
    test_name TEXT NOT NULL,
    passed BOOLEAN NOT NULL,
    detail TEXT
);

-- Helper function to run a test that should SUCCEED
CREATE OR REPLACE FUNCTION test_should_succeed(
    p_test_name TEXT,
    p_sql TEXT
) RETURNS VOID AS $$
BEGIN
    EXECUTE p_sql;
    INSERT INTO test_results VALUES (p_test_name, true, 'Inserted successfully');
EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES (p_test_name, false, SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Helper function to run a test that should FAIL
CREATE OR REPLACE FUNCTION test_should_fail(
    p_test_name TEXT,
    p_sql TEXT,
    p_expected_msg TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    EXECUTE p_sql;
    INSERT INTO test_results VALUES (p_test_name, false, 'ERROR: Insert succeeded but should have been rejected');
EXCEPTION WHEN OTHERS THEN
    IF p_expected_msg IS NOT NULL AND SQLERRM NOT LIKE '%' || p_expected_msg || '%' THEN
        INSERT INTO test_results VALUES (p_test_name, false, 'Wrong error: ' || SQLERRM);
    ELSE
        INSERT INTO test_results VALUES (p_test_name, true, 'Correctly rejected: ' || SQLERRM);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Clean slate
DELETE FROM entry_links;
DELETE FROM entries;

-- ============================================================================
-- PART 1: NORMAL USE CASES — entries that SHOULD succeed
-- ============================================================================

SELECT '=== PART 1: Normal use cases (should succeed) ===' AS section;

SELECT test_should_succeed(
    'Normal: basic decision entry',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, authority_tier)
      VALUES ('myproject', 'decision', 'Chose JWT for auth', 'We chose JWT because we need stateless horizontal scaling. Session-based auth would require sticky sessions.', 'architect-agent', 'sess-001', 'autonomous')$$
);

SELECT test_should_succeed(
    'Normal: lesson entry',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('myproject', 'lesson', 'Connection pooling reduces latency', 'Database connection pooling reduced p99 latency by 40%. Use PgBouncer in transaction mode.', 'backend-agent', 'sess-002')$$
);

SELECT test_should_succeed(
    'Normal: failure entry',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('myproject', 'failure', 'Migration failed silently', 'Migration appeared successful but did not verify row counts. Always add post-migration validation.', 'dba-agent', 'sess-003')$$
);

SELECT test_should_succeed(
    'Normal: pattern entry',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('myproject', 'pattern', 'Always validate webhook signatures', 'Webhook payloads must be verified using HMAC signatures before processing to prevent replay attacks.', 'security-agent', 'sess-004')$$
);

SELECT test_should_succeed(
    'Normal: context entry',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('myproject', 'context', 'Project uses Postgres 16 with pgvector', 'Semantic search is powered by pgvector with HNSW indexes for approximate nearest neighbor queries.', 'SYSTEM', 'BOOTSTRAP')$$
);

SELECT test_should_succeed(
    'Normal: outcome entry',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('myproject', 'outcome', 'Switching to connection pooling resolved timeouts', 'After deploying PgBouncer, the 504 timeout errors dropped to zero. p99 went from 2.3s to 0.4s.', 'backend-agent', 'sess-005')$$
);

SELECT test_should_succeed(
    'Normal: entry with safe metadata',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, metadata)
      VALUES ('myproject', 'decision', 'Use Redis for caching', 'Chose Redis over Memcached for its data structure support and persistence options.', 'architect-agent', 'sess-006', '{"tags": ["caching", "infrastructure"], "priority": "high"}')$$
);

SELECT test_should_succeed(
    'Normal: entry with nested metadata',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, metadata)
      VALUES ('myproject', 'pattern', 'Rate limiting strategy', 'Apply sliding window rate limiting at the API gateway level. 100 req/min for standard, 1000 for premium.', 'architect-agent', 'sess-007', '{"tags": ["security", "api"], "config": {"window": "60s", "limit": 100}}')$$
);

SELECT test_should_succeed(
    'Normal: referencing vault location (not credential value)',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('myproject', 'decision', 'Credential storage approach', 'All database credentials are stored in the vault under prod/db/primary. Agents access via broker only.', 'security-agent', 'sess-008')$$
);

SELECT test_should_succeed(
    'Normal: elevated sensitivity',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, sensitivity)
      VALUES ('myproject', 'context', 'Internal architecture overview', 'The system uses a microservices architecture with 12 services communicating via gRPC.', 'architect-agent', 'sess-009', 'elevated')$$
);

SELECT test_should_succeed(
    'Normal: restricted sensitivity',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, sensitivity)
      VALUES ('myproject', 'decision', 'Incident response protocol', 'In case of breach: 1. Isolate affected services 2. Revoke all tokens 3. Notify security team.', 'security-agent', 'sess-010', 'restricted')$$
);

SELECT test_should_succeed(
    'Normal: unapproved seed candidate',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, approved)
      VALUES ('myproject', 'lesson', 'Candidate lesson from monitor', 'External research suggests using circuit breakers for inter-service calls.', 'monitor-agent', 'sess-011', false)$$
);

SELECT test_should_succeed(
    'Normal: word "email" in natural prose (not an address)',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('myproject', 'lesson', 'Notification channels', 'We support email and SMS notifications. Configure the notification service for delivery preferences.', 'backend-agent', 'sess-012')$$
);

SELECT test_should_succeed(
    'Normal: word "password" in natural prose (not a value)',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('myproject', 'decision', 'Auth UX decision', 'Password reset flow uses time-limited tokens. Users get 15 minutes to complete the reset.', 'frontend-agent', 'sess-013')$$
);

SELECT test_should_succeed(
    'Normal: word "token" in natural prose',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('myproject', 'pattern', 'Token lifecycle management', 'Tokens should be rotated every 24 hours. Refresh tokens last 7 days. Revoke on logout.', 'security-agent', 'sess-014')$$
);

SELECT test_should_succeed(
    'Normal: numbers that are NOT SSNs',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('myproject', 'outcome', 'Performance metrics', 'Throughput improved from 1000 to 5000 requests per second after optimization.', 'backend-agent', 'sess-015')$$
);

SELECT test_should_succeed(
    'Normal: URL without credentials',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('myproject', 'context', 'API endpoint', 'The production API is at https://api.example.com/v2 behind CloudFront.', 'devops-agent', 'sess-016')$$
);

SELECT test_should_succeed(
    'Normal: metadata key "token_rotation_policy" (not in banned list)',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, metadata)
      VALUES ('myproject', 'pattern', 'Token rotation', 'Rotate all service tokens every 24h.', 'security-agent', 'sess-017', '{"token_rotation_policy": "24h"}')$$
);

-- ============================================================================
-- PART 2: SENSITIVE DATA — entries that MUST be rejected
-- ============================================================================

SELECT '=== PART 2: Sensitive data rejection (should fail) ===' AS section;

-- Email addresses
SELECT test_should_fail(
    'Reject: email in content',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'lesson', 'Auth debugging', 'User john.doe@example.com had an auth failure.', 'agent', 'sess')$$,
    'email address'
);

SELECT test_should_fail(
    'Reject: email in title',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'context', 'Issue reported by admin@company.org', 'The admin reported slow queries.', 'agent', 'sess')$$,
    'email address'
);

SELECT test_should_fail(
    'Reject: email with plus addressing',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'lesson', 'Test', 'Contact user+tag@gmail.com for details.', 'agent', 'sess')$$,
    'email address'
);

SELECT test_should_fail(
    'Reject: email with subdomain',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'lesson', 'Test', 'Reach out to admin@mail.internal.company.co.uk for help.', 'agent', 'sess')$$,
    'email address'
);

SELECT test_should_fail(
    'Reject: email with dots in local part',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'lesson', 'Test', 'Ask first.last.name@example.com about this.', 'agent', 'sess')$$,
    'email address'
);

-- SSN patterns
SELECT test_should_fail(
    'Reject: SSN in content (XXX-XX-XXXX)',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'context', 'User identity', 'SSN is 123-45-6789 for verification.', 'agent', 'sess')$$,
    'SSN'
);

SELECT test_should_fail(
    'Reject: SSN in title',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'context', 'Record for SSN 987-65-4321', 'Some content.', 'agent', 'sess')$$,
    'SSN'
);

-- AWS keys
SELECT test_should_fail(
    'Reject: AWS access key (AKIA) in content',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'context', 'AWS setup', 'Access key is AKIAIOSFODNN7EXAMPLE.', 'agent', 'sess')$$,
    'AWS key'
);

SELECT test_should_fail(
    'Reject: AWS access key (ASIA) in content',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'context', 'AWS temp creds', 'Temporary key ASIATEMPORARYKEYEXAM was issued.', 'agent', 'sess')$$,
    'AWS key'
);

SELECT test_should_fail(
    'Reject: AWS key in title',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'context', 'Key AKIAIOSFODNN7EXAMPLE rotated', 'Rotated the key.', 'agent', 'sess')$$,
    'AWS key'
);

-- Connection strings
-- Note: connection strings with user@host are caught by the email regex first,
-- which fires before the connection string check. The data is still rejected —
-- we just don't assert on the specific error message.
SELECT test_should_fail(
    'Reject: PostgreSQL connection string',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'context', 'DB config', 'Connect to postgresql://admin:s3cret@db.example.com:5432/prod', 'agent', 'sess')$$,
    'Sensitive data rejected'
);

SELECT test_should_fail(
    'Reject: MySQL connection string',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'context', 'DB config', 'Use mysql://root:password123@localhost:3306/mydb', 'agent', 'sess')$$,
    'Sensitive data rejected'
);

SELECT test_should_fail(
    'Reject: MongoDB connection string',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'context', 'DB config', 'mongodb://dbuser:dbpass@cluster0.mongodb.net/test', 'agent', 'sess')$$,
    'Sensitive data rejected'
);

SELECT test_should_fail(
    'Reject: Redis connection string',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'context', 'Cache config', 'redis://default:mysecretpassword@redis.example.com:6379', 'agent', 'sess')$$,
    'Sensitive data rejected'
);

SELECT test_should_fail(
    'Reject: connection string in title',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'context', 'Config: postgresql://user:pass@host/db', 'Connection details.', 'agent', 'sess')$$,
    'Sensitive data rejected'
);

-- Metadata key rejection
SELECT test_should_fail(
    'Reject: metadata key "email"',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, metadata)
      VALUES ('test', 'context', 'User context', 'Preferences recorded.', 'agent', 'sess', '{"email": "user@example.com"}')$$,
    'metadata contains PII'
);

SELECT test_should_fail(
    'Reject: metadata key "phone"',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, metadata)
      VALUES ('test', 'context', 'Contact info', 'Details recorded.', 'agent', 'sess', '{"phone": "555-0100"}')$$,
    'metadata contains PII'
);

SELECT test_should_fail(
    'Reject: metadata key "ssn"',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, metadata)
      VALUES ('test', 'context', 'Identity', 'Recorded.', 'agent', 'sess', '{"ssn": "123-45-6789"}')$$,
    'metadata contains PII'
);

SELECT test_should_fail(
    'Reject: metadata key "password"',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, metadata)
      VALUES ('test', 'context', 'Config', 'Saved.', 'agent', 'sess', '{"password": "hunter2"}')$$,
    'metadata contains PII'
);

SELECT test_should_fail(
    'Reject: metadata key "secret"',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, metadata)
      VALUES ('test', 'context', 'API setup', 'Done.', 'agent', 'sess', '{"secret": "abc123"}')$$,
    'metadata contains PII'
);

SELECT test_should_fail(
    'Reject: metadata key "api_key"',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, metadata)
      VALUES ('test', 'context', 'Service config', 'Configured.', 'agent', 'sess', '{"api_key": "sk-abc123"}')$$,
    'metadata contains PII'
);

SELECT test_should_fail(
    'Reject: metadata key "credit_card"',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, metadata)
      VALUES ('test', 'context', 'Payment info', 'Stored.', 'agent', 'sess', '{"credit_card": "4111111111111111"}')$$,
    'metadata contains PII'
);

SELECT test_should_fail(
    'Reject: metadata key "private_key"',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, metadata)
      VALUES ('test', 'context', 'Key storage', 'Keys.', 'agent', 'sess', '{"private_key": "-----BEGIN RSA PRIVATE KEY-----"}')$$,
    'metadata contains PII'
);

-- ============================================================================
-- PART 3: EDGE CASES
-- ============================================================================

SELECT '=== PART 3: Edge cases ===' AS section;

-- Edge: email-LIKE patterns that should be accepted (controversial — document behavior)
SELECT test_should_fail(
    'Edge: version string like a@b.cd — triggers email regex (known false positive)',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'context', 'Test', 'Use package a@b.cd for the build.', 'agent', 'sess')$$,
    'email address'
);

-- Edge: multiple sensitive patterns in one entry
SELECT test_should_fail(
    'Edge: multiple violations (email + AWS key)',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'context', 'Multi', 'Contact admin@test.com, key is AKIAIOSFODNN7EXAMPLE.', 'agent', 'sess')$$,
    'email address'
);

-- Edge: sensitive data buried in long content
SELECT test_should_fail(
    'Edge: email buried in long content',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'lesson', 'Performance review', 'After extensive analysis of the system performance metrics across all 47 microservices, we determined that the bottleneck was in the authentication layer. The team lead jane.smith@company.com identified the root cause as excessive token validation overhead. This insight led to a 3x throughput improvement.', 'agent', 'sess')$$,
    'email address'
);

-- Edge: case variations in connection strings
SELECT test_should_fail(
    'Edge: uppercase connection string protocol',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'context', 'Config', 'Use POSTGRESQL://admin:pass@host/db', 'agent', 'sess')$$,
    'Sensitive data rejected'
);

SELECT test_should_fail(
    'Edge: mixed case connection string',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'context', 'Config', 'Use PostgreSQL://admin:pass@host/db', 'agent', 'sess')$$,
    'Sensitive data rejected'
);

-- Edge: empty metadata should be fine
SELECT test_should_succeed(
    'Edge: empty metadata object',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, metadata)
      VALUES ('test', 'decision', 'Empty metadata', 'This has empty metadata.', 'agent', 'sess', '{}')$$
);

-- Edge: null-ish metadata values should be fine
SELECT test_should_succeed(
    'Edge: metadata with null values',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, metadata)
      VALUES ('test', 'decision', 'Null metadata vals', 'Content.', 'agent', 'sess', '{"key": null}')$$
);

-- Edge: metadata key that is a SUBSTRING of banned key
SELECT test_should_succeed(
    'Edge: metadata key "email_templates" is NOT "email"',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, metadata)
      VALUES ('test', 'pattern', 'Email templates', 'Use Handlebars for email templates.', 'agent', 'sess', '{"email_templates": "handlebars"}')$$
);

-- Edge: very long content that is clean
SELECT test_should_succeed(
    'Edge: very long clean content (10000 chars)',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'lesson', 'Long lesson', repeat('This is a clean sentence about software architecture. ', 200), 'agent', 'sess')$$
);

-- Edge: special characters in content
SELECT test_should_succeed(
    'Edge: special chars (unicode, emoji, newlines)',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'lesson', 'Special characters test', E'Line 1\nLine 2\nÜñîcödé: 日本語 中文\nTab:\there', 'agent', 'sess')$$
);

-- Edge: content with @ but not email
SELECT test_should_succeed(
    'Edge: @ in decorator syntax',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'pattern', 'Python decorators', 'Use @property and @staticmethod decorators for clean class design.', 'agent', 'sess')$$
);

-- ============================================================================
-- PART 4: UPDATE PATH — trigger fires on UPDATE too
-- ============================================================================

SELECT '=== PART 4: Update path ===' AS section;

-- First insert a clean entry, then try to update it with sensitive data
SELECT test_should_succeed(
    'Update setup: insert clean entry',
    $$INSERT INTO entries (id, project, category, title, content, source_agent, source_session)
      VALUES ('a0000000-0000-0000-0000-000000000001', 'test', 'decision', 'Clean entry', 'This is perfectly clean.', 'agent', 'sess')$$
);

SELECT test_should_fail(
    'Update: inject email via UPDATE content',
    $$UPDATE entries SET content = 'Contact admin@evil.com for help.' WHERE id = 'a0000000-0000-0000-0000-000000000001'$$,
    'email address'
);

SELECT test_should_fail(
    'Update: inject email via UPDATE title',
    $$UPDATE entries SET title = 'Issue from admin@evil.com' WHERE id = 'a0000000-0000-0000-0000-000000000001'$$,
    'email address'
);

SELECT test_should_fail(
    'Update: inject SSN via UPDATE',
    $$UPDATE entries SET content = 'SSN: 123-45-6789' WHERE id = 'a0000000-0000-0000-0000-000000000001'$$,
    'SSN'
);

SELECT test_should_fail(
    'Update: inject sensitive metadata key via UPDATE',
    $$UPDATE entries SET metadata = '{"password": "secret123"}' WHERE id = 'a0000000-0000-0000-0000-000000000001'$$,
    'metadata contains PII'
);

SELECT test_should_succeed(
    'Update: clean update should work',
    $$UPDATE entries SET content = 'Updated: still perfectly clean content.' WHERE id = 'a0000000-0000-0000-0000-000000000001'$$
);

-- ============================================================================
-- PART 5: SCHEMA CONSTRAINTS (non-trigger)
-- ============================================================================

SELECT '=== PART 5: Schema constraints ===' AS section;

SELECT test_should_fail(
    'Constraint: invalid category',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'opinion', 'Bad category', 'Content.', 'agent', 'sess')$$,
    'category'
);

SELECT test_should_fail(
    'Constraint: invalid sensitivity',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, sensitivity)
      VALUES ('test', 'decision', 'Bad sensitivity', 'Content.', 'agent', 'sess', 'top_secret')$$,
    'sensitivity'
);

SELECT test_should_fail(
    'Constraint: invalid authority_tier',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, authority_tier)
      VALUES ('test', 'decision', 'Bad tier', 'Content.', 'agent', 'sess', 'admin')$$,
    'authority_tier'
);

SELECT test_should_fail(
    'Constraint: null project',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES (NULL, 'decision', 'No project', 'Content.', 'agent', 'sess')$$
);

SELECT test_should_fail(
    'Constraint: null title',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'decision', NULL, 'Content.', 'agent', 'sess')$$
);

SELECT test_should_fail(
    'Constraint: null content',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'decision', 'Title', NULL, 'agent', 'sess')$$
);

SELECT test_should_fail(
    'Constraint: null source_agent',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'decision', 'Title', 'Content.', NULL, 'sess')$$
);

SELECT test_should_fail(
    'Constraint: null source_session',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session)
      VALUES ('test', 'decision', 'Title', 'Content.', 'agent', NULL)$$
);

-- ============================================================================
-- PART 6: ENTRY LINKS
-- ============================================================================

SELECT '=== PART 6: Entry links ===' AS section;

-- Insert two entries for linking
SELECT test_should_succeed(
    'Links setup: entry A',
    $$INSERT INTO entries (id, project, category, title, content, source_agent, source_session)
      VALUES ('b0000000-0000-0000-0000-000000000001', 'test', 'decision', 'Entry A', 'First entry.', 'agent', 'sess')$$
);

SELECT test_should_succeed(
    'Links setup: entry B',
    $$INSERT INTO entries (id, project, category, title, content, source_agent, source_session)
      VALUES ('b0000000-0000-0000-0000-000000000002', 'test', 'outcome', 'Entry B', 'Second entry.', 'agent', 'sess')$$
);

SELECT test_should_succeed(
    'Links: supports link',
    $$INSERT INTO entry_links (source_id, target_id, link_type) VALUES ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'supports')$$
);

SELECT test_should_succeed(
    'Links: contradicts link',
    $$INSERT INTO entry_links (source_id, target_id, link_type) VALUES ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'contradicts')$$
);

SELECT test_should_succeed(
    'Links: supersedes link',
    $$INSERT INTO entry_links (source_id, target_id, link_type) VALUES ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'supersedes')$$
);

SELECT test_should_succeed(
    'Links: elaborates link',
    $$INSERT INTO entry_links (source_id, target_id, link_type) VALUES ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'elaborates')$$
);

SELECT test_should_succeed(
    'Links: caused_by link',
    $$INSERT INTO entry_links (source_id, target_id, link_type) VALUES ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'caused_by')$$
);

SELECT test_should_fail(
    'Links: invalid link_type',
    $$INSERT INTO entry_links (source_id, target_id, link_type) VALUES ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'related_to')$$,
    'link_type'
);

SELECT test_should_fail(
    'Links: duplicate (same source, target, type)',
    $$INSERT INTO entry_links (source_id, target_id, link_type) VALUES ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'supports')$$
);

SELECT test_should_fail(
    'Links: FK to nonexistent entry',
    $$INSERT INTO entry_links (source_id, target_id, link_type) VALUES ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-999999999999', 'supports')$$
);

-- ============================================================================
-- PART 7: AUDIT LOG
-- ============================================================================

SELECT '=== PART 7: Audit log ===' AS section;

SELECT test_should_succeed(
    'Audit: insert record',
    $$INSERT INTO audit_log (agent_id, session_id, project, operation, result)
      VALUES ('architect-agent', 'sess-001', 'myproject', 'record', 'success')$$
);

SELECT test_should_succeed(
    'Audit: insert with entry_id (no FK, historical reference)',
    $$INSERT INTO audit_log (agent_id, session_id, project, operation, entry_id, result)
      VALUES ('agent', 'sess', 'test', 'retrieve', 'b0000000-0000-0000-0000-000000000001', 'success')$$
);

SELECT test_should_succeed(
    'Audit: insert with risk_flags',
    $$INSERT INTO audit_log (agent_id, session_id, project, operation, result, risk_flags)
      VALUES ('agent', 'sess', 'test', 'query', 'success', '["cross_project_read", "high_volume"]')$$
);

SELECT test_should_succeed(
    'Audit: purge operation',
    $$INSERT INTO audit_log (agent_id, session_id, project, operation, result, details)
      VALUES ('admin-agent', 'sess-purge', 'test', 'purge', 'success', '{"reason": "GDPR Article 17 request", "entries_purged": 3}')$$
);

SELECT test_should_fail(
    'Audit: invalid operation',
    $$INSERT INTO audit_log (agent_id, session_id, project, operation, result)
      VALUES ('agent', 'sess', 'test', 'delete', 'success')$$,
    'operation'
);

SELECT test_should_fail(
    'Audit: invalid result',
    $$INSERT INTO audit_log (agent_id, session_id, project, operation, result)
      VALUES ('agent', 'sess', 'test', 'record', 'failed')$$,
    'result'
);

-- Audit log immutability: updates and deletes should silently do nothing (rules)
DO $$
DECLARE
    v_id UUID;
    v_count INT;
BEGIN
    INSERT INTO audit_log (agent_id, session_id, project, operation, result)
    VALUES ('test-agent', 'test-sess', 'test', 'record', 'success')
    RETURNING id INTO v_id;

    -- Try update — should silently fail due to rule
    UPDATE audit_log SET result = 'error' WHERE id = v_id;
    SELECT COUNT(*) INTO v_count FROM audit_log WHERE id = v_id AND result = 'success';
    IF v_count = 1 THEN
        INSERT INTO test_results VALUES ('Audit: UPDATE silently blocked by rule', true, 'Row unchanged after UPDATE attempt');
    ELSE
        INSERT INTO test_results VALUES ('Audit: UPDATE silently blocked by rule', false, 'Row was modified — rule is broken');
    END IF;

    -- Try delete — should silently fail due to rule
    DELETE FROM audit_log WHERE id = v_id;
    SELECT COUNT(*) INTO v_count FROM audit_log WHERE id = v_id;
    IF v_count = 1 THEN
        INSERT INTO test_results VALUES ('Audit: DELETE silently blocked by rule', true, 'Row still exists after DELETE attempt');
    ELSE
        INSERT INTO test_results VALUES ('Audit: DELETE silently blocked by rule', false, 'Row was deleted — rule is broken');
    END IF;
END $$;

-- ============================================================================
-- PART 8: SUPERSESSION CHAIN
-- ============================================================================

SELECT '=== PART 8: Supersession ===' AS section;

SELECT test_should_succeed(
    'Supersession: set superseded_by to valid entry',
    $$UPDATE entries SET superseded_by = 'b0000000-0000-0000-0000-000000000002' WHERE id = 'b0000000-0000-0000-0000-000000000001'$$
);

SELECT test_should_fail(
    'Supersession: set superseded_by to nonexistent entry',
    $$UPDATE entries SET superseded_by = 'c0000000-0000-0000-0000-999999999999' WHERE id = 'b0000000-0000-0000-0000-000000000002'$$
);

-- ============================================================================
-- PART 9: CASCADE BEHAVIOR
-- ============================================================================

SELECT '=== PART 9: Cascade deletes ===' AS section;

DO $$
DECLARE
    v_link_count INT;
BEGIN
    -- Count links referencing entry A
    SELECT COUNT(*) INTO v_link_count FROM entry_links
    WHERE source_id = 'b0000000-0000-0000-0000-000000000001'
       OR target_id = 'b0000000-0000-0000-0000-000000000001';

    -- Delete entry A — links should cascade
    DELETE FROM entries WHERE id = 'b0000000-0000-0000-0000-000000000001';

    SELECT COUNT(*) INTO v_link_count FROM entry_links
    WHERE source_id = 'b0000000-0000-0000-0000-000000000001'
       OR target_id = 'b0000000-0000-0000-0000-000000000001';

    IF v_link_count = 0 THEN
        INSERT INTO test_results VALUES ('Cascade: deleting entry removes its links', true, 'Links cleaned up');
    ELSE
        INSERT INTO test_results VALUES ('Cascade: deleting entry removes its links', false, v_link_count || ' orphan links remain');
    END IF;
END $$;

-- ============================================================================
-- PART 10: updated_at TRIGGER
-- ============================================================================

SELECT '=== PART 10: updated_at trigger ===' AS section;

DO $$
DECLARE
    v_created TIMESTAMPTZ;
    v_updated TIMESTAMPTZ;
BEGIN
    SELECT created_at, updated_at INTO v_created, v_updated
    FROM entries WHERE id = 'a0000000-0000-0000-0000-000000000001';

    -- Sleep briefly to ensure time difference
    PERFORM pg_sleep(0.1);

    UPDATE entries SET usefulness = usefulness + 1
    WHERE id = 'a0000000-0000-0000-0000-000000000001';

    SELECT updated_at INTO v_updated
    FROM entries WHERE id = 'a0000000-0000-0000-0000-000000000001';

    IF v_updated > v_created THEN
        INSERT INTO test_results VALUES ('updated_at: auto-updates on modification', true, 'updated_at advanced');
    ELSE
        INSERT INTO test_results VALUES ('updated_at: auto-updates on modification', false, 'updated_at did not change');
    END IF;
END $$;

-- ============================================================================
-- PART 11: DEFAULT VALUES
-- ============================================================================

SELECT '=== PART 11: Default values ===' AS section;

DO $$
DECLARE
    v_row entries%ROWTYPE;
BEGIN
    INSERT INTO entries (project, category, title, content, source_agent, source_session)
    VALUES ('test', 'decision', 'Defaults test', 'Testing defaults.', 'agent', 'sess')
    RETURNING * INTO v_row;

    -- Check defaults
    IF v_row.sensitivity = 'standard' THEN
        INSERT INTO test_results VALUES ('Default: sensitivity = standard', true, v_row.sensitivity);
    ELSE
        INSERT INTO test_results VALUES ('Default: sensitivity = standard', false, v_row.sensitivity);
    END IF;

    IF v_row.approved = true THEN
        INSERT INTO test_results VALUES ('Default: approved = true', true, v_row.approved::text);
    ELSE
        INSERT INTO test_results VALUES ('Default: approved = true', false, v_row.approved::text);
    END IF;

    IF v_row.access_count = 0 THEN
        INSERT INTO test_results VALUES ('Default: access_count = 0', true, v_row.access_count::text);
    ELSE
        INSERT INTO test_results VALUES ('Default: access_count = 0', false, v_row.access_count::text);
    END IF;

    IF v_row.usefulness = 0 THEN
        INSERT INTO test_results VALUES ('Default: usefulness = 0', true, v_row.usefulness::text);
    ELSE
        INSERT INTO test_results VALUES ('Default: usefulness = 0', false, v_row.usefulness::text);
    END IF;

    IF v_row.embedding_model = 'text-embedding-3-small' THEN
        INSERT INTO test_results VALUES ('Default: embedding_model = text-embedding-3-small', true, v_row.embedding_model);
    ELSE
        INSERT INTO test_results VALUES ('Default: embedding_model = text-embedding-3-small', false, v_row.embedding_model);
    END IF;

    IF v_row.metadata = '{}' THEN
        INSERT INTO test_results VALUES ('Default: metadata = {}', true, v_row.metadata::text);
    ELSE
        INSERT INTO test_results VALUES ('Default: metadata = {}', false, v_row.metadata::text);
    END IF;

    IF v_row.id IS NOT NULL THEN
        INSERT INTO test_results VALUES ('Default: UUID auto-generated', true, v_row.id::text);
    ELSE
        INSERT INTO test_results VALUES ('Default: UUID auto-generated', false, 'NULL');
    END IF;

    IF v_row.created_at IS NOT NULL AND v_row.updated_at IS NOT NULL THEN
        INSERT INTO test_results VALUES ('Default: timestamps auto-set', true, 'created_at and updated_at set');
    ELSE
        INSERT INTO test_results VALUES ('Default: timestamps auto-set', false, 'Missing timestamps');
    END IF;

    IF v_row.superseded_by IS NULL THEN
        INSERT INTO test_results VALUES ('Default: superseded_by = NULL', true, 'NULL as expected');
    ELSE
        INSERT INTO test_results VALUES ('Default: superseded_by = NULL', false, v_row.superseded_by::text);
    END IF;

    IF v_row.purged_at IS NULL THEN
        INSERT INTO test_results VALUES ('Default: purged_at = NULL', true, 'NULL as expected');
    ELSE
        INSERT INTO test_results VALUES ('Default: purged_at = NULL', false, v_row.purged_at::text);
    END IF;

    IF v_row.purge_reason IS NULL THEN
        INSERT INTO test_results VALUES ('Default: purge_reason = NULL', true, 'NULL as expected');
    ELSE
        INSERT INTO test_results VALUES ('Default: purge_reason = NULL', false, v_row.purge_reason);
    END IF;
END $$;

-- ============================================================================
-- PART 12: PURGE SUPPORT
-- ============================================================================

SELECT '=== PART 12: Purge support ===' AS section;

-- Insert an entry, then simulate purge (NULLing content fields, setting purge timestamp)
DO $$
DECLARE
    v_id UUID;
    v_row entries%ROWTYPE;
BEGIN
    -- Create an entry with content that would normally trigger the sensitive data guard
    -- (but won't because it's clean)
    INSERT INTO entries (project, category, title, content, source_agent, source_session, metadata)
    VALUES ('test', 'decision', 'Entry to be purged', 'This entry contains important decisions.', 'agent', 'sess', '{"tags": ["retention"]}')
    RETURNING id INTO v_id;

    -- Simulate purge: NULL content fields, set purge timestamp and reason
    -- The trigger should allow this because purged_at is set
    UPDATE entries SET
        title = 'PURGED',
        content = 'PURGED',
        metadata = '{}',
        purged_at = now(),
        purge_reason = 'GDPR Article 17 request #12345'
    WHERE id = v_id;

    SELECT * INTO v_row FROM entries WHERE id = v_id;

    IF v_row.purged_at IS NOT NULL AND v_row.purge_reason = 'GDPR Article 17 request #12345' THEN
        INSERT INTO test_results VALUES ('Purge: entry can be purged (tombstoned)', true, 'purged_at set, reason recorded');
    ELSE
        INSERT INTO test_results VALUES ('Purge: entry can be purged (tombstoned)', false, 'Purge fields not set correctly');
    END IF;

    IF v_row.content = 'PURGED' AND v_row.title = 'PURGED' THEN
        INSERT INTO test_results VALUES ('Purge: content fields replaced with tombstone', true, 'title and content set to PURGED');
    ELSE
        INSERT INTO test_results VALUES ('Purge: content fields replaced with tombstone', false, 'content: ' || v_row.content);
    END IF;

    -- Verify the entry still retains its structural fields
    IF v_row.project = 'test' AND v_row.category = 'decision' AND v_row.source_agent = 'agent' THEN
        INSERT INTO test_results VALUES ('Purge: structural fields preserved after purge', true, 'project, category, source_agent intact');
    ELSE
        INSERT INTO test_results VALUES ('Purge: structural fields preserved after purge', false, 'Structural fields corrupted');
    END IF;
END $$;

-- Verify that purged entries bypass the sensitive data guard
-- (they could have "PURGED" as content which is fine, but test with edge case)
DO $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO entries (project, category, title, content, source_agent, source_session)
    VALUES ('test', 'decision', 'Will be purged', 'Clean content for now.', 'agent', 'sess')
    RETURNING id INTO v_id;

    -- Simulate a purge that happens to leave content that looks like an email
    -- (shouldn't happen in practice, but tests the guard bypass)
    UPDATE entries SET
        purged_at = now(),
        purge_reason = 'Test purge bypass',
        content = 'purged-by-admin@system.internal'
    WHERE id = v_id;

    INSERT INTO test_results VALUES ('Purge: sensitive data guard bypassed for purged entries', true, 'Purged entry accepted despite email-like content');
EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('Purge: sensitive data guard bypassed for purged entries', false, SQLERRM);
END $$;

-- Verify that un-purged entries still get checked
SELECT test_should_fail(
    'Purge: non-purged entries still checked by guard',
    $$INSERT INTO entries (project, category, title, content, source_agent, source_session, purge_reason)
      VALUES ('test', 'decision', 'Not purged', 'admin@evil.com', 'agent', 'sess', 'fake purge reason without purged_at')$$,
    'email address'
);

-- ============================================================================
-- RESULTS SUMMARY
-- ============================================================================

SELECT '=== TEST RESULTS ===' AS section;
SELECT
    CASE WHEN passed THEN 'PASS' ELSE '** FAIL **' END AS status,
    test_name,
    detail
FROM test_results
ORDER BY passed DESC, test_name;

SELECT '---' AS separator;
SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE passed) AS passed,
    COUNT(*) FILTER (WHERE NOT passed) AS failed
FROM test_results;

-- Cleanup
DROP FUNCTION IF EXISTS test_should_succeed(TEXT, TEXT);
DROP FUNCTION IF EXISTS test_should_fail(TEXT, TEXT, TEXT);
