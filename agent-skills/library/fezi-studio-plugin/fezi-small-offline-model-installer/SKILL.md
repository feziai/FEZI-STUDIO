---
name: fezi-small-offline-model-installer
description: Track and install small allowlisted GGUF weights on a user-owned Node.js or GPU server and verify actual runtime status without fictional downloads.
---

# Lightweight GGUF model installer

1. Review `/api/plugins/local-model-status` and inspect `core/local-models.js` for allowlisted small models.
2. Prioritize `smollm2-135m` (~105 MB, Q4_K_M) and `smollm2-360m` (~271 MB, Q4_K_M). Their primary capability is small English chat; Persian quality is limited. Check each upstream exact file, license and size before downloading.
3. On a user-controlled, network-connected Node 22 host, run `npm run model:small:install` (or choose a single model ID). With owner login and `FEZI_ENABLE_WEB_MODEL_DOWNLOADS=true`, the site can also request its own server-side download.
4. Verify filesystem GGUF header and size, check `node-llama-cpp` compatibility, set `LOCAL_AI_ENABLED=true` after test, and run a real inference prompt before marking active.
5. Do not place model weights in the public website folder, a GitHub repository over file limits, or claim installing on ChatGPT cloud. A locally generated ZIP without weights is not an installed model.
6. Never silently download large models, leak private server paths, or bypass paywalls/security restrictions.
