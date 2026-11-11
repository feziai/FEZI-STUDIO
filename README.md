# FEZI Studio GitHub deployment preparation

This PR adds a public plugin status catalog, per-plugin manifests and MCP readiness notes, and the supplied Agent Fleet starter under `agent-fleet/`. **It does not contain the complete FEZI Studio website source.** The target repository contained only its license and a short README at inspection time; the main Node.js website source was not among the supplied archives. The fleet starter is a separate deployment component, not a replacement for the official website.

## What is and is not live
- `plugins/index.html` is a static catalog suitable for GitHub Pages. It may be reached as `/plugins/` when Pages is configured.
- Plugin entries document source availability and reserved MCP paths; no plugin is deployed or connected by this catalog.
- `agent-fleet/` is an independently runnable Telegram fleet starter. It needs user-owned bot tokens and a persistent host; GitHub Actions does not keep polling bots alive.
- `mcp/README.md` records the gateway implementation requirements. No MCP endpoint is implemented or tested.

## Required source files not supplied
The request named `FEZI_STUDIO_GITHUB_PUBLIC_SAFE_2026_11_11.zip` and `FEZI_GITHUB_SECURE_PUSH_TOOL_2026_11_11.zip`; those archives were not supplied. A credential file was later provided for deployment and was excluded from this repository. No complete website source or hosting credentials were supplied.

See [the plugin catalog](plugins/) and [MCP readiness](mcp/README.md).
