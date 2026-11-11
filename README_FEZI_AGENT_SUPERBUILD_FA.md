# FEZI AGENT — Website-Wide Builder + Dedicated Plugin + Skill Creator

## What was actually changed

1. A separate private ChatGPT plugin was created: `fezi-agent-builder` v0.1.0, ID `plugins_6af010f67fac8191a27194c5258fd239`, with 49 distinct original SKILL.md references.
2. All 49 plugin skill texts were copied into the FEZI Studio site's bounded on-disk skill reference library under `agent-skills/library/fezi-agent-builder/`.
3. A site-wide FEZI Agent floating launcher was added to HTML responses by `servePublic` without editing existing HTML headers. It links to the real `/builder`, `/plugins`, `/fezi-agent/tools`, `/fezi-agent/skill-creator`; if authenticated and API configured it can also call the existing `/api/fezi/chat` endpoint.
4. A new `/fezi-agent/skill-creator` page produces SKILL.md drafts and lets visitors download them. A new authenticated POST `/api/fezi/agent/skill-factory/draft` endpoint saves reviewable drafts in the server private data folder. Drafts NEVER become operational automatically.
5. GET `/api/fezi/agent/skill-factory/status` reports target 5,000,000 and actual materialized, validated and operational counts separately.
6. The private new ChatGPT plugin is listed in the public directory with `publicReady: false`. Public listing is not permission to use private ChatGPT plugins.
7. A detailed Persian master prompt and milestone plan accompany the source.

## Install

Use Node.js 22 or higher; add the patch's files to the root of an *existing* FEZI_STUDIO checkout. Start with the same existing server command. On a test host only:

```bash
npm test
npm run master:check
npm start
```

Smoke URLs:
- `/` and `/builder`
- `/fezi-agent/skill-creator`
- `/fezi-agent/tools` (owner-only)
- `/api/fezi/agent/skill-factory/status`
- `/plugins`

For the widget to respond to AI chat, the existing FEZI provider APIs must be configured and login requirements satisfied. A floating panel does not install an LLM.

## Readiness and scope

- New ChatGPT plugin: CREATED, private, 49 reference skills. Plugin Creator verified file count.
- Site integration: source modified and local HTTP/unit tests passed; **not deployed** to public domain.
- Fully operational skills: 0 independently verified in this new library. Do not confuse documents with actual tool connection.
- Five million skills: long-term target, NOT generated or installed.
- GitHub: source may be published by an owner-authorized connector; the previous connector write attempt returned GitHub 403, so these source changes are NOT pushed.
- Existing logos, header, Telegram module, Arina and all other core files are preserved.
- Never add actual tokens from conversation uploads to the server's public files or distributed source. Previously shared credentials should be rotated before live use.

## Testing

Run `node --test tests/fezi-agent-superbuild.test.mjs tests/fezi-agent-global-routes.test.mjs` and `npm test` for the complete suite. Live real model inference, GitHub writes, hosted chatbot and production deployment remain distinct prerequisites.
