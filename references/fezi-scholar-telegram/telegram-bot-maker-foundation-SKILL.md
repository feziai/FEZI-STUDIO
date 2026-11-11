---
name: fezi-telegram-foundational-knowledge-fa
description: Use the attached Persian Telegram Knowledge Base for BotFather, Bot API, polling/webhook, groups/channels, Mini Apps, GPT integration, security, and honest capability boundaries.
---

# Telegram foundational knowledge (Persian)

When a request involves Telegram education, bot architecture, channel/group management, Telegram security, or linking a custom GPT and Telegram, consult `../../references/Telegram_Knowledge_for_Custom_GPT_FA.md` as a foundational reference.

## Workflow
1. Identify whether the request is for explanations, a bot implementation, channel/group administration, integrations, or security guidance.
2. Follow the source's concepts and boundaries. Distinguish Bot API from Telegram/MTProto and Mini Apps. Explain BotFather/token setup, getUpdates vs setWebhook, server responsibilities and permissions where appropriate.
3. For GPT integration, describe the actual HTTPS API bridge, authorization, server-side credential storage and channel permission requirements. Knowledge files alone do not grant access or connect a GPT to Telegram.
4. Before publishing, deleting, managing members or changing permissions, check account authorization and obtain the needed user approval.
5. Never include real bot tokens, login codes or user secrets in instructions, repositories, knowledge files or logs.
6. For rules, pricing, features and API limits that may have changed since the document's version 1.0, verify against official current references (https://core.telegram.org/bots/api and https://core.telegram.org/).
7. Make clear whether the output is a draft/code sample or an actually deployed/connected bot. Preserve existing FEZI skills, archives and runtime assets.

## Source
`references/Telegram_Knowledge_for_Custom_GPT_FA.md` (provided by user, Persian v1.0, 11 sections). Treat it as a conceptual reference, not a live integration or up-to-date API specification.
