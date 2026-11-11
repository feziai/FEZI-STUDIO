# FEZI Studio v1.2 Open Models — QA Summary

## Verified in this environment

- `npm test`: **5426 passed, 0 failed** (includes 7 additional model-hub tests).
- Model license catalog contains 16 explicitly tagged Apache-2.0 model release references; their model cards were researched on 2026-11-01. Recheck before production release.
- Verified positive mock requests to Ollama local adapter and GPU worker job submit/status.
- Verified worker rejects missing configuration, invalid model selection, disallowed URL schemes, invalid video duration, and unsafe relative paths.
- `node --check server.js` and `python -m py_compile gpu-worker-reference/server.py` passed.
- Local HTTP smoke: `/`, `/free-ai`, `/free-ai/index.js`, `/api/free-ai/models`, `/api/arina/gallery` returned 200; without auth `POST /api/free-ai/chat` returned 401.
- New page links added to FEZI Studio existing `/showcase` tool cards without modifying site CSS.

## Not verified / not done

- No new model weights downloaded, no LoRA model trained; no GPU rendering was executed.
- No actual 1080p Arina MP4, no uninterrupted live stream, no 3D avatar model is claimed.
- No third-party model license terms have been overridden or bypassed. `FEZI_OWNER_UNLIMITED` means there is no app-layer owner daily generation quota; compute capacity remains finite.
- No changes pushed to GitHub or deployed to Railway. User stated main source has not been uploaded to GitHub yet.
- Private-room code from previous project remains unchanged; production isolation/security still requires audit and hosting setup.
- Payment remains unconfigured without a verified on-chain processor; no funds should be sent based on demos.

## Deployment prerequisites

1. Node 22 running FEZI Studio, with valid unique `APP_PASSWORD` and `SESSION_SECRET`.
2. Ollama installed and model actually pulled for chat/code.
3. GPU machine with ComfyUI, checkpoint and valid API JSON workflow, private worker token / secure networking for image/video.
4. Arina copyrighted/consented image references and driving videos curated; train LoRA separately if desired.
5. Regular backups and production access control for the model endpoints.
