# FEZI Studio v0.9 — Academy task library and supervised runner

- Added a **103,017-card** deterministic synthetic task library in 23 named categories, compressed into 417 integrity-checked JSONL shards. The unique-card count is verified by automated tests.
- Added authenticated browsing, category pagination, single-task retrieval, and rule-based model recommendations.
- Added explicit per-task model invocation via existing configured providers, clearly distinguished from code execution, visual rendering, evaluation and model training.
- Added a persistent, serialized self-reported review log in the configured `DATA_DIR`. No user's private project data are included in the generated task corpus.
- Added development MCP read tools: `academy_catalog`, `academy_get_task`, `academy_recommend_model`, `academy_progress`. The MCP server **is not a production ChatGPT plugin with OAuth**.
- Added UI Academy button and modal for tasks, rubric, basic model invocation and manager-reviewed progress.
- Added a bounded incremental batch runner with `--dry-run`, resume and explicit `--allow-paid` confirmation for external providers.
- Added six additional automated tests: full data integrity/uniqueness, input-validation, rule-based model recommendation, serialized progress, login & MCP access control, and mock provider execution. Existing tests preserved.

## Known limitations

- Synthetic cards are task specifications, not 103,017 completed human-written tutorials or 103,017 audited reference answers.
- No model fine-tuning or 103,017 actual inference runs were carried out. Model weights are **not** in this package.
- Model routes are heuristic, not benchmark-verified. No video/image render worker is attached.
- HF discovery cards were authored using officially documented workflows; live repo retrieval must happen after deployment. Public HF search through the connected app was unavailable during this build.
- The app remains single-admin; the development MCP requires a shared token and is not publicly installable in ChatGPT without proper auth/OAuth, HTTPS and further security review.
- A terminal/build runner for APK/IPA is not yet part of the product.
- The site-recognition and app-recreation modules do not bypass authentication, DRM, or ownership rights.
