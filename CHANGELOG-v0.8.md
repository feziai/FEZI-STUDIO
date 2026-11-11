# FEZI Studio v0.8 — 2026-11-01

- Added deterministic 5,000-case nonduplicated QA suite and fixtures.
- Added HTTP security/concurrency and agent concurrency regressions.
- Rejected JSON bodies that are not objects (HTTP 400).
- Blocked symlinked project file parents and final targets.
- Serialized writes per project to preserve file-count invariants.
- Unified build export source path validation with shared fileName rules.
- Updated IPv6 public-IP validation for special IPv6 ranges.
- Reserved agent jobs before awaiting disk I/O to prevent same-project races.
- Verified 5,344 passing local tests on Node 22.16.0.
- **No claim of live cPanel/Telegram/ChatGPT/GGUF/API or Android/iOS production build tests.**
