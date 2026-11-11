# Deployment, host adapters, domains and ChatGPT integration

## Local on Node.js 22

1. Copy `.env.example` to `.env` and set `APP_PASSWORD` plus a distinct strong `SESSION_SECRET`. Node's core `server.js` reads environment variables but **does not automatically load .env**; use your process manager or Node 22's `node --env-file=.env server.js`. For Docker Compose, env_file loads it.
2. `npm start` with an environment exported, or `node --env-file=.env server.js`.
3. Go to `http://127.0.0.1:3000` and sign in. For a local LLM, run Ollama separately and `ollama pull qwen2.5-coder:7b`.
4. For a local/VPS Docker install, `docker compose up -d --build`, then `docker compose exec ollama ollama pull qwen2.5-coder:7b`. On CPU-only hardware this may be slow.

## cPanel Node.js shared hosting

Start file: `server.js` (or a wrapper using the hosting panel). Node 22. `HOST=0.0.0.0` if supported by the hosting panel. Ensure `DATA_DIR` is writable outside `public_html`. SSL termination should set `COOKIE_SECURE=true` and honor forwarded HTTPS only from a trusted proxy. A shared host normally cannot run Docker, Ollama, arbitrary system commands, or a Linux desktop. Connect to your own trusted local PC / VPS for them.

## GitHub push and per-project review

Set `GITHUB_TOKEN` (fine-grained token with Contents/Pull Requests write permissions), `GITHUB_ALLOWED_REPOS=owner/repository`. FEZI pushes static project files into **a new branch**, then creates a pull request. It does **not** silently merge into main or override the live repository. Tokens are not displayed in the browser. This integration does not create a GitHub account or repository for you.

## Publishing `bg.example.com`

Option A: set `BASE_DOMAIN=example.com` and `PUBLISHED_ROOT=/some/safe/path` outside source. Prepare DNS `bg.example.com` -> your web server and a valid HTTPS certificate, then use Publish Subdomain with slug `bg`. Configure reverse proxy to route the requested subdomain to FEZI Studio. On some shared cPanel plans this may require adding a subdomain manually; the program alone cannot create DNS records.

Option B: set a GitHub Pages custom domain on a repository, configure its CNAME in the DNS provider, and deploy static files to its configured Pages source. A `CNAME` file in a GitHub branch alone does **not** finish Pages configuration. Github Pages works for static sites, not continuously-running Node.js APIs, Ollama, queues, or Python. GitHub discourages wildcard DNS due to subdomain takeover risk. Each custom subdomain must be configured carefully and verified.

Option C: call the built-in `tools/host-adapter.js` **on the target host you own** behind HTTPS, with `DEPLOY_WEBHOOK_SECRET` (20+ characters) and `TARGET_WEBROOT` dedicated to FEZI-created sites. Set the matching `DEPLOY_WEBHOOK_URL` on FEZI. This demo HMAC adapter atomically swaps in static site files and retains a previous backup; it is **not** a universal SSH/SFTP/cPanel adapter. Adapt per provider; back up production and review each publish.

## Telegram bot

Create a bot yourself using @BotFather. Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ALLOWED_USER_IDS`, `TELEGRAM_WEBAPP_URL`; register webhook through Telegram Bot API. Allowed users may send `/build <16-hex-project-id> <prompt>` and `/status <20-hex-job-id>`. A Telegram Mini App link opens the studio. Telegram does not provide an always-on general compute server for heavy AI models.

## ChatGPT plugin (MCP)

`/mcp` in this codebase is a **development/testing server**, enabled only when `MCP_DEV_TOKEN` is set. It supports `list_projects`, `read_project`, `propose_file_change`, `apply_file_change` (explicit confirmation), `start_agent_task`, `get_agent_task`, and `list_agent_tasks`. It is not production-ready as a public ChatGPT plugin. Do **not** expose a static MCP dev token to the internet or distribute it in an Android app. A production plugin requires a public HTTPS MCP resource server and proper OAuth 2.1 auth-code + PKCE, token audience/scope validation, per-user authorization and service-side rate limits. Availability of write actions also depends on ChatGPT plan/workspace permissions. See https://developers.openai.com/plugins/build/auth and https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt .

## Commercial/open-source distribution

The original FEZI Studio glue code is MIT. It does not relicense any third-party dependency. Optional external projects retain their own licenses, NOTICE obligations, trademarks, models' licenses and provider terms. Private prototypes can use tools under terms applicable to you, but distributing the same third-party binaries in a publicly commercial product may involve additional conditions. Review them individually before bundling. Do not place keys in client code or source control.
