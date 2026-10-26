# Implementation Plan: ChatGPT & Claude Bridge 3000

## Objective
Develop a second universal MCP bridge (`chatgpt-claude-connector-3000`) referencing the architecture of `grok-connector-3000` and `connector-v3`. It supports both local Stdio MCP execution (ideal for Claude Desktop) and Streamable HTTP / SSE endpoints (ideal for ChatGPT Custom GPTs / remote clients), integrating with Anthropic Claude and OpenAI ChatGPT APIs alongside the canonical Nova MCP path.

## Key Files & Context
- **Reference 1:** `grok-connector-3000/mcp/server.mjs` (Stdio MCP server, tool definitions, file reading, API client pattern).
- **Reference 2:** `connector-v3/` (Streamable HTTP / SSE gateway patterns).
- **New Target:** `chatgpt-claude-connector-3000/`
  - `mcp/server.mjs` (Unified Stdio & HTTP MCP server)
  - `plugin.json` / `.mcp.json` (Plugin and MCP server metadata)
  - `skills/claude-chatgpt-bridge/SKILL.md` (Operational instructions)
  - `.env.example` & `package.json`

## Implementation Steps

### Phase 1: Directory Structure & Scaffolding
1. Create `chatgpt-claude-connector-3000/` with subdirectories `mcp`, `skills/claude-chatgpt-bridge`, `assets`, and `.codex-plugin`.
2. Add `package.json`, `.env.example`, `.gitignore`, `plugin.json`, and `.mcp.json`.

### Phase 2: Core MCP Server (`mcp/server.mjs`)
1. Implement dual transport support:
   - **Stdio Mode** (default for Claude Desktop / local MCP).
   - **HTTP / SSE Mode** (optional port listening for ChatGPT remote MCP).
2. Implement AI integration clients:
   - `claude_ask` / `chatgpt_ask` (using Anthropic Messages API and OpenAI Chat Completions API).
   - `claude_project_review` / `chatgpt_project_review` (read-only project inspection and adversarial review).
   - `project_read_state` & `project_write_handoff`.
   - `nova_mcp_probe` (probing canonical Nova MCP).

### Phase 3: Skill & Documentation
1. Create `skills/claude-chatgpt-bridge/SKILL.md` detailing the dual-model bridge workflow.
2. Write comprehensive `README.md` with instructions for Claude Desktop (`claude_desktop_config.json`) and ChatGPT.

### Phase 4: Verification & Testing
1. Create a test script to verify API connectivity with both Anthropic and OpenAI endpoints.
2. Validate Stdio MCP JSON-RPC protocol compliance.

## Verification & Testing
- Run test scripts for Anthropic Claude and OpenAI ChatGPT API endpoints.
- Test MCP handshake (`initialize`, `tools/list`, `tools/call`).
- Ensure `.env` is ignored by Git and API keys remain secure.
