# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

aiStrat is a toolkit for AI agent orchestration — the "Admiral Framework." It combines operational doctrine (admiral/), a semantic long-term memory system (brain/), a continuous AI ecosystem scanner (monitor/), and a 100-agent catalog (fleet/). Currently a specification framework with reference implementations, not a deployment-ready production system.

## Commands

```bash
# Install dependencies (pick extras as needed)
pip install -e ".[dev]"           # dev tools only
pip install -e ".[all]"           # everything

# Run all tests
pytest

# Run tests for a specific module
pytest aiStrat/brain/tests/ -v
pytest aiStrat/monitor/tests/ -v

# Run a single test
pytest aiStrat/brain/tests/test_store.py::TestBrainStore::test_record_and_retrieve -v

# Coverage
pytest --cov=aiStrat --cov-report=html

# Lint
ruff check aiStrat/

# Format
ruff format aiStrat/

# Type check
mypy aiStrat/

# Pre-merge quality gates (seed checksums, no archive imports)
python -m scripts.quality_check

# End-to-end demo (bootstrap → seed → query → record → supersede)
python -m scripts.demo_e2e
```

## Architecture

### Four Layers

1. **Framework (admiral/)** — 11-part operational doctrine. Not executable code — specification that guides agent behavior. Start with `admiral/index.md`.
2. **Brain (brain/)** — Long-term semantic memory with MCP server interface. In-memory store (swappable for SQLite/Postgres). 7 tools: record, query, retrieve, strengthen, supersede, status, audit.
3. **Monitor (monitor/)** — Continuous AI ecosystem scanner. Tracks model releases, agent patterns, trending repos. Has a 4-layer immune system (structural, injection, semantic, antibody) in `quarantine.py`.
4. **Fleet (fleet/)** — 100 agent definitions as markdown specs. One working executable example at `fleet/agents/command/executable/qa_agent.py`.

### Brain Internals

- **Entry model** (`brain/core/models.py`): Atomic knowledge unit with category (DECISION/OUTCOME/LESSON/CONTEXT/FAILURE/PATTERN), authority tier (ENFORCED/AUTONOMOUS/PROPOSE/ESCALATE), and provenance (HUMAN/SEED/SYSTEM/AGENT/MONITOR).
- **Store** (`brain/core/store.py`): Thread-safe dict-based store with bounded audit trail (10K max). SQLite adapter in `brain/core/sqlite_store.py`.
- **Retrieval** (`brain/core/retrieval.py`): 6-signal ranked pipeline — vector similarity, project match, recency, usefulness, category match, speculative discount.
- **MCP server** (`brain/mcp/server.py`): BrainServer class exposing 7 tools. Auth via `brain/mcp/auth.py` with SHA256 key hashing and READ/WRITE/ADMIN scopes.
- **Bootstrap** (`brain/services/bootstrap.py`): Wires store + embeddings + server together.

### Monitor Internals

- **Scanner** (`monitor/scanner.py`): Orchestrates release tracking, trending discovery, and exemplar analysis.
- **Quarantine** (`monitor/quarantine.py`): 4-layer immune system that validates all external data before it enters the Brain. Converts detected attacks into antibody entries.
- **Digest** (`monitor/digest.py`): Generates markdown reports (daily/weekly).
- **Seed Writer** (`monitor/seed_writer.py`): Produces Brain seed candidates (require Admiral review before acceptance).

### Key Entry Points

- `brain.services.bootstrap` — Initialize the Brain
- `monitor.scanner` — Run the ecosystem monitor
- `fleet.agents.command.executable.qa_agent` — Working agent example
- `scripts.demo_e2e` — Full pipeline demo
- `scripts.quality_check` — Pre-merge gates

## Development Constraints

- Python 3.11+ required
- Ruff config: line-length 120, rules E/F/W/I
- `defusedxml` is the only core dependency; all others are optional extras
- Brain storage is in-memory by default — Postgres schema exists at `brain/schema/001_initial.sql` but has no Python integration yet
- Seeds in `brain/seeds/seed_research.py` have checksums verified by `scripts/quality_check.py` — update checksums when modifying seeds

## Known Structural Gaps

These are documented limitations, not bugs:
- **In-memory storage**: Brain loses state on restart. Postgres adapter not yet implemented.
- **No executable agents**: 100 agent specs exist as markdown; no prompt assembly pipeline or agent instantiation framework beyond the qa_agent example.
- **No hooks**: The framework's thesis is "hooks over instructions" but zero hooks are implemented.
- **Incomplete MCP**: BrainServer is a Python class, not a discoverable MCP server. Transport layer exists but is incomplete.
