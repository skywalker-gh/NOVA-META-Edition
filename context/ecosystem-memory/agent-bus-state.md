# Agent-Bus Operational State

## 1. Connector Inventory
- **Grok Connector 3000** (`grok-connector-3000/`): Configured with `XAI_API_KEY`, tested live successfully.
- **ChatGPT & Claude Connector** (`chatgpt-claude-connector-3000/`): Configured with `OPENAI_API_KEY` (tested live: "Ja, die Brücke steht") and `ANTHROPIC_API_KEY` (awaiting credits).
- **Codex Connector V3** (`connector-v3/`): Configured with local `.env`, 32/32 unit tests passing.

## 2. Memory & Persistence Layer
- **Canonical Context**: `PROJECT_CONTEXT.md` in root.
- **Auto-Sync Utility**: `scripts/sync-memory.mjs` aggregates handoffs and updates memory.
- **Security**: All credentials isolated in `.env`, git-ignored.
