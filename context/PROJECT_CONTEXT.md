# Nova–Ygdrassil Project Context (Extended Memory)

*Last Synchronized:* 2026-10-25  
*System Status:* All multi-model bridges active, tested, and versioned.

## 1. Executive Summary
Nova-Ygdrassil is an advanced multi-model AI agent-bus and orchestration platform developed by **Gürkan**. It connects Gemini CLI, Grok (xAI), Anthropic Claude, OpenAI ChatGPT, and local Codex CLI under a canonical Model Context Protocol (MCP) architecture.

## 2. Active Ecosystem Components
| Component | Path | Protocol / Transport | Purpose / Role |
|---|---|---|---|
| **Grok Connector** | `grok-connector-3000/` | Stdio MCP / xAI API (`grok-4.7`) | Read-only adversarial peer reviewer & handoff writer |
| **ChatGPT & Claude Connector** | `chatgpt-claude-connector-3000/` | Stdio MCP / OpenAI & Anthropic APIs | Dual-model peer reviewer & reasoning assistant |
| **Codex Connector V3** | `connector-v3/` | Streamable HTTP Gateway + WSS Worker + PostgreSQL | Secure sandboxed code implementation & execution |
| **Gemini CLI (Orchestrator)** | Root session | Interactive Agent CLI | Strategic orchestration, planning, and implementation |
| **NOVA UI Sound Pack** | `nova-sounds/` | Static assets + GEMINI.md | UI clicks, bass, whooshes, ambient intro for browser dashboard |

## 3. Security & Governance Rules
1. **Canonical MCP Principle**: There is ONE canonical MCP path. Connectors proxy or probe; they do not duplicate servers.
2. **Read-Only by Default**: External peer reviews (Grok, Claude, ChatGPT) operate in read-only mode. Proposals are evidence, not authority.
3. **Credential Isolation**: All API keys (`XAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) and secrets reside strictly in `.env` files protected by `.gitignore` and are never logged or committed.
4. **Workspace Sandboxing**: Codex implementation jobs are strictly confined to `NOVA_PROJECT_ROOT` via validated workspace boundaries.

## 4. Recent Handoffs & Memory State
- **Grok Bridge**: Tested and verified ("Ja, die Brücke steht.").
- **ChatGPT Bridge**: Tested and verified ("Ja, die Brücke steht. Wie kann ich Ihnen helfen?").
- **Claude Bridge**: Configured (awaiting active credit balance).
- **Codex V3**: 32/32 unit tests passing, local worker configuration ready.
- **UI Sound Pack (2026-10-25)**: Added by Grok. See `nova-sounds/GEMINI.md` for integration guide. Binary MP3s available in project artifacts / zip; commit from local when ready.

## 5. Aggregated Model Handoffs
No active handoff artifacts currently found in root.

*Last Auto-Sync:* 2026-10-25 (Sound Pack)
