## Update: GitHub / Telegram / desktop tools
- 10 external open-source editor/agent entries in authenticated admin catalog.
- Authenticated project ZIP with workspace settings (`/api/desktop/export`).
- Local CLI launcher detects installed tools; no remote execution endpoint.
- code-server and Telegram polling Compose examples are prepared but have not been deployed.
- Telegram commands are mock-tested; without BotFather token the actual bot is not active.
- GitHub CI and SSH-deploy workflows prepared; no repository automatically created or pushed, since no target repo was available.

# FEZI AGENT v0.77 — تغییرات برند و انتخاب خودکار

| قابلیت | وضعیت |
| --- | --- |
| برند واحد در UI | پیاده‌سازی شده |
| پنهان شدن انتخابگر مدل از صفحه عمومی | پیاده‌سازی شده |
| انتخاب خودکار سمت سرور | پیاده‌سازی و تست شده؛ رتبه‌بندی ابتکاری است |
| بررسی مدل محلی واقعی و گزارش خطا | پیاده‌سازی و تست شده با سرویس شبیه‌سازی‌شده |
| عدم افشای شناسه موتور در APIهای جدید FEZI و وضعیت تسک | پیاده‌سازی و تست شده |
| اطلاعات مجوز و اشکال‌زدایی برای مدیر | حفظ شده |
| انجام مستقل همه نوع تسک با بهترین مدل دنیا | تضمین نشده |
| اتصال واقعی به تمام مدل‌ها و پلاگین تولیدی ChatGPT | همچنان نیاز به استقرار/اعتبارنامه دارد |

---

# FEZI Studio v0.9

| Component | Verified state |
|---|---|
| 103,017 task records / 23 categories | Generated and all read in validation test |
| 417 gzip JSONL shards | SHA-256 verified on read |
| API browsing, task retrieval, category pagination | Implemented and integration tested |
| Model selection | Rule-based recommendations, **not benchmark evidence** |
| Task attempt | Sends request to configured AI provider; mock-provider integration tested |
| Learning from errors | Self-reported feedback log, **not model weight update** |
| MCP academy tools | Development-token MCP, **not public OAuth plugin** |
| Batch task runner | Sequential bounded runner, dry-run tested; no mass inference executed |
| Hugging Face tasks | 850 discovery exercises, **not 850 verified live model records** |
| NSFW tasks | 9000 mature-content workflow cards within consent/legal bounds, no actual media generation |
| Actual image/video output, LoRA training, Android/iOS binary build | Not added in v0.9 |

> **به‌روزرسانی v0.8:** اصلاحات امنیت، هم‌زمانی و ۵۰۰۰ سناریوی جدید در `CHANGELOG-v0.8.md` و `QA_REPORT_5000_FA.md`. این اصلاحات به معنی استقرار واقعی یا تکمیل Build Worker نیستند.

> گزارش تازه: `QA_REPORT_FA.md`؛ ۳۰۰ سناریوی ممیزی ورودی + تست‌های یکپارچه موفق. این عدد نشان‌دهنده ۳۰۰ قابلیت کامل جدید نیست.

# FEZI Studio v0.5 — feature coverage and integration reality

This list distinguishes **working code in this repository** from **integration contracts** and **unimplemented planned features**. It is not a claim of full Replit parity.

