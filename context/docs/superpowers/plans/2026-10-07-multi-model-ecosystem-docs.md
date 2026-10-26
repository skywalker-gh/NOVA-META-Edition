# Nova-Ygdrassil Multi-Model Ecosystem Documentation & Integration Patch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce exhaustive architectural documentation (`docs/multi-model-ecosystem.md`) and a unified architectural integration patch (`docs/ecosystem-patch.md`) for the Nova-Ygdrassil Multi-Model Ecosystem uniting Grok, ChatGPT, Claude, and Codex under canonical Nova MCP.

**Architecture:** We will create two comprehensive markdown documents in `docs/`:
1. `docs/multi-model-ecosystem.md`: Exhaustive architectural overview covering all three connectors (Grok, ChatGPT & Claude, Codex V3), security boundaries, environment variable reference, tool contracts, and the multi-model Handoff/Review workflow.
2. `docs/ecosystem-patch.md`: Architectural summary of the integration patch connecting Grok (xAI Responses API), ChatGPT/Claude (dual-model bridge), and Codex V3 (Stateless Streamable HTTP MCP gateway + WebSocket worker + PostgreSQL job leasing) into a unified multi-model agent bus under canonical Nova MCP.

**Tech Stack:** Markdown, MCP (Model Context Protocol), Node.js (Streamable HTTP, WebSocket, Stdio), PostgreSQL, xAI API, OpenAI API, Anthropic API.

**Spec:** User directive for Nova-Ygdrassil Multi-Model Ecosystem documentation and integration patch.

## Global Constraints

- Never commit raw API keys, tokens, or `.env` secrets.
- Adhere strictly to existing architectural patterns in `grok-connector-3000`, `chatgpt-claude-connector-3000`, and `connector-v3`.
- Ensure technical precision regarding authentication (Bearer tokens, SHA-256 verifier hashes, worker tokens), transport protocols (Stdio, Streamable-HTTP, WSS), and security boundaries (Windows sandbox, Railway gateway).

## Review Focus

1. **Secret Leakage Prevention:** Ensuring environment variables and credential hashes are documented with strict emphasis on never committing raw secrets.
2. **Protocol Mismatch:** Documenting exact transport bindings (Stdio for local IDEs, Streamable-HTTP for remote MCP endpoints, WSS for worker-gateway tunnelling).
3. **Sandbox Confinement:** Documenting Codex V3 worker filesystem security limitations and Railway stateless design.
4. **Handoff Integrity:** Detailing how session IDs and structured content enable seamless multi-model handover between Grok, Claude, ChatGPT, and Codex.
5. **Job Leasing Reliability:** Documenting PostgreSQL lease management, retry policies, and indeterminate status handling for Codex V3.

---

## Tasks

### Task 1: Create `docs/multi-model-ecosystem.md`

**Files:**
- Create: `docs/multi-model-ecosystem.md`

**Interfaces:**
- Produces: Comprehensive reference for all three connectors, environment settings, tool definitions, and workflow patterns.

- [ ] **Step 1: Write `docs/multi-model-ecosystem.md`**

Write the complete architectural overview covering:
- Executive Summary & Ecosystem Topology
- Connector 1: Grok Connector (`grok-connector-3000`) - xAI `grok-4.7`, read-only peer review, canonical Nova MCP probe.
- Connector 2: ChatGPT & Claude Dual-Model Bridge (`chatgpt-claude-connector-3000`) - Anthropic Messages API, OpenAI Chat Completions API, Stdio MCP.
- Connector 3: Codex Connector V3 (`connector-v3`) - Stateless Streamable HTTP MCP gateway on Railway, authenticated WSS worker on Windows, PostgreSQL job leasing, workspace sandboxing.
- Environment Variable Reference (per connector).
- Unified Tool Contracts (`codex_project_status`, `codex_ask`, `codex_implement`, `nova_mcp_probe`, etc.).
- Security Boundaries & Credential Management.
- Multi-Model Handoff & Review Workflow.

- [ ] **Step 2: Verify file existence and readability**

Run: `git status`
Expected: `docs/multi-model-ecosystem.md` is untracked and present.

### Task 2: Create `docs/ecosystem-patch.md`

**Files:**
- Create: `docs/ecosystem-patch.md`

**Interfaces:**
- Consumes: Architectural details from Task 1 and existing connectors.
- Produces: Architectural integration patch summary uniting Grok, ChatGPT, Claude, and Codex under the canonical Nova MCP agent bus.

- [ ] **Step 1: Write `docs/ecosystem-patch.md`**

Write the architectural patch document covering:
- Patch Overview & Unified Agent Bus Design.
- Protocol Harmonization (Stdio + Streamable-HTTP + WSS bridging).
- State & Job Lifecycle Integration (PostgreSQL leasing + worker generation fencing).
- Cross-Model Protocol Compatibility and Handoff Patterns.
- Operational Deployment & Validation Summary.

- [ ] **Step 2: Verify file existence and review contents**

Run: `git status`
Expected: `docs/ecosystem-patch.md` is untracked and present.

### Task 3: Final Verification

**Files:**
- Verify: `docs/multi-model-ecosystem.md` and `docs/ecosystem-patch.md`

- [ ] **Step 1: Run git status / check formatting**

Run: `git status`
Expected: Both files present and correctly placed in `docs/`.
