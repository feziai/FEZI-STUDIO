# FEZI Studio integration inventory

| Project | Planned role | How it connects | Already included? |
|---|---|---|---|
| Ollama | Run downloaded Gemma/Qwen/etc. models | `/api/chat` via AI adapter | API adapter only |
| OpenAI | ChatGPT API models | REST chat completions | API adapter only |
| Anthropic | Claude models | Messages REST API | API adapter only |
| Gemini | Google models | generateContent REST API | API adapter only |
| OpenRouter | Model aggregator | Chat completions API | API adapter only |
| bolt.diy | App generation workspace | Separate Node web app / reverse proxy | Not installed |
| Dyad | Local desktop AI builder | Separate desktop application, Git files | Not installed |
| OpenHands | Autonomous coding | Separate agent service on Docker/VPS | Not installed |
| OpenCode | Coding agent | Separate isolated CLI worker | Not installed |
| Cline | VS Code coding assistant | VS Code/code-server extension | Not installed |
| Aider | Git-native code editing | Separate CLI worker on cloned repos | Not installed |
| Goose | Workflow/agent execution | MCP/CLI agent bridge | Not installed |
| Qwen Code | Coding agent | CLI worker | Not installed |
| Eclipse Theia | Advanced browser IDE | Separate web IDE service | Not installed |
| code-server | Browser VS Code | Separate web service | Not installed |
| GitHub | Source/pull requests | GitHub REST, review branch | Implemented, needs token/repo |
| Telegram | Mini App launcher and bot | Bot API and signed webhook | Scaffold implemented, needs bot token |
| ChatGPT Plugins | Plugin host | MCP, OAuth 2.1 | Private dev MCP; public OAuth not implemented |

**Architecture:** Android client / browser UI → Node.js FEZI Studio API → provider routing → agent worker (future isolated compute) → GitHub / host adapters. For customer-facing commercial deployment keep separately licensed code out of the core until verified. A 'free' local model still consumes CPU/GPU and electricity. GitHub and Telegram store code or files, not persistent arbitrary AI compute.

**Useful sources**:
- https://github.com/stackblitz-labs/bolt.diy
- https://github.com/dyad-sh/dyad
- https://github.com/OpenHands/OpenHands
- https://github.com/anomalyco/opencode
- https://github.com/cline/cline
- https://github.com/Aider-AI/aider
- https://github.com/block/goose
- https://github.com/QwenLM/qwen-code
- https://github.com/eclipse-theia/theia
- https://github.com/coder/code-server
- https://developers.openai.com/plugins/build/mcp-server
- https://core.telegram.org/bots/webapps
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages
- https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/
