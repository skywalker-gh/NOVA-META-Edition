# Nova-Ygdrassil Multi-Model Ecosystem Architecture

> **Exhaustive Technical & Architectural Reference**  
> *Covering Grok Connector, ChatGPT & Claude Dual-Model Bridge, and Codex Connector V3 under the Canonical Nova MCP Bus.*

---

## 1. Executive Summary & Ecosystem Topology

The **Nova-Ygdrassil Multi-Model Ecosystem** is an advanced AI agent architecture that unifies multiple frontier models—**xAI Grok** (`grok-4.7`), **Anthropic Claude**, **OpenAI ChatGPT**, and **Local Codex CLI**—into a collaborative agent bus. All models communicate with project files and workspace tools through the **Canonical Nova Model Context Protocol (MCP)**.

```
┌────────────────────────────────────────────────────────┐
│                   Multi-Model Clients                  │
│  (ChatGPT, Claude Desktop, Cursor, xAI Grok, Codex)    │
└───────────┬────────────────────┬───────────────────┬───┘
            │ (Bearer / Stdio)   │ (Stdio)           │ (WSS)
            ▼                    ▼                   ▼
┌──────────────────────┐ ┌──────────────┐ ┌───────────────────┐
│ ChatGPT & Claude     │ │ Grok         │ │ Codex Connector   │
│ Connector (3000)     │ │ Connector    │ │ V3 (Gateway +     │
│ (Stdio/HTTP Bridge)  │ │ (Read-Only)  │ │ Windows Worker)   │
└──────────┬───────────┘ └──────┬───────┘ └─────────┬─────────┘
           │                    │                   │
           └────────────────────┼───────────────────┘
                                ▼
                   ┌─────────────────────────┐
                   │ Canonical Nova MCP Bus  │
                   │ (Streamable-HTTP / SSE) │
                   └─────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Grok Connector (`grok-connector-3000`)
- **Primary Purpose**: Read-only peer review and code analysis using the xAI Responses API (`grok-4.7`) combined with the canonical Nova MCP probe.
- **Transport**: Local stdio MCP server coupled with Streamable-HTTP HTTP probing.
- **Key Features**:
  - Implements an MCP `ping` handler and standard initialization lifecycle.
  - Interacts with the canonical Nova MCP endpoint (`NOVA_MCP_URL`) using protocol-version headers, session-ID management, and JSON/SSE response handling.
  - Maintains strict read-only guarantees for peer code reviews.

### 2.2 ChatGPT & Claude Dual-Model Bridge (`chatgpt-claude-connector-3000`)
- **Primary Purpose**: Dual-model MCP bridge connecting Anthropic Claude (via Messages API) and OpenAI ChatGPT (via Chat Completions API) directly to local project files and the canonical Nova MCP.
- **Transport**: Stdio MCP server supporting Claude Desktop, Cursor, and other MCP clients.
- **Key Features**:
  - Unified bridge interface allowing switching or cascading between ChatGPT and Claude reasoning engines.
  - Access to project-level tools and file inspection under `NOVA_PROJECT_ROOT`.

### 2.3 Codex Connector V3 (`connector-v3`)
- **Primary Purpose**: Stateless Streamable HTTP MCP gateway hosted on Railway, backed by a PostgreSQL job leasing engine and an authenticated outbound WebSocket worker running on a local Windows host with Codex CLI sandboxing.
- **Architecture**:
  - **Gateway**: Stateless Node.js server (`src/gateway.js`) deployed on Railway. Exposes `/mcp`, `/worker`, and health checks (`/health/ready`, `/health/live`). Validates bearer tokens and worker tokens via SHA-256 verifier hashes.
  - **Worker**: Outbound WSS client (`src/worker.js`) running on local Windows. Connects to the gateway, maintains 5-second heartbeats, and leases jobs from PostgreSQL.
  - **Job Store**: PostgreSQL database (`migrations/001_jobs.sql`) managing job queues, leasing, retries, and expiration.
  - **Codex Runner**: Local execution engine (`src/codex-runner.js`) invoking the Codex CLI in `read-only` or `workspace-write` mode within `NOVA_PROJECT_ROOT`.

---

## 3. Environment Variable Configurations

### Grok Connector (`grok-connector-3000/.env`)
```env
NOVA_MCP_URL=https://your-canonical-nova-mcp-endpoint.railway.app/mcp
NOVA_MCP_TOKEN=your_optional_bearer_token
NOVA_PROJECT_ROOT=C:/path/to/nova/project
XAI_API_KEY=xai-your-api-key-here
```

### ChatGPT & Claude Connector (`chatgpt-claude-connector-3000/.env`)
```env
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
OPENAI_API_KEY=sk-proj-your-api-key-here
NOVA_PROJECT_ROOT=C:/path/to/nova/project
NOVA_MCP_URL=https://your-canonical-nova-mcp-endpoint.railway.app/mcp
```

### Codex Connector V3 (`connector-v3/.env`)
**Gateway (Railway):**
```env
PORT=3000
DATABASE_URL=postgres://user:password@host:port/dbname
MCP_BEARER_TOKEN_HASH=sha256_hex_verifier_for_chatgpt
WORKER_TOKEN_HASH=sha256_hex_verifier_for_worker
```

**Worker (Local Windows):**
```env
GATEWAY_URL=wss://your-gateway-domain.railway.app/worker
WORKER_TOKEN=raw_secret_matching_worker_token_hash
NOVA_PROJECT_ROOT=C:/path/to/nova/project
```

---

## 4. Unified Tool Contracts

### 4.1 Codex V3 Tools
- **`codex_project_status`**:
  - *Arguments*: None.
  - *Behavior*: Read-only project health & workspace inspection. Fails if worker heartbeat is older than 15 seconds.
- **`codex_ask`**:
  - *Arguments*: `prompt` (string), `session_id` (optional UUID), `timeout_seconds` (optional 10-3600).
  - *Behavior*: Read-only analytical query executed via Codex CLI. Returns `structuredContent.session_id` for session continuation.
- **`codex_implement`**:
  - *Arguments*: `prompt` (string), `session_id` (optional UUID), `timeout_seconds` (optional), `request_id` (optional).
  - *Behavior*: Executes workspace modifications via Codex CLI (`workspace-write` mode). Deduplicates by principal, tool, and request ID.

### 4.2 Grok & Claude/ChatGPT Tools
- **`nova_mcp_probe`**:
  - *Arguments*: `action` (`initialize`, `tools/list`, `ping`).
  - *Behavior*: Probes the canonical Nova MCP endpoint with protocol-version headers and session handling.
- **File & Workspace Tools**:
  - Standard MCP file reading, searching (`grep_search`, `glob`), and diagnostic tools mapped through `NOVA_PROJECT_ROOT`.

---

## 5. Security Boundaries & Credential Management

1. **Zero Raw Secret Storage**: `.env` files are strictly excluded via `.gitignore`. Token verification relies on SHA-256 hex hashes (`MCP_BEARER_TOKEN_HASH`, `WORKER_TOKEN_HASH`) rather than plaintext secrets on the stateless gateway.
2. **Stateless Gateway Isolation**: The Railway gateway holds no project files and runs no local binaries; it purely routes WSS worker frames and MCP HTTP requests.
3. **Worker Sandbox & Generation Fencing**: The Windows worker confines execution to `NOVA_PROJECT_ROOT`. Worker generations fence stale sockets and prevent concurrent conflicting writes.
4. **Read-Only vs. Write Enforcement**: Reviewers (Grok, Claude review modes, `codex_ask`) operate strictly in read-only boundaries. Implementation jobs (`codex_implement`) require explicit `workspace-write` authorization and transaction leasing.

---

## 6. Multi-Model Handoff & Review Workflow

1. **Initialization & Probing**: The client initiates a session using `nova_mcp_probe` against the canonical Nova MCP endpoint.
2. **Analytical Consultation (Grok / Claude / ChatGPT)**: The primary model inspects code using `codex_ask` or file tools, producing architectural assessments and plans.
3. **Session Continuation**: The model passes `session_id` across turns to maintain conversational context.
4. **Execution & Implementation (Codex Worker)**: Implementation tasks are dispatched via `codex_implement`. The gateway leases the job to the local Windows worker, which executes the change within the workspace sandbox and writes results back through the WSS tunnel.
5. **Peer Review**: Grok performs a final read-only peer review on the modified files to ensure compliance with project standards before task completion.
