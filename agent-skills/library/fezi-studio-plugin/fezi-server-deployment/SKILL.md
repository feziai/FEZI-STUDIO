---
name: fezi-server-deployment
description: Prepare and deploy Node.js, Docker and GPU worker applications on user-authorized servers.
---

# Fezi Server Deployment — FEZI Studio

## Execution checklist
1. Confirm target host, environment, domain, budget, OS, deployment platform and access mode.
2. Validate host ownership/authorization and identify execution interface (SSH, Railway, cPanel, GitHub Actions etc). Never guess server credentials.
3. Create environment-variable templates, health checks, Dockerfile/systemd if appropriate, backups and rollback plans.
4. Enforce separate dev/staging/prod, TLS, minimal inbound ports, secret store, service account privileges, logs and rate limiting.
5. Run dry-run/build checks before deploying; ask before any cloud cost, production restart or DNS write.
6. Verify actual URL/health endpoint and logs after deployment. Report READY_TO_DEPLOY not LIVE if host is absent.
Reference: https://docs.docker.com/ and https://nodejs.org/en/learn .

## Evidence contract
- Classify the result as PLANNED, PATCH_READY, LOCALLY_TESTED, CONNECTED, or VERIFIED_LIVE.
- Return exact source target, tests, logs or remote reference and blockers.
- The skill cannot provide itself with account authorization, remote access, hosting, model weights, or payment.
