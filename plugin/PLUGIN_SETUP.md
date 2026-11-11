# FEZI Studio — Private ChatGPT MCP plugin (developer integration)

This source includes the `/mcp` endpoint with JSON-RPC tools protected by a **development** bearer token. The endpoint is not yet a public production OAuth service.

## Test without publishing
1. Set `APP_PASSWORD`, `SESSION_SECRET`, `MCP_DEV_TOKEN` (minimum 25 characters).
2. Run `npm start` and test `node scripts/mcp-smoke.mjs` with same environment.
3. `initialize`, `tools/list`, `list_local_models` and project operations are discoverable.
4. **Do not expose this development endpoint publicly.** Production OAuth implementation, authorization per-user, rate limits, audit logging, HTTPS and plugin testing in ChatGPT are necessary before publishing.

## Connecting to ChatGPT
When the production endpoint is deployed and secured, open ChatGPT Plugins on the web, Add custom MCP server and provide its HTTPS URL (such as `https://studio.example.com/mcp`), configure authentication, scan tools, install/test the plugin. Availability depends on account/workspace permissions. ChatGPT cannot connect to localhost directly without Secure MCP Tunnel.

The user must authorize the plugin install in their ChatGPT workspace. Source code alone does not register it automatically.
