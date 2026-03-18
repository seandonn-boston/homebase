# Changelog

All notable changes to the Admiral Control Plane.

## [0.7.0-alpha] — 2026-03-18

### Added
- `RingBuffer<T>` utility for O(1) event/sample eviction
- Comprehensive test suite: server (18 tests), CLI (7 tests), integration (10 tests), RingBuffer (18 tests)
- `AdmiralInstance` type for `createAdmiral()` return value
- `SPCViolation` exported from public API
- Defensive error handling in HTTP request handler (try/catch)
- `errorJson()` helper for consistent error responses
- `test:coverage` script using Node.js native coverage
- Advisory file locking (`with_state_lock`) for session state management
- Git pre-commit hook for ShellCheck and Biome
- Architecture Decision Records (ADR-001 through ADR-004)
- HTTP API documentation (`API.md`)
- `CONTRIBUTING.md` with setup, workflow, and coding standards
- PR template and issue templates
- Dependabot configuration for npm and GitHub Actions
- ShellCheck and hook tests CI workflow

### Fixed
- Async promise swallowing in `fireAlert` — rejections now caught with fail-safe pause
- Event counter scoped per `EventStream` instance (was module-level)
- Alert counter scoped per `RunawayDetector` instance (was module-level)
- Consistent JSON error responses from HTTP server (was mix of plain text and JSON)
- ShellCheck warnings resolved in all hook and lib scripts

### Changed
- `EventStream` uses `RingBuffer` instead of array+splice for O(1) eviction
- `ControlChart` uses `RingBuffer` instead of array+shift for O(1) sample eviction
- `server.start()` returns actual port number for testability
- Test script autodiscovers `*.test.js` files via glob pattern
- `parseArgs` exported from CLI module for testability
- CI pipeline now includes npm audit and test coverage reporting

## [0.6.0-alpha] — 2026-03-17

### Added
- Initial control plane implementation
- Event stream with configurable max events
- Runaway detector with SPC (Statistical Process Control)
- Execution trace with ASCII rendering
- HTTP server with dashboard
- JSONL journal ingester
- Agent instrumentation helpers
