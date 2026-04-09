#!/bin/bash
# Dev container post-create setup
# Installs system dependencies and project packages
set -euo pipefail

echo "Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq jq shellcheck sqlite3 > /dev/null 2>&1

echo "Installing npm dependencies..."
for dir in control-plane admiral fleet platform mcp-server; do
  if [ -f "$dir/package.json" ]; then
    echo "  $dir/"
    (cd "$dir" && npm install --no-audit --no-fund --silent)
  fi
done

echo "Building TypeScript..."
for dir in control-plane fleet platform mcp-server; do
  if [ -f "$dir/tsconfig.json" ]; then
    (cd "$dir" && npx tsc 2>/dev/null) || true
  fi
done

echo "Dev container ready."
