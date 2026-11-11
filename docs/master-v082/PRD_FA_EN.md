# FEZI STUDIO — Product Requirements Document (PRD)
Version 0.82 — 2026-11-02

## 1. Product identity
- Public title: **FEZI STUDIO - Built Anything With AI Full Free** (brand-specified; marketing must qualify capabilities whose compute is not free).
- Owner attribution: **Fazel Esmaeilzad aka FEZI**, owner of PersianDarkHorse.com.
- Icon: provided rabbit-shaped F, stored as `assets/fezi-f-original.png` (do not redraw).
- Primary palette: white, electric blue, restrained pink highlights, soft gray; no distracting neon-heavy editor.
- Languages: Persian (RTL) and English (LTR). Code blocks retain LTR.
- Responsive desktop/tablet/Android web; accessible touch targets, keyboard navigation, screen-reader labels and reduced-motion support.

## 2. UX: coding workspace
The **Build & Code** section is minimalist like ChatGPT, without Arina imagery. Single central conversation column and a clear composer near bottom. No code editor/terminal is permanently open. Show preview, code or terminal only upon request or when a task requires it. Desktop toolbar: FEZI AGENT, Builder, GitHub, Deploy, MCP, Projects. Mobile menu collapses to compact controls. Current project is reachable without clutter.

Composer: multiline text, attachments (images/video/documents/ZIP/code), microphone recorder with opt-in permission, send/cancel button, suggestion chips (build website, create app, fix bug, import GitHub). Uploaded items show progress, MIME/type validation, maximum sizes and removable previews. Video understanding requires an actual video-capable backend; otherwise an explicit unavailable state, never fabricated analysis. Message actions: timestamp, copy, select, edit and regenerate own prompts, share, archive and files-in-chat.

Agent navigation: compact + menu with Image Studio, Video Studio, Website, Web App, Android, Games, Design, Themes, MCP, Search, Research, Avatar, Project Import, Deploy, and FAQ. Arina content is restricted to Live/Arina pages, never this workspace.

## 3. Model policy and execution
FEZI AGENT chat: automatic task detection, capability filtering, scoring and fallback. Image Studio / Video Studio: manually selected model only (report incompatible model rather than overriding). Each adapter has enabled, health, license, cost, compute, supported-inputs, secrets and quota metadata. Providers are disabled until configured and proven ready. No service is claimed free if a paid API or GPU is needed. Prioritize Ollama, llama.cpp, compatible model servers, Whisper, and ComfyUI when locally available.

Hard filters BEFORE scoring: permitted model/use, modality, context/input size, dependencies installed, ready state, GPU/RAM, credential status, user privacy, required output format, and project budget. Within eligible models score task fit, verified quality, reliability, latency, cost, privacy/locality, and context. Model failures invoke bounded fallback with circuit breaker and clear error messages; avoid infinite retries. Require evaluation data (min sample size, confidence intervals) before automatic weight adjustment.

## 4. GitHub builder
Users can authorize GitHub through OAuth/GitHub App with least-privilege permissions; select repository/branch, browse, commit edits, create PR, import repository, create repository, and export. No raw shared token in browser. Require confirmation for destructive overwrite, public publishing and releases. Record audit events, branch/commit SHAs and rollback points. ZIP import protects against traversal, bombs and secrets; imported code executes only in isolated sandbox with network/time limits.

## 5. Builders and outputs
HTML/CSS/JS/TS/React/Node templates, project continuation and tests. Export source ZIP, static site, PWA (with icon/manifest/service worker), Android project, and signed APK/AAB only when Android SDK and signing are configured. Offline export must contain all needed code/assets/models if legitimately distributable; cannot pretend an API-based website works offline. Custom subdomains require DNS/wildcard/TLS and per-tenant isolation, and custom domains require proof of ownership and certificate provisioning. 'Free hosting' is subject to actual allocation and bandwidth.

## 6. MCP marketplace
At least 70 catalog entries across coding, deployment, databases, knowledge, search, browser, design, media, communication, productivity, analytics, ML, commerce and security. Catalog is not 70 working connections. Every entry has transport, origin/source, license, permissions, status, test result and admin approval. Third-party MCP invocations run through signed/allowlisted connector policies, with per-user capability grants and approvals for sensitive actions. 24h GitHub scanner only discovers and proposes; no unreviewed auto-install from unknown repos.

