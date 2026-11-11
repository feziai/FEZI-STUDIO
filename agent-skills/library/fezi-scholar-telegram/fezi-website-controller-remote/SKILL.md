---
name: fezi-website-controller-remote
description: Safely read, preview and apply FEZI Studio website project edits through the authenticated owner MCP.
category: website
source: FEZI Website Controller v1.0.5
---
# FEZI Website Controller via private MCP

The controller is bundled with FEZI Studio Node.js 22 at `/mcp/fezi-website-controller` and `/mcp/fezi-agent`. First verify real HTTPS reachability, supported ChatGPT authentication and owner authorization. Use `fezi_remote_projects` and `fezi_site_read`, then `fezi_site_preview_replace`. After the owner approves the exact diff, apply using `fezi_site_apply_replace` with the file SHA-256 and `confirm:true`; the server makes a checkpoint. Test afterward and report saved vs deployed separately. Do not treat a `sites-project://` URI as an API. No arbitrary shell or secret reading.
