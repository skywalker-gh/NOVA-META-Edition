# Nova-Ygdrassil Multi-Model Ecosystem Integration Patch

> **Architectural Patch Specification**  
> *Unifying Grok, ChatGPT, Claude, and Codex into a Synchronized Multi-Model Agent Bus under Canonical Nova MCP.*

---

## 1. Patch Overview

The **Nova-Ygdrassil Ecosystem Integration Patch** establishes a cohesive, fault-tolerant protocol bridge between disparate AI model providers and execution runtimes. By establishing the **Canonical Nova MCP** as the single source of truth for workspace resources, this patch eliminates fragmented tooling silos and enables seamless peer collaboration between xAI Grok, Anthropic Claude, OpenAI ChatGPT, and local Codex CLI workers.

---

## 2. Protocol Harmonization & Transport Bridging

| Component | Provider / Engine | Transport Protocol | Authentication Mechanism | Role in Ecosystem |
|---|---|---|---|---|
| **Grok Connector** | xAI (`grok-4.7`) | Stdio + Streamable-HTTP | `XAI_API_KEY`, `NOVA_MCP_TOKEN` | Read-only peer review & codebase probing |
| **ChatGPT & Claude Bridge** | OpenAI / Anthropic | Stdio MCP | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` | Dual-model reasoning & interactive session execution |
| **Codex Connector V3** | OpenAI Codex CLI | Stateless HTTP MCP + WSS | Bearer Token Hash + Worker Token | Secure sandboxed execution & workspace mutations |

- **Bridge Layer**: Translates incoming client MCP requests into standardized Streamable-HTTP payloads routed to the canonical Nova MCP endpoint.
- **WebSocket Tunneling**: Bypasses network boundary restrictions by having the local Windows worker initiate an outbound WSS connection (`/worker`) to the Railway gateway, eliminating the need for inbound firewall port forwarding.

---

## 3. State & Job Lifecycle Integration

To prevent race conditions and ensure high reliability across asynchronous model interactions, Codex V3 introduces a robust state management pipeline:
1. **Lease Management**: PostgreSQL (`migrations/001_jobs.sql`) manages job queues and lease acquisition. Read-only jobs (`codex_ask`, `codex_project_status`) support safe retry upon lease expiration.
2. **Indeterminate Isolation**: Implementation jobs (`codex_implement`) encountering unknown failures enter an `indeterminate` state and are quarantined to prevent duplicate destructive writes.
3. **Generation Fencing**: Worker connections utilize generational IDs to fence stale sockets, ensuring that results from disconnected or lagging worker instances are rejected.
4. **Data Hygiene**: Raw prompt/result bodies are automatically purged after 24 hours, while sanitized job metadata is retained for 30 days.

---

## 4. Cross-Model Handoff & Protocol Compatibility

The integration patch standardizes session continuation across all models through:
- **`session_id` propagation**: Models pass persistent UUID session identifiers across tool calls (`codex_ask`, `codex_implement`), allowing ChatGPT, Claude, and Grok to pick up context seamlessly.
- **Structured Content Responses**: All tool outputs return standardized JSON structures containing execution metadata, status codes, and context handles.
- **Read-Only Peer Review Loop**: Before any implementation is finalized, Grok or Claude executes a read-only review against the modified workspace files via the canonical Nova MCP probe.

---

## 5. Operational Validation & Deployment Checklist

1. **Environment Verification**: Ensure all required `.env` variables (`XAI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`) and token hashes (`MCP_BEARER_TOKEN_HASH`, `WORKER_TOKEN_HASH`) are correctly provisioned.
2. **Gateway Health Check**: Verify Railway deployment liveness (`/health/live`) and readiness (`/health/ready`).
3. **Worker Connection**: Launch the Windows worker (`npm run start:worker`) and confirm successful WSS handshake and continuous 5-second heartbeats.
4. **End-to-End Probing**: Execute `nova_mcp_probe` and test `codex_project_status` to validate end-to-end connectivity across the unified agent bus.
