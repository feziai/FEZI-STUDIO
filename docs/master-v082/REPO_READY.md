# FEZI STUDIO — Repository Execution Checklist

This folder is an **implementation brief + standalone UI prototype + earlier addon reference**, not a complete production site.

## Merge carefully
1. Clone actual FEZI Studio repo and inspect tracked files/branches.
2. Copy `AGENTS.md` to repo root, `docs/PRD_FA_EN.md` under docs, `docs/ROADMAP.md` and `docs/ACCEPTANCE.md`.
3. Add UI as route by adapting `web/index.html`, `web/style.css`, `web/app.js` into existing frontend framework. Do not replace entire site or lose existing pages.
4. Review `addon/autonomous-v081` modules before integrating: several entries are config/registry only. Run `npm test` inside that directory.
5. Add real connectors one at a time behind feature flags, documenting test environment.

## Suggested package directories
- apps/web : public UI, code/chat, Image, Video, FAQ, Arina
- apps/api : users, projects, billing, files, authorization, sessions
- packages/agent : planner, router, tools, adapters, evals
- packages/mcp : MCP registry, permissioned runner, health checks
- packages/media : workers and approved workflows
- packages/improvement : event store, scheduled eval, Overmind bridge
- packages/deploy : previews, site exports, domains
- packages/android : Capacitor/WebView packaging and Android build pipeline
- infra : deploy manifests, DNS/TLS, secrets schemas

## Practical sequencing
- UI and local mock interactions
- secure auth and file handling
- local model runtime and router
- GitHub OAuth / PR / test build
- MCP allowlist and verified connectors
- FAQ/community moderation
- deployment and domain automation
- Overmind optional eval integration
- media and Arina privacy/payment workflows

No claim of free hosted GPU, permanent 24/7 video or unlimited OAuth/API service absent actual infrastructure.
