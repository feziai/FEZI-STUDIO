---
name: fezi-mcp-apps-40-router
description: Route FEZI plugin UI requests through a reviewed 40-entry catalog of MCP Apps skills, reference servers and original FEZI adapter workflows; propose or implement only when matching tools and authorized infrastructure exist.
---

# FEZI MCP Apps UI and 40-entry capability catalog

## Workflow
1. Read `references/FEZI_MCP_APPS_40_CATALOG.json` and identify whether the selected entry is an upstream Agent Skill, reference server, implementation guide, or original FEZI adapter. NEVER claim that a reference server or guide was installed as a skill.
2. Check the actual plugin capabilities, MCP tool descriptions, server access, auth, host compatibility, owner permissions, and UI resource before promising a live panel.
3. For an interactive ChatGPT panel, create or reuse an MCP tool that declares a `ui://` resource, serve HTML securely, and complete MCP Apps host handshake. An HTML mockup alone does not make a live embedded app.
4. Build an identity-specific FEZI panel, preserving current plugin manifest, other skills and brand assets. Keep UI actions scoped to actual permitted tools. Provide loading/error/empty states and mobile/RTL layout.
5. For external writes ask for targeted permission; validate inputs and keep tokens server side. Use test fixtures and a disposable environment. Separate local preview, structural verification and real host execution.
6. For plugin updates use Plugin Creator with exact backend plugin ID and expected release ID, then read back files. Do not self-modify or update other plugins without the user's permission.
7. Report which skills were actually added and which are catalog links, as well as which panels are LIVE vs templates only.

## Primary sources
- https://github.com/modelcontextprotocol/ext-apps (4 published Agent Skills)
- https://github.com/vercel-labs/agent-skills (reviewed frontend/React skills)
- https://github.com/modelcontextprotocol/servers (reference server examples, NOT installable Agent Skills)
- https://developers.openai.com/plugins/build/app-quickstart (official plugin UI quickstart)

## Mandatory rule
The 40 entries are a **curated capability catalog**, not 40 downloaded/runnable skills. No unreviewed third-party code, paid services, or automatically authorized write actions.
