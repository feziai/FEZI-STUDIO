# Acceptance and honest test status
- The supplied design prototype is a static functional interaction mock. It does not connect to a live AI, OAuth, ComfyUI or GitHub.
- Image/video analyzers must show disabled until a backend is configured.
- For cloud model providers, actual costs/quotas/licensing must be verified; no 'fully free unlimited' promise.
- 70 MCP catalog placeholders != 70 connected MCP servers.
- Prior addon v081 includes tests in test/adapters.test.mjs; these may use mock HTTP endpoints. Test labels must preserve this distinction.
- Add build gates so code/secret changes cannot be autonomously promoted without reviewed passing tests.
- Owner-facing notifications must not send private user assets without informed consent.
