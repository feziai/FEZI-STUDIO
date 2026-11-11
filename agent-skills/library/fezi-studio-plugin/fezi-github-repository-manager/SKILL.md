---
name: fezi-github-repository-manager
description: Open, inspect, create, branch and safely update GitHub repositories using an authorized connector.
---

# Fezi Github Repository Manager — FEZI Studio

## Execution checklist
1. Resolve the exact owner/repository; check that the connected GitHub account is authorized for it.
2. Read repository metadata, default branch, branch protections, tree and selected source files.
3. On create: check name collision and visibility, request approval, create only through the authenticated official GitHub operation, and return the verified repository URL.
4. On update: create a feature branch from latest default branch, apply reviewed changes, run formatting/tests, commit with an informative message, open pull request when possible.
5. Avoid overwriting others' commits: compare current SHA, rebase or ask on conflicts. Avoid force-push, history rewriting and adding credentials.
6. Distinguish a local archive from a pushed commit; report commit SHA and pull request URL only after provider success.
Reference: https://docs.github.com/en/rest .

## Evidence contract
- Classify the result as PLANNED, PATCH_READY, LOCALLY_TESTED, CONNECTED, or VERIFIED_LIVE.
- Return exact source target, tests, logs or remote reference and blockers.
- The skill cannot provide itself with account authorization, remote access, hosting, model weights, or payment.
