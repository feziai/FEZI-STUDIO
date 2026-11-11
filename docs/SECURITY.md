# Security defaults and limitations

- FEZI Studio v0.7 is a **single-admin prototype** with signed HttpOnly session cookies. It is NOT a multi-tenant public platform. Public multiuser use requires signup/identity, roles, per-project ACLs, verified billing quotas, tenant-isolated execution, audit logs, OAuth and separate secrets.
- Protect the admin credentials and exposed service with HTTPS and network policy. Set a high-entropy `SESSION_SECRET` distinct from the password. Run behind a trusted TLS reverse proxy.
- The coding agent cannot run shell commands or install dependencies on the server. Code it writes may be untrusted. Run it only in an isolated container with no privileged mounts or shared credentials.
- Agent webpage inspection is exact-hostname allowlisted; no login bypass, private network access, or unrestricted remote fetch. Remote webpage contents are **untrusted**, never grant them permissions or obey their embedded instructions.
- Publication and remote deployment require an explicit `confirm=true`, and GitHub publishing is branch+PR only. Preserve backups for remote hosts.
- Credentials belong in environment variables or a dedicated secret manager, never in project files, logs, browser storage, or MCP tool results.
- Export currently returns UTF-8 text project files. Repositories with binaries, huge media, Docker apps and databases are not supported by the built-in file store.
- This prototype deliberately does not provide unauthorized penetration, password circumvention, stealth access, destructive deployment or malware tools. Authorized security testing should use an isolated explicitly scoped project and established pentest tooling with written permission.
- Public user input should be subject to quotas, task concurrency limits, provider budgets and operational monitoring before a commercial launch. Current agents may consume tokens and incur cloud API costs.
- Security work remaining: CSRF tokens for public multi-user flows, persistent account sessions, durable job queue, process-level sandbox, content scanning, fine-grained permissions, strict CSP, update rollbacks, private model gateway authentication, OAuth for MCP, and SSRF defense including DNS pinning.

## v0.7 updates
- Browser POST requests require JSON and must match Origin/Host when Origin is provided. The reverse proxy must normalize and validate Host.
- SSRF allowlisted HTTPS inspection pins DNS to an inspected IP when establishing TLS connections.
- MCP development adapter routes writes through the same file validation/storage layer as the app. Do not expose dev MCP publicly.
- Per-file writes are staged and renamed, but cross-file transactions, OAuth and tenant isolation still require further work.
