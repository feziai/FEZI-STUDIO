---
name: fezi-tool-authorization
description: Secure tool discovery and permission requests for read, write, deploy, and destructive actions.
---

# Fezi Tool Authorization — FEZI Studio

## Execution checklist
1. Discover available connected tool actions and inspect their documented schemas. Never invent an endpoint or claim a connector is enabled.
2. Build an action plan with each target, owner account, required scope, data accessed, risk, and rollback.
3. Prefer least privilege: read_repository_metadata, contents:read, then contents:write for selected repositories only.
4. For repository creation, secrets, payments, DNS edits, server provisioning, VPN keys, public posts, or deletion, obtain explicit user approval and let provider OAuth consent run in its official interface.
5. Store access tokens only in approved secret stores; never log or embed in output files. Validate scope with a harmless operation.
6. Return a permission matrix showing GRANTED / NOT_CONNECTED / DENIED / UNKNOWN per tool. Never treat this SKILL.md as authorization.

## Evidence contract
- Classify the result as PLANNED, PATCH_READY, LOCALLY_TESTED, CONNECTED, or VERIFIED_LIVE.
- Return exact source target, tests, logs or remote reference and blockers.
- The skill cannot provide itself with account authorization, remote access, hosting, model weights, or payment.
