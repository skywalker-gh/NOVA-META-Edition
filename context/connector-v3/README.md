# Codex Connector 3000 V3

V3 replaces the managed Secure MCP Tunnel SSE path with a stateless Streamable HTTP MCP gateway and one authenticated outbound WSS worker. Codex still runs locally on Windows with the configured project root as its working directory. Nova V2 application files are not changed.

**Security limitation:** current native Windows Codex CLI legacy `read-only` / `workspace-write` modes do not prove that reads are confined to `NOVA_PROJECT_ROOT`. V3 validates the working root and confines writes through Codex's workspace sandbox, but must not be exposed to untrusted callers until a supported Windows read boundary is verified on the worker host. See [operations security notes](docs/operations.md#filesystem-boundary).

## Local development

Requirements: Node.js 22+, a PostgreSQL database, and Codex CLI available on `PATH`.

```powershell
Copy-Item .env.example .env
# Edit .env. Set secrets in the current PowerShell session or load them from a protected local secret store.
npm ci
npm test
npm run test:integration
```

The gateway requires `PORT`, `DATABASE_URL`, `MCP_BEARER_TOKEN_HASH`, and `WORKER_TOKEN_HASH`. The worker requires `GATEWAY_URL`, `WORKER_TOKEN`, and `NOVA_PROJECT_ROOT`. `.env` is ignored by Git; the application does not automatically parse it. Set environment variables in the process launcher that starts each service.

Generate a token and verifier locally without printing the token into a repository file:

```powershell
$bytes = [byte[]]::new(32)
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$token = [Convert]::ToBase64String($bytes)
$sha = [Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($token))
$hash = [Convert]::ToHexString($sha).ToLowerInvariant()
```

Keep the raw worker token only on the Windows worker and in Railway's secret variable store; configure its SHA-256 verifier as `WORKER_TOKEN_HASH`. Configure the separate MCP bearer token in ChatGPT and its verifier as `MCP_BEARER_TOKEN_HASH`. Never commit either raw token or verifier.

## Deploy the gateway

1. Create a Railway project with a PostgreSQL service and a gateway service built from this directory.
2. Set `DATABASE_URL` to the PostgreSQL service reference. Set `PORT` to `3000` and configure both token hash variables.
3. Deploy the gateway and generate an HTTPS domain. Readiness is `/health/ready`; liveness is `/health/live`.
4. Set the local worker's `GATEWAY_URL` to `wss://<domain>/worker` and launch `npm run start:worker` in a logged-in Windows session.
5. Register `https://<domain>/mcp` as a custom MCP connector in ChatGPT with bearer authentication. The exact authentication options depend on the ChatGPT connector setup available to the account.

The gateway does not receive the user's project files or run Codex. If the Windows host is asleep or the worker is stopped, tools return `worker_offline`.

## Tool contract

- `codex_project_status`: no arguments; read-only project inspection.
- `codex_ask`: `prompt`, optional UUID `session_id`, optional `timeout_seconds` from 10 to 3600; read-only.
- `codex_implement`: same fields plus optional `request_id`; uses `workspace-write` only.

Successful results include `structuredContent.session_id` for continuing the Codex session. Status and ask calls never run when the worker heartbeat is older than 15 seconds. A busy queue rejects new jobs after 10 pending or running jobs.

## Recovery and rate limits

The worker makes one WSS connection, sends heartbeats every five seconds, and reconnects with bounded jittered exponential backoff (500 ms base, 30 s cap). It honors HTTP 429 `Retry-After` with positive jitter and stops retrying on 401/404 until credentials or endpoint configuration are corrected. It does not launch overlapping health probes. A worker generation fences stale sockets and result writes.

PostgreSQL leases make queued work recoverable. Read-only jobs may be retried after an expired lease. Implementation jobs with an uncertain outcome become `indeterminate` and are never automatically replayed. Jobs deduplicate by principal, tool, and request id or a deterministic digest. Prompt/result bodies are purged after 24 hours; sanitized job metadata expires after 30 days.

See [docs/operations.md](docs/operations.md) for credential rotation, recovery, and health diagnostics.
