---
name: fezi-video-model-runtime-audit
description: Check model catalogs, licenses and real video inference readiness for FEZI Studio.
---

# Fezi Video Model Runtime Audit — FEZI Studio

## Execution checklist
1. Compare registry IDs and names case-insensitively; retain distinct versions (Wan 2.1 vs 2.2, LTX 2 vs 2.3).
2. For each model obtain trustworthy upstream Hugging Face or GitHub location, release/license, task type T2V/I2V, required hardware, checkpoint files and runtime adapter support.
3. Mark statuses separately: DISCOVERED, METADATA_VERIFIED, WEIGHTS_INSTALLED, WORKER_HEALTHY, INFERENCE_TEST_PASSED, DEPLOYED.
4. A listed model is not necessarily free to serve, runnable locally, NSFW-capable, or available as an API. Do not promise these properties.
5. For inference: require actual worker connection, sample user-authorized prompt, job ID, output MP4 and resource accounting; smoke-test each installed model.
6. Keep unsafe or unverified models catalog-only, with the generate action disabled until real support is configured.
7. Never bypass licensing, platform rules, or content protections; disclose resource requirements honestly.
Reference: https://huggingface.co/docs/hub/models .

## Evidence contract
- Classify the result as PLANNED, PATCH_READY, LOCALLY_TESTED, CONNECTED, or VERIFIED_LIVE.
- Return exact source target, tests, logs or remote reference and blockers.
- The skill cannot provide itself with account authorization, remote access, hosting, model weights, or payment.
