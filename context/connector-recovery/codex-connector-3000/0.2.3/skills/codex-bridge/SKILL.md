---
name: codex-bridge
description: Use the local Codex CLI through Codex Connector 3000 for read-only project inspection, analysis, explicit implementation, and continuation of an existing Codex session.
---

# Codex Bridge 3000

## Purpose
Provide a transparent ChatGPT ↔ local Codex bridge. The connector invokes the locally installed Codex CLI; it does not grant OS privileges or bypass Codex sandbox, approval, or host policy.

## Available actions
- `codex_project_status`: read-only project inspection.
- `codex_ask`: read-only analysis/review with optional `session_id`.
- `codex_implement`: explicit write task with optional `session_id` and `approval_mode`.

## Required workflow
1. Inspect project state before substantial changes.
2. Use `project_root`, never an unrestricted arbitrary working directory.
3. Use `codex_ask` for analysis/review. `read_only` defaults to true and cannot be disabled there; use `codex_implement` for writes.
4. Use `codex_implement` only after an explicit implementation instruction.
5. Require Codex to run relevant tests or verification after changes.
6. Preserve and reuse the returned `session_id` for follow-up work when the same Codex thread should continue.
7. Report exact changed files, tests/results, unresolved risks, and the returned session metadata.

## Sessions
A session identifies the Codex thread plus its project and agent identity. A resumed session receives the explicitly requested sandbox for that turn: read-only analysis uses `sandbox_mode="read-only"`; an explicit implementation uses `sandbox_mode="workspace-write"`. The connector never requests `danger-full-access`.

## Safety and authority
- `NOVA_PROJECT_ROOT` bounds all project paths.
- Codex sandbox and approval policy are authoritative.
- The connector never uses `danger-full-access` or silently bypasses host restrictions.
- `workspace-write` is used only by `codex_implement`.
- No secrets, API keys, OAuth tokens, or credentials are returned to ChatGPT; common secret forms are redacted from Codex output.
- `approval_mode` controls the requested non-interactive Codex approval policy only; it does not grant permissions beyond the sandbox or host policy.
- Do not introduce Agent Bus, Grok, Gemini, or Nova routing until the direct ChatGPT ↔ Local Codex bridge is verified.
