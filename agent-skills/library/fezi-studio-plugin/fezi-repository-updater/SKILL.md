---
name: fezi-repository-updater
description: Audit and update repository files with tests, rollback and clear release evidence.
---

# Fezi Repository Updater — FEZI Studio

## Execution checklist
1. Inspect package manifests, git status, recent commits, dependencies, CI pipelines and current deployment environment.
2. Make a change map with exact paths and backwards-compatibility risks; preserve unrelated user files.
3. Make surgical edits on a feature branch and run automated tests, linting, security and build checks.
4. Record per-file diff, test results, failed checks and recovery instructions.
5. Do not push without the correct connected credential and user's authorization. Verify remote SHA after write.
6. If the git integration lacks write access, provide a patch and exact manual next step rather than claiming an update.
7. Use pull requests for protected branches; never bypass branch policies.

## Evidence contract
- Classify the result as PLANNED, PATCH_READY, LOCALLY_TESTED, CONNECTED, or VERIFIED_LIVE.
- Return exact source target, tests, logs or remote reference and blockers.
- The skill cannot provide itself with account authorization, remote access, hosting, model weights, or payment.
