# Operations and recovery

## Filesystem boundary

`NOVA_PROJECT_ROOT` is canonicalized and used as the Codex working directory. The worker rejects path escapes in connector-controlled paths, and Codex uses read-only mode for status/ask and workspace-write for implement. On native Windows, Codex CLI's legacy modes do not establish a strict read boundary: a model-generated shell command may read other files accessible to the logged-in Windows account. Therefore use this bridge only with a trusted ChatGPT caller and a dedicated Windows account containing only the project data it may read. Do not claim project-only read isolation until Codex documents and verifies a supported boundary on the actual worker host.

The known Windows elevated-sandbox report shows an explicit `:root = "deny"` profile still allowing out-of-root reads on Codex CLI 0.152.0. This machine's `codex doctor --json` reports Windows 10 Home and does not confirm elevated sandbox enforcement, so a custom-profile workaround is not considered verified.

## Health signals

- `GET /health/live`: process is serving HTTP.
- `GET /health/ready`: PostgreSQL is reachable.
- `GET /health/worker`: reports only whether the local worker heartbeat is fresh (15 seconds), its generation, and last-seen time.
- MCP `worker_offline`: gateway and authentication succeeded, but no current worker heartbeat is available.
- MCP `busy`: the ten-job queue limit was reached.

The gateway's MCP route is stateless Streamable HTTP. It opens no long-lived MCP SSE session and does not poll the managed Secure MCP Tunnel. Only the Windows worker owns one reconnecting WSS connection.

## 429 and reconnect behavior

For a WebSocket handshake HTTP 429, the worker honors `Retry-After` (seconds or HTTP date), adds up to one second of positive jitter, and caps the wait at five minutes. Without that header, waits use full-jitter exponential backoff from 500 ms to 30 seconds. Temporary network failures and 5xx retry. HTTP 401/404 stop the worker so a bad token or URL does not produce a reconnect storm; inspect the process output, correct the setting, then restart it. There are no parallel probes or fallback SSE connections.

## Credential rotation

Generate a new MCP token and worker token independently. Update the hashes in Railway and the corresponding raw token in ChatGPT or the local Windows worker. Restart/redeploy affected processes, verify `/health/ready` and `/health/worker`, then revoke the old tokens. Never put raw tokens in deployment logs or source control.

## Uncertain implementation jobs

If the worker disappears after starting `codex_implement`, the job becomes `indeterminate` when its lease expires. Do not automatically rerun it. Inspect the local project and Codex session to determine whether the requested change occurred, then submit a deliberate new request with a new `request_id` if needed. Read-only work can be retried safely.

## Database retention and backups

Prompt, payload, result, and error bodies are nulled after 24 hours. Job metadata is retained for at most 30 days. Configure Railway PostgreSQL backups/retention according to the workspace plan; database backups may contain job bodies until expiry runs, so protect backup access and retention accordingly. The worker's Codex session files remain on the Windows host and follow its local Codex retention settings.

## Local Windows worker

Run from this directory with `GATEWAY_URL`, `WORKER_TOKEN`, and `NOVA_PROJECT_ROOT` in its environment. Keep the session logged in and prevent sleep if continuous availability is required. Restart on boot using the organization's normal Windows service/task mechanism and a protected secret store; do not put a bearer token in a checked-in script. A sleeping or offline PC makes the local Codex tools unavailable by design.
