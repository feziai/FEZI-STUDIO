# FEZI Studio 0.5 — deployment, Android, iOS and 24/7 services

## cPanel shared Node.js 22 (web app/API only)

1. Upload FEZI Studio source to a **non-public application root**, for example `/home/USER/fezi-studio`; do not upload secrets or data to public_html.
2. cPanel -> Setup Node.js App or Application Manager -> create Node.js 22 app, startup `server.js`, app URL `studio.yourdomain.com` (create DNS/subdomain first).
3. Environment values: `APP_PASSWORD`, `SESSION_SECRET` (different strong values), `DATA_DIR` (writable/private), `COOKIE_SECURE=true`, `HOST` and `PORT` per hosting provider. Never put API keys in browser code.
4. Install dependencies if needed (current FEZI backend uses Node built-ins). Start/restart with panel. Open `https://studio.yourdomain.com/health` and then login.
5. Configure `BASE_DOMAIN` / `PUBLISHED_ROOT` and DNS + HTTPS for published projects, or use the GitHub pull request deployment path. cPanel needs separate provisioning for each subdomain if wildcard not supported.

cPanel is not a root VPS: no Docker-based build runner, Ollama local GPU service, privileged network tunnels, WireGuard/V2Ray server, iOS signing or arbitrary `gradlew` assumed.

## Android build

1. From studio create/edit a STATIC HTML site.
2. Use UI: **📱 خروجی موبایل / PWA**, choose Android + iOS source, download ZIP.
3. Extract into new GitHub repository, run `npm install` locally and commit resulting `package-lock.json` (not node_modules).
4. Run `Build Android APK` in GitHub Actions -> `workflow_dispatch` -> download debug APK from Actions artifacts.
5. Or on local Android SDK/Java machine: `npm install && npx cap add android && npx cap sync android && cd android && ./gradlew assembleDebug`.
6. For production releases, use a release keystore securely and build signed AAB/APK separately. Debug APK is for testing, not Play Store production.

## iOS build

Same exported Capacitor source. Run `npm install && npx cap add ios && npx cap sync ios` on **macOS**; build/sign/archive in Xcode using valid signing identities/profiles. A deployable IPA is not produced until this step. Apple Developer Program is generally required for App Store/Xcode Cloud distribution.

## ChatGPT integration

Existing `/mcp` is development-only static bearer key and MUST NOT be exposed as a production plugin. For public plugin use deploy OAuth 2.1 (Auth Code/PKCE), per-user scopes, an HTTPS Streamable HTTP endpoint (`https://api.yourdomain.com/mcp`) and authorization checks in each tool; verify with MCP Inspector, then use ChatGPT web Plugins -> Add custom MCP server (where available). Use a secure tunnel for internal endpoint testing, not as a substitute for production auth.

## Telegram

Create BotFather bot manually; configure server-side `TELEGRAM_BOT_TOKEN`, allowlisted Telegram IDs, webhook secret and HTTPS URL, register the bot webhook via Telegram Bot API. Mini App opens the same web front-end.

## Availability and cost reality

You cannot guarantee zero downtime or zero cost for everything. Use a stable web host for frontend/API, retry/backoff queues, DB backups, health checks, redundant workers, optional Cloudflare Tunnel, resource quotas, and fallback models/providers. GitHub hosts source and CI build jobs but is NOT an always-on general-purpose GPU server. The Telegram Bot API is not an application hosting service. VPN/proxy servers need compatible permitted privileged hosts (root/VPS or dedicated hardware), not ordinary cPanel shared hosting.
