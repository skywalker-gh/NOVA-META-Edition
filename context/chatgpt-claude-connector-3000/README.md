# ChatGPT & Claude // Connector 3000

## Overview
A dual-model peer bridge for Nova–Ygdrassil supporting Anthropic Claude (via Messages API) and OpenAI ChatGPT (via Chat Completions API). It connects to the canonical Nova MCP and provides read-only project reviews, focused reasoning, and shared handoffs.

## Required Environment Settings
- `ANTHROPIC_API_KEY`: Anthropic API key for Claude requests.
- `OPENAI_API_KEY`: OpenAI API key for ChatGPT requests.
- `NOVA_PROJECT_ROOT`: Local Nova project root path.
- `NOVA_MCP_URL`: Optional canonical Nova Streamable-HTTP MCP endpoint URL.

## MCP Configuration (`.mcp.json`)
Registered as a Stdio MCP server supporting Claude Desktop, Cursor, and other MCP clients.
