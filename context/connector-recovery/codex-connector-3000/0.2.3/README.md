# Codex // Connector 3000 v0.2.0

Local MCP bridge for ChatGPT ↔ installed Codex CLI execution against the configured Nova/Ygdrassil project.

## Runtime
- `NOVA_PROJECT_ROOT`: absolute allowed project root. Every `project_root` must remain inside this tree.
- `CODEX_BIN`: optional Codex executable override; Windows defaults to `codex.cmd`, other systems to `codex`.
- MCP entrypoint: `mcp/server.mjs`.

## Actions
- `codex_project_status` — read-only project status.
- `codex_ask` — read-only analysis/review with optional `session_id`.
- `codex_implement` — explicit implementation using the workspace-write sandbox, with optional session continuation and approval mode.

## Sessions
The Codex thread ID is returned as `session_id` when available from JSON events. The connector keeps the project root and agent identity with the session while the MCP process remains alive and uses `codex exec resume <session_id>` for follow-up turns. A resumed session can explicitly switch between `read-only` and `workspace-write` for the requested turn; the connector never requests `danger-full-access`.

## Security
- The connector cannot bypass Codex or host sandbox/approval restrictions.
- `project_root` is bounded by `NOVA_PROJECT_ROOT`.
- Write operations are exposed only through `codex_implement`.
- Common API keys, tokens, passwords, and private-key blocks are redacted from returned output.
- The connector does not implement the future Agent Bus yet.

## Compatibility
`.mcp.json` is retained as a compatibility overlay. The portable MCP configuration is `mcp.json`.
