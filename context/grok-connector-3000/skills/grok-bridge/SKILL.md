---
name: grok-bridge
description: Use Grok as an independent peer against the canonical Nova–Ygdrassil MCP and project state.
---

# Grok Bridge 3000 v0.4

## Architecture rule
Nova–Ygdrassil has ONE canonical MCP server. This connector does not create or replace that server. `NOVA_MCP_URL` points to the existing Streamable-HTTP MCP endpoint when available.

## Grok role
Grok is an independent adversarial reviewer. Default project permissions are read-only. Grok proposals are evidence, not authority. Never claim Grok changed Nova unless an authorized implementation agent actually applied and verified the change.

## Existing Nova MCP
Use `nova_mcp_probe` to verify the configured canonical endpoint. It performs an MCP JSON-RPC request against `NOVA_MCP_URL`; it does not start another server and does not modify project files.

## Direct xAI path
Use `grok_ask` for focused reasoning and `grok_project_review` for read-only review. `XAI_API_KEY` stays in environment configuration and never goes into project files or prompts.

## Safe workflow
1. Read `PROJECT_CONTEXT.md`.
2. Probe the existing Nova MCP endpoint if `NOVA_MCP_URL` is configured.
3. Give Grok only the relevant files/context.
4. Record VERIFIED vs UNVERIFIED findings.
5. Do not grant Grok write permissions based on its own output.
6. If a write is needed, hand the concrete proposal to the controlling implementation agent.
7. Run tests and update project provenance.
