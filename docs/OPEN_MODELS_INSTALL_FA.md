# FEZI Studio 1.2 — مدل‌های رایگان، مجوز و راه‌اندازی

This addon updates existing FEZI Studio source; existing page designs, galleries, shared Arina room, wallets and payment safeguards are preserved.

## نصب Node.js (پیش‌نیاز: Node 22)

```sh
npm start
```
Set `APP_PASSWORD` and a distinct `SESSION_SECRET` (at least 24 characters) in the production environment. Do not place secrets inside code, browser JS, or GitHub. The additional page is `/free-ai`, and read-only catalog endpoint `/api/free-ai/models` is available without login. Generation requires a valid admin session.

## مدل‌های متنی و کدنویسی: Ollama

1. On your own machine or trusted GPU host, install [Ollama](https://ollama.com/download).
2. Pull one licensed local model:

```sh
ollama pull qwen3:8b
ollama pull qwen2.5-coder:7b
ollama pull qwen3.5:9b
```

3. Configure `OLLAMA_BASE_URL=http://127.0.0.1:11434` when FEZI and Ollama run on the same host. For different machines, connect by **private network / tunnel**, not an exposed public Ollama port.
4. Log in to FEZI. Send `POST /api/free-ai/chat` with `{ "modelId": "qwen3-8b", "prompt": "سلام" }`.
5. These are runtime tag suggestions, not a claim that the tags or weights are pre-installed. Confirm the license of the exact Ollama model you download.

## تصاویر و ویدیو: GPU Worker (requires real GPU)

1. Install ComfyUI on a GPU machine, plus the specific compatible open-weight model checkpoints for your selected workflow.
2. Export a *working* API-format workflow JSON from ComfyUI. Store it at `gpu-worker-reference/workflows/<model-id>.json` using placeholders described in the workflows README.
3. On that GPU machine:

```sh
export FEZI_GPU_WORKER_TOKEN='a-long-random-token-32-chars-or-more'
export COMFYUI_URL='http://127.0.0.1:8188'
python3 gpu-worker-reference/server.py
```

4. Connect FEZI over a private tunnel or HTTPS to `FEZI_GPU_WORKER_URL`, with the same `FEZI_GPU_WORKER_TOKEN` on both ends.
5. Logged-in owner submits `POST /api/free-ai/jobs` with example:

```json
{"kind":"video","modelId":"wan22-animate2-14b","prompt":"Arina reading a chat message and typing; fixed frontal camera; continuous motion","durationSec":8}
```

6. Poll `GET /api/free-ai/jobs/<job-id>`. Only after confirmed output exists and is reviewed should any resulting MP4 be published to the Arina video library. The bridge does not claim automatic LoRA training or instant 1080p rendering. `durationSec` is a target, not necessarily supported by a given workflow.

**Crucial:** ComfyUI and large video checkpoints do **not** run inside a normal shared cPanel Node.js account. Run FEZI on Node.js hosting, and the GPU worker elsewhere.

## LoRA — Arina

See `config/arina-lora-training-plan.json`. The plan distinguishes: character identity adapter, expression adapter, and licensed motion-driving dataset. LoRA files are neither pretrained nor embedded in this ZIP. Training needs sufficient real photos / curated licensed driving videos and a GPU.

## Cost & permission

Apache-2.0 weights can be self-hosted without paying token-based API charges. Compute, GPU rental, electricity, bandwidth and storage are not guaranteed free. Free-to-download is not identical to OSI-open-source, and each model release can carry a different license.

See `config/open-model-exclusions.json`: LTX-2.3, HunyuanVideo 1.5, CogVideoX 1.5 and FLUX.1 Dev require separate license review and are excluded from the default unencumbered registry.

Original app source LICENSE remains unchanged (MIT). `docs/OPEN_MODEL_PERMISSION_FA_EN.md` contains a proposed policy for developer-owned code; it cannot overrule upstream licenses.

## Current acceptance status

- Catalog served by real Node.js API — **implemented**.
- Local Ollama chat adapter — **implemented but requires a real installed Ollama model**.
- GPU/ComfyUI job broker — **implemented but requires a worker, weights and API workflow on a GPU host**.
- Actual Arina training, MP4 rendering, production 24/7 streaming — **NOT completed**.
- Owner application quota config: no hard daily caps; worker queue and physical limits remain.
