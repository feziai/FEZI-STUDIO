# FEZI Studio v0.6 — Local models and plugin

## Model architecture

`local` in FEZI Studio is a genuine on-server inference provider, separate from Ollama and cloud APIs. It relies on optional `node-llama-cpp` native binaries and local GGUF weights. **This source ZIP contains no model weights**, since the build environment could not fetch the binaries. Nothing is faked: missing model/unsupported host produces an explicit error. The installer is included and downloads fixed files from verified Qwen official Hugging Face model repositories. Keep `.gguf` files on the host, not exposed through a public web folder.

1. `npm run host:check` — view host memory and runtime status.
2. `npm install --no-save node-llama-cpp` — install native GGUF inference adapter on a compatible host.
3. `npm run model:download -- coder-mini` (approximately 491 MB). If no internet access, download weights on your personal PC and upload `models/qwen2.5-coder-0.5b-instruct-q4_k_m.gguf` via SFTP.
4. Set `LOCAL_AI_ENABLED=true`, `LOCAL_DEFAULT_MODEL=coder-mini` and restart Node.
5. Select provider `FEZI GGUF` in the UI.
6. Optional: `npm run model:download -- persian-mini` (official Q8_0, ~639 MB) and `npm run model:download -- coder-plus`.

### Shared cPanel limitations

Some shared accounts prohibit native binaries, long-running CPU processes, or processes using >1 GB RAM. `npm start` with `LOCAL_AI_ENABLED=false` works without the addon and model, but local inference will **not** work on unsuitable shared hosting. Use a separate GPU/CPU computer/VM running Ollama or llama.cpp, and have FEZI Studio on cPanel consume it through a private tunnel. Local inference is not automatically free hosting.

### LoRA

A LoRA is an *adapter*, not a full standalone AI model. To use compatible LoRA in `llama.cpp`, convert the adapter to GGUF if needed, then start an appropriate `llama-server` with `--model <base.gguf> --lora <adapter.gguf>`. A random LoRA cannot be attached to an unrelated model. FEZI Studio can connect to that runtime as an OpenAI-compatible service. For direct embedded use, place a compatible GGUF LoRA adapter under `models/adapters/` and set `LOCAL_LORA_FILE=filename.gguf`; the local runtime loads it at startup. Incompatible LoRA will fail. No LoRA trainer is bundled or claimed.

### ChatGPT plugin

A **development MCP** endpoint is implemented at `POST /mcp` (JSON-RPC, Bearer `MCP_DEV_TOKEN` with >=25 chars). It supports project inspection, local model inventory, propose/apply file change, and agent task start/status. It is not a production public OAuth implementation. To use with ChatGPT as a private plugin: deploy over HTTPS, implement OAuth according to the current OpenAI MCP plugin specification, register custom MCP server in ChatGPT Plugins (subject to account/workspace permissions), and approve writes. Never expose `MCP_DEV_TOKEN` in your frontend. ChatGPT will not call localhost directly without a supported tunnel.

### Source code and model licensing

FEZI Studio source is MIT. The selected Qwen model weights use Apache-2.0; retain attribution and upstream license if redistributing the weights. The downloadable GGUF weights are *not part of this ZIP*.