| Requirement | State | Where |
| --- | --- | --- |
| Persian / English UI | Implemented | `public/` |
| Personalizable UI theme | One implemented fig/mint/coral skin, can edit CSS | `public/app.css` |
| Static website preview, editor, project ZIP | Implemented | `server.js`, `public/app.js` |
| Node, Python, React starter projects | Implemented templates; no embedded execution | `server.js` |
| Multi-step goal-driven AI edits | Implemented with bounded tools, limited max 8 steps | `core/agent.js`, `/api/tasks` |
| Agent job status and cancellation | Implemented while process is running | `core/agent.js` |
| Safe checkpoints and restore | Implemented (restore overlays; new files retained) | `core/agent.js` |
| Code syntax verification | Classic JS syntax only; no full build/test environment | `core/agent.js` |
| OpenAI, Claude, Gemini, OpenRouter, Ollama | API adapters implemented; credentials/service runtime needed | `integrations.js` |
| Add user-selected compatible providers | Implemented in server environment | `AI_PROVIDERS_JSON` |
| Multi-provider collaboration | Planner -> coder -> optional reviewer, if configured | `core/agent.js`, `server.js` |
| OpenHands, OpenCode, Qwen Code, Goose, Aider, Cline | Signed bridge contract, not installed | `core/agent.js`, `examples/agent-bridges.json` |
| Dyad, bolt.diy | Reference projects only, not merged or installed | `public/app.js`, docs |
| code-server / Theia | Reference projects only, not installed | `public/app.js`, docs |
| Hugging Face discovery | Public API integration | `core/huggingface.js` |
| Full private/dynamic website clones | Not implemented; no unauthorized credential bypass | — |
| Public allowlisted HTML URL snapshot | Implemented, no assets/database/backend copy | `core/web.js` |
| GitHub auto branch + PR | Implemented, needs token/allowed repo | `integrations.js` |
| GitHub Pages custom domain | Guides and optional CNAME, needs DNS/Pages config | `docs/DEPLOY.md` |
| Publishing subdomains on a server | Implemented for static text sites once DNS/routes configured | `integrations.js` |
| Push to a remote host | HMAC webhook example, not a universal host adapter | `tools/host-adapter.js` |
| Run Node/Python apps, build APK and run terminal commands | Not implemented; isolated runner required | — |
| Telegram /build, /status, Mini App entry | Bot webhook integration implemented, bot/hosting credentials needed | `telegram.js` |
| ChatGPT plugin / MCP | Development MCP implemented, OAuth production plugin not yet | `mcp.js` |
| Public self-registration and user accounts | Not implemented; single-admin prototype | — |
| Android wrapper | v0.3 legacy source retained; v0.4 APK not built | `android/` |
| Completely free API use on all models | Impossible to guarantee; providers can charge or throttle | — |
| Free self-hosted Ollama runtime | API adapter + optional Docker Compose, user hardware needed | `compose.yaml` |
| All software fully commercial redistributable | FEZI original code MIT; external projects each retain their own license | `LICENSE`, docs |

| PWA static export / Capacitor source ZIP | Implemented in v0.5; APK compilation external | `core/build-export.js`, `/api/build/export` |
| Android GitHub Actions debug APK recipe | Generated in mobile source export; not executed here | `.github/workflows/build-android-apk.yml` inside exported ZIP |


### v0.7 local model additions
- Implemented: official three-model GGUF catalog, offline local inference adapter using optional native library, explicit verified model download CLI, host diagnostics, authenticated `/api/local/*` endpoints, local provider in UI and agent, model catalog in dev MCP.
- Not yet accomplished: download of real weights into distributed source ZIP; native addon installation/inference on user's cPanel; OAuth-enabled public ChatGPT plugin; remote cPanel deployment.

## Live Avatar module, November 2026
- Implemented: `/avatar` browser demo; photo upload staying in client browser, idle animation, blink, head sway, speechSynthesis, audio-file/microphone amplitude animation, profile import/export, optional browser speech recognition, existing authenticated FEZI model-chat handoff.
- Implemented: standalone website starter template and ZIP project export.
- Implemented: authenticated remote GPU video adapter with opt-in upload, format verification, and no fabricated success; Python bridge with a configurable *external* fixed render command.
- Not shipped / not verified: photo-real pretrained generator weights, true viseme-level lip sync, streaming WebRTC GPU video, real-time GPU latency, Persian neural TTS voice, 24/7 uptime, actual Arina source image, or recorded portrait animation.
- 5000 arithmetic/logic/validation test cases were evaluated, plus real HTTP and headless Chromium browser smoke tests. Browser voice playback for Persian has not been verified.
