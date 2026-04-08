# Admiral Framework — Development Makefile (DX-02)
#
# Usage:
#   make setup     Install dependencies and validate environment
#   make test      Run all tests
#   make build     Build all TypeScript
#   make lint      Run all linters
#   make ci        Run full CI pipeline locally (DX-06)
#   make dev       Start control plane in watch mode
#   make clean     Remove build artifacts

.PHONY: setup test build lint ci dev clean ide help

# Default target
help:
	@echo "Admiral Framework Development"
	@echo ""
	@echo "Targets:"
	@echo "  make setup     Install deps, validate environment, run tests"
	@echo "  make test      Run all tests"
	@echo "  make build     Build all TypeScript modules"
	@echo "  make lint      Run all linters (biome, shellcheck)"
	@echo "  make ci        Full CI pipeline locally"
	@echo "  make dev       Start control plane in watch mode"
	@echo "  make ide       Copy IDE templates to .vscode/ (if not present)"
	@echo "  make clean     Remove build artifacts"

# ── Setup ─────────────────────────────────────────────────────

setup:
	@bash setup.sh

# ── Build ─────────────────────────────────────────────────────

build:
	@echo "Building control-plane..."
	@cd control-plane && npx tsc
	@echo "Building fleet..."
	@cd fleet && npx tsc
	@echo "Building platform..."
	@cd platform && npx tsc
	@echo "Building mcp-server..."
	@cd mcp-server && npx tsc
	@echo "Build complete."

# ── Test ──────────────────────────────────────────────────────

test: build
	@echo "Running control-plane tests..."
	@cd control-plane && npm test
	@echo ""
	@echo "Running hook tests..."
	@bash .hooks/tests/test_hooks.sh || true
	@echo ""
	@echo "All tests complete."

# ── Lint ──────────────────────────────────────────────────────

lint:
	@echo "Running Biome (control-plane)..."
	@cd control-plane && npx @biomejs/biome check src/
	@echo ""
	@if command -v shellcheck >/dev/null 2>&1; then \
		echo "Running ShellCheck on hooks..."; \
		shellcheck .hooks/*.sh admiral/lib/*.sh 2>/dev/null || true; \
	else \
		echo "ShellCheck not installed — skipping hook linting"; \
	fi
	@echo "Lint complete."

# ── CI (local) ────────────────────────────────────────────────

ci:
	@bash scripts/ci-local.sh

# ── Dev ───────────────────────────────────────────────────────

dev:
	@echo "Starting control plane in dev mode (tsc watch + auto-restart)..."
	@echo "  TypeScript compiler watches src/ for changes"
	@echo "  Server auto-restarts when dist/ files change"
	@echo "  Press Ctrl+C to stop"
	@echo ""
	@cd control-plane && npx tsc
	@cd control-plane && node --watch dist/src/cli.js

# ── IDE ───────────────────────────────────────────────────────

ide:
	@mkdir -p .vscode
	@for f in settings.json launch.json extensions.json; do \
		if [ ! -f ".vscode/$$f" ]; then \
			cp "ide-templates/$$f" ".vscode/$$f"; \
			echo "Copied $$f to .vscode/"; \
		else \
			echo ".vscode/$$f already exists — skipped"; \
		fi; \
	done
	@echo "IDE setup complete."

# ── Clean ─────────────────────────────────────────────────────

clean:
	@rm -rf control-plane/dist fleet/dist platform/dist mcp-server/dist
	@echo "Build artifacts removed."
