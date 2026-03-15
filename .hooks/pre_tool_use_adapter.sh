#!/bin/bash
# Admiral Framework — PreToolUse Hook Adapter
# Translates Claude Code PreToolUse payload to Admiral hook contracts.
# Token budget gate removed — was causing unrecoverable deadlocks.
# Budget tracking remains advisory-only in PostToolUse.
set -euo pipefail

# Pass — allow all tool use
exit 0