## 7. Continuous improvement (Overmind optional)
Without Overmind: collect privacy-minimized telemetry, unit/e2e outcomes, build errors, explicit user ratings, model latency, cost and reliability. Daily report & candidate changes; evaluation baselines, canary/rollback, admin approval for production changes. No automatic training on users' private projects by default. Overmind: optionally integrate tracing/evals/optimizer/finetuning under its own project account and explicit dataset purposes; no Overmind account required for core FEZI. Distinguish observing from actually training weights. Log updates and effective dates.

## 8. Audio, visual and Arina
Microphone input -> consent -> audio upload/transcription -> text task -> agent. Images/videos/documents are interpreted only when a ready supported model is connected. Arina's identity/reference/storyboards are held separately; video generation via authorized media worker, QA for identity drift, no claims of real-time 3D without proof. Arina Live separate from code workspace. Gifts: Candy $3, Strawberry Shake $3, Ice Cream $10, configurable currency/payment provider; purchase fulfillment verified server-to-server, refund and chargeback handling. Private Arina chat allows 10 concurrent isolated sessions, never expose other participants. Likes and donor leaderboard subject to moderation; donation comments opt-in publication. No unsolicited forwarding of user media or private content to admins.

## 9. Accounts, admin and security
Username/email/password with unique usernames, password hash (Argon2id preferred), email verification, rate limiting, 2FA for admin, password reset. Google OAuth OIDC with backend state, nonce, PKCE, domain/redirect constraints. Apple OAuth only after configured developer identifiers. Do not claim Google fast login tested until real OAuth credentials, redirect URI and browser flow pass. `/AdminAgent` and `/adminAgent` owner panel: users, projects, activity, billing, FAQ, MCP, secrets, site theme, logs. Secrets encrypted at rest, never echoed, tracked by purpose/rotation; admins see only data policy permits. The credentials previously typed in chat must NOT become default credentials.

## 10. FAQ & community
40 curated high-quality FAQs, 1–5 ratings and count, tags, search and structured data only on publicly visible factual pages. Users can submit questions and answers, detect duplicates, sanitize text and uploads, moderation queue, report abuse, anti-spam rate limits. Only approved community questions become canonical official FAQs; moderator attribution preserved.

## 11. Telegram/email notifications
Admin can configure private bot token and destination in Secrets (never in chat or frontend). Default notifications: deployment results, daily QA digest, critical security events, and owner-created files. User content/media only by opt-in with informed privacy notice and access control. Limit attachment sizes, expire links, redact secrets and personal data; webhook signatures and retry/idempotency required.

## 12. Search discoverability
Public feature pages have SSR or statically prerendered text, unique title/H1/description, canonical URLs, legal localized copy, sitemap index, robots.txt, SoftwareApplication/WebSite schema where appropriate, and authentic FAQ schema for visible authored answers. No doorway spam, false 'free unlimited' claims or indexing private chats/uploads. PWA icon/manifest and installability tests. SEO is not a promise of Google ranking.

## 13. Delivery gates and evidence
- G0: baseline import, test suite green, license inventory and SBOM.
- G1: accessible RTL/LTR chat UI with file/voice capture and mocked agent state tests.
- G2: Ollama local live inference + router tests; manual media model selection.
- G3: GitHub OAuth and scoped push/PR with real authorized account, rollback.
- G4: working media workflow on real GPU and QA output checks.
- G5: verified Google OAuth, community FAQ, admin secrets, payment sandbox.
- G6: deploy to real subdomain, custom domain, Android build and load testing.
- G7: Overmind optional account sync, eval set, tracing verification and dashboard, plus independent learning loop.
For each gate record tests, environment, actual vs mocked results, failures and links to artifacts. Do not mark gates complete without evidence.

## 14. Definition of done
Functional flows actually operate in production behind explicit authorization; security/privacy tests pass; no hardcoded credentials; full mobile audit; correct separation of model selection rules; truthful paid/free labels; artifact export verified; operations/backup/monitoring and rollback documented.
