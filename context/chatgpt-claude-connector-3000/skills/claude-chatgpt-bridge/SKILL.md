---
name: claude-chatgpt-bridge
description: Use Anthropic Claude and OpenAI ChatGPT as independent peer reviewers against the canonical Nova–Ygdrassil MCP and project state.
---

# ChatGPT & Claude Bridge 3000 v1.0

## Architecture rule
Nova–Ygdrassil has ONE canonical MCP server. This connector provides dual peer integration with Anthropic Claude and OpenAI ChatGPT via their respective APIs (`anthropic_api_key`, `openai_api_key`).

## Model roles
Claude and ChatGPT act as independent adversarial or collaborative engineering peers. Default project permissions are read-only. Proposals are evidence, not authority. Never claim changes were applied unless an authorized implementation agent actually applied and verified them.

## Tools
- `claude_ask` & `chatgpt_ask`: Focused reasoning prompts.
- `claude_project_review` & `chatgpt_project_review`: Read-only code reviews.
- `project_read_state` & `project_write_handoff`: State management and shared handoff artifacts.
- `nova_mcp_probe`: Probe canonical Nova MCP endpoint.

## Safe workflow
1. Read project context.
2. Query Claude or ChatGPT with relevant context and tasks.
3. Record findings and write handoffs (`MODEL_HANDOFF_CLAUDE_CHATGPT.md`) if necessary.
4. Run tests and update project provenance.
