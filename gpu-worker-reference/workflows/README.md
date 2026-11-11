# ComfyUI workflows (not supplied)

This directory contains no pretend runnable workflows. Each exact model must have its matching licensed checkpoint and an API-format JSON workflow exported from your working ComfyUI installation.

Name the workflow `<model-id>.json` to match `config/open-models.json`, e.g. `wan22-animate2-14b.json`, `flux1-schnell.json`.

Replace the **exact string values** in the appropriate node input fields with:
- `__FEZI_PROMPT__` for the positive text prompt.
- `__FEZI_REF_IMAGE__` for the uploaded image basename already staged into ComfyUI's `input` directory.
- `__FEZI_DURATION_SEC__` for runtime duration *only if your workflow accepts seconds*; many workflows require frames, so compute frames in the ComfyUI node configuration instead.
- `__FEZI_LORA_ID__` only where the workflow loads a locally verified and licensed LoRA. Make sure it is not interpreted as an arbitrary filesystem path.

Never claim that still storyboard images are a smooth video. The output only counts as approved after actual inference, MP4 inspection, identity-consistency QA and owner's approval.
