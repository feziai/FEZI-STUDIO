#!/usr/bin/env bash
set -euo pipefail
node scripts/check-plugin-hub-release.mjs
node --test tests/plugin-hub-mcp.test.mjs
echo "Source and MCP gateway validated. Create a PRIVATE GitHub repo and push this folder. See docs/GITHUB_MCP_HUB_SETUP_FA.md"
