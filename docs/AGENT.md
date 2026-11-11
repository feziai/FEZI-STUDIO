# FEZI Studio Autonomous Coding Agent v0.4

## What is implemented

The local agent takes a natural-language goal (Persian or English) and uses a configured LLM to select from a **bounded tool list**. It can inspect project files, write complete files, search the public Hugging Face model catalog, inspect allowlisted public HTTPS websites, and delegate a scoped instruction to an administrator-configured signed HTTPS agent bridge. It creates a checkpoint before working, checks classic JavaScript syntax, logs each step, and stops after a configured maximum. The user can view progress and restore prior files.

It does **not** yet implement arbitrary shell execution, a cloud desktop, browser automation, password recovery, system-level package installation, Android compilation, production OAuth, an always-on queue, or a true unified Replit-class runtime. No tool call is interpreted as permission to access third-party accounts. There is no universal guarantee that the task will succeed without user input.

## Task API (admin session required)

```
POST /api/tasks
{"id":"<PROJECT_ID>","goal":"Build a landing page and responsive dashboard", "provider":"ollama", "model":"qwen2.5-coder:7b", "maxSteps":6}
GET /api/task?taskId=<TASK_ID>
GET /api/tasks?id=<PROJECT_ID>
POST /api/task/cancel {"taskId":"<TASK_ID>"}
GET /api/snapshots?id=<PROJECT_ID>
POST /api/snapshots {"id":"<PROJECT_ID>","label":"manual"}
POST /api/snapshots/restore {"id":"<PROJECT_ID>","snapshotId":"<SNAPSHOT_ID>","confirm":true}
```

Agent local edits are automatic. Publication remains a separate explicitly confirmed operation. Data is under `DATA_DIR/projects`, `DATA_DIR/jobs`, and `DATA_DIR/snapshots`. In-flight tasks are **interrupted** by process restarts; they do not silently resume. For serious background tasks, provision a real queue (Redis + worker) and durable runtime.

## Multi-model routing

Built-in: Ollama, OpenAI-compatible, OpenAI API, Anthropic Claude API, Google Gemini API, OpenRouter API. For personal model additions, configure `AI_PROVIDERS_JSON` with `id`, `label`, `baseUrl` (HTTPS), `keyEnv` (environment variable *name*, not its value) and `model`. Set key in server env. This is a real OpenAI-compatible HTTP adapter; other API protocols require custom coding. `AGENT_FALLBACK_PROVIDERS=ollama,gemini` uses an available backup if the primary model errors. Optional **multi-model collaboration** is supported in Agent mode when `collaborate:true`: the configured `TEAM_PLANNER_PROVIDER` makes a plan, the selected coding provider edits files, and `TEAM_REVIEW_PROVIDER` provides an independent read-only review. A provider fallback list handles primary failures. Review is advisory rather than a verified build/test, and each provider can incur API charges.

## Delegation to other open-source tools

OpenHands, OpenCode, Goose, Qwen Code, Aider, Cline, Dyad, bolt.diy and code-server are **separate programs**, with different runtime and API protocols. They cannot be combined into one node_modules bundle. To delegate to a working backend, run that backend under its supported deployment model, build a small HTTP bridge matching `examples/agent-bridges.json`, and set `AGENT_BRIDGES_JSON` in the environment. Bridges receive `POST` JSON `{instruction,createdAt}` with header `X-FEZI-Signature: sha256=<HMAC_SHA256_BODY>`. The agent's task must explicitly set `approveExternalBridges:true`. No bridge is enabled by default. Bridge must separately implement its supported agent SDK/API, tool permissions, rate limits, allowlist, filesystem scope and isolation.

**Never connect a bridge that executes arbitrary commands on the cPanel host.** For code testing and app execution, use a separate isolated runner (container on VPS or trusted local workstation), with per-project root and resource limits.

## Website import and authorization

`WEB_IMPORT_ALLOWED_HOSTS=example.com,docs.example.com` allows only those exact public HTTPS hostnames. DNS private/reserved addresses and redirects to unallowlisted hosts are rejected. `POST /api/website/inspect` reads a public page. `POST /api/website/import` adds a snapshot of the public HTML to the project, with checkpoint and limitations. This is **not** a clone of private source code, server logic, hidden APIs, protected pages or a database. JavaScript-built apps normally require the owner's repository and data export for exact reproduction. Non-HTML assets are currently linked to their source host.

## Built-in file templates

`landing`, `dashboard`, `blank` (static); `react` (Vite), `node` (Node server), `python` (Python HTTP). FEZI Studio preview only renders basic static HTML/CSS/JS; Node/Python/Vite need an external runner.

## Operational integration checklist

| Requested component | State in v0.4 | What still must be deployed |
|---|---|---|
| Ollama + Gemma + Qwen | Actual HTTP adapter and catalog | Install Ollama and download weights on a sufficiently powerful computer |
| OpenAI/ChatGPT, Claude, Gemini, OpenRouter | Actual server-side HTTP adapters | Own supported API credentials / quotas |
| Any custom OpenAI-compatible endpoint | Actual configurable adapter | Endpoint, secret env variable and model ID |
| Multi-model planner/coder/reviewer | Actual optional 3-stage collaboration | Configure available providers and API limits |
| Hugging Face model discovery | Actual public API search | Model runtime / inference endpoint for use |
| OpenHands, OpenCode, Qwen Code, Goose, Cline, Aider | Catalog + signed delegation bridge contract | Run each project separately and implement its official API/CLI protocol in an external bridge |
| Dyad, bolt.diy | Discoverable external software | Deep SDK/tool-specific integration and compliant dependencies |
| code-server, Eclipse Theia | Discoverable IDE alternatives | Separate browser IDE service with access controls |
| GitHub | Actual branch+PR publication via GitHub API | Token and per-repo permission; Pages DNS configuration for live site |
| cPanel/other hosts | Static publish + HMAC webhook example | Host-specific adapter for SFTP/SSH/API or proper reverse proxy |
| Telegram | Bot webhook, /build, /status, Mini App URL | User creates bot token, configures webhook and deploys server |
| ChatGPT | Development MCP server including agent task tools | Production OAuth, public HTTPS and supported plugin permissions |
| Android | Legacy v0.3 Android wrapper source retained | Rebuild wrapper for v0.4; native runtime / APK builders need runner |
| Advanced cloning | Inspect public allowlisted HTML | Browser automation, owning source repository and permitted export for dynamic apps |
