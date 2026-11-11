---
name: fezi-chatgpt-plugin-creator-handoff
description: Help the user turn an FEZI Studio Plugin Hub draft into a portable ChatGPT Plugin Creator-compatible package, validate it, and request authorized installation.
---

# Plugin Creator workflow

1. Open the user's `/plugins/chatgpt-builder` project and collect its drafted name, task description and workflow. Keep existing FEZI Studio bot/website/creator features unchanged.
2. Generate or inspect a ZIP containing root `plugin.json`, optional `.codex-plugin/plugin.json`, and `skills/<slug>/SKILL.md`. Check valid names and paths. Do not execute arbitrary uploads.
3. Follow the current OpenAI plugins package guidance: https://developers.openai.com/plugins/build/plugins .
4. Use the official Plugin Creator tool when connected and **only** if the current account has an eligible plugin creation or update permission. For updates, fetch current exact release ID; preserve icons, skills, original plugin identity, MCP bindings and existing configuration.
5. Require official ChatGPT Plugin Creator / MCP setup for new integrations; do not imply an exported ZIP automatically installs, publishes, or runs on OpenAI infrastructure.
6. For publish/share, use only supported audience / release controls, and disclose limits. External actions, payments, promotions, VPN and secrets require separate legitimate authorization.
7. Test packaging and report precisely: drafted locally, imported in Plugin Creator, successfully updated in ChatGPT, or externally deployed. Don't conflate these outcomes.
