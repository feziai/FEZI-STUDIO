# FEZI Studio — Google OAuth, icon UI and live model setup (2026-11-07)

## Google — exactly which values
1. Go to https://console.cloud.google.com/auth/clients and select/create an OAuth **Web application**.
2. Put **https://YOUR-DOMAIN** (no path) under Authorized JavaScript origins.
3. Put **https://YOUR-DOMAIN/auth/google/callback** under Authorized redirect URIs. Must match perfectly, including HTTPS, path, hostname and trailing slash.
4. On your **server only** set PUBLIC_BASE_URL=https://YOUR-DOMAIN, GOOGLE_CLIENT_ID=<Client ID>, GOOGLE_CLIENT_SECRET=<Client Secret>, SESSION_SECRET=<long random secret>, COOKIE_SECURE=true. No value in public code / GitHub. Older GOOGLE_OAUTH_* variable names are accepted too.
5. Configure Google Auth Platform -> Branding, Audience and test users if in Testing. Grant only openid,email,profile login scopes; no Drive scopes needed.
6. Test /api/auth/google/status (does not reveal secrets), then click /auth/google and complete a genuine user sign-in. Test account creation, page refresh, logout and failed login.

Security note: previously shared secrets should be rotated. Do not send them in chat.

## Important env file and correct boot command
`npm start` now uses Node 22 `--env-file-if-exists=.env`; this loads a local private `.env` if present, while injected environment variables can also be used. `.env.example` is documentation and is **not** the secret file. On cPanel, set runtime variables in its Node.js environment or a private `.env` outside public HTML.

Owner-side local Ollama provisioning:
```bash
npm run ollama:doctor
npm run ollama:pull -- qwen2.5:3b
npm run ollama:doctor
```
No automatic downloads on user page views; only an authorized operator may run these commands. A model downloaded to a different host is NOT installed on this server.

## Why tools listed in UI do not run yet
- A model shown in a catalog is not downloaded or hosted.
- Ollama needs a running Ollama service, installed model weights, and FEZI Studio's OLLAMA_BASE_URL pointed to the service (127.0.0.1 works only when both run on the same host). On a machine with suitable resources: install Ollama; `ollama pull qwen2.5:3b` (example), verify `ollama list` and `curl http://127.0.0.1:11434/api/tags`, then test a prompt via the website. CPU inference can be slow; ensure hardware fits.
- For remote Ollama, use a private authenticated network or VPN; do **not** expose port 11434 to the internet.
- Cline / OpenCode / OpenHands are **coding agents or applications**, not Ollama model weights. Install them in a separate secured development runtime and wire approved tasks through worker adapter; never pretend catalog is a running app.
- Image/Video workers require an available GPU/server/API, costs and licensed weights; simply setting FEZI_GPU_WORKER_URL does not verify inference.
- GitHub Pages serves static files only. The FEZI Node.js app, Telegram bots and always-on radio state require separate always-on backend hosting.
- See `/api/fezi-playground/readiness` for model names and honest setup status, not a fake guarantee. `configured` does NOT mean an end-to-end request passed.

## What this patch actually does
- Fixes GOOGLE_CLIENT_* vs GOOGLE_OAUTH_CLIENT_* mismatch.
- Shows Google login button on the profile/account page and correct Google route.
- Adds locally hosted provider identity icons next to model names in Playground and Model Studio. These are FEZI-branded identification badges (NOT the brands' copyrighted/official logos). A fallback badge always renders if an identity is unknown.
- Adds runtime readiness reporting from actual installed Ollama inventory; marks generic tools as catalog navigation rather than guaranteed GPU workers.
- Does not claim that paid providers, live GPU inference, Telegram hosting, credentials, or Google production login were tested remotely.
