# FEZI Studio MCP Gateway — readiness record

**Status: not deployed.** This repository contains a route registry and connection requirements only. No MCP server, plugin backend, credential, or upstream endpoint was supplied or tested. Each reserved `/mcp/<plugin-slug>` entry is documentation, not an HTTP route.

Before launch: implement the MCP protocol in the Node host, require bearer authentication per plugin, use least-privilege scoped credentials, reject unknown methods, add rate limits and audit events, and test `initialize`, `tools/list`, and authorized `tools/call` against each real backend. Keep all secrets in the hosting provider's environment store.

Current expected status for every listed integration: `needs_configuration`; none are `connected_and_tested`.
