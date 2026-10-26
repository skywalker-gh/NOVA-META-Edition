# Connector 3000 V3: durable ChatGPT-to-local-Codex bridge

**Status:** Design approved in chat; implementation plan awaiting user review  
**Date:** 2026-10-07  
**Scope:** Replace the failing ChatGPT Secure MCP Tunnel path while retaining local Codex CLI execution.

## Context and verified findings

- The installed Codex Connector 3000 exposes local MCP over `stdio`.
- ChatGPT tool registration succeeds, but calls currently fail before dispatch with Secure MCP Tunnel SSE probe responses `404` or `429`.
- The Nova V2 workspace folder is not a Git checkout. A private GitHub repository `skywalker-gh/nova-v2-ygdrassil` is available and documents a Streamable HTTP MCP endpoint for the Gemini role.
- The current Railway account connection lists no projects.
- The repository's Trinity contract requires one Canonical MCP server and treats changes to authentication, security boundaries, and central MCP interfaces as R2 work.

The failure is in the managed tunnel path. A local stdio change cannot repair that remote service. V3 removes that tunnel from the request path by giving ChatGPT a directly reachable HTTPS MCP endpoint.

## Goals

1. ChatGPT can discover and call `codex_project_status`, `codex_ask`, and `codex_implement` through a public HTTPS MCP endpoint.
2. Codex execution remains on the user's Windows machine with the configured project root as its working directory; reads may include any files available to that Windows account unless a supported OS boundary is separately enforced.
3. The local worker needs no inbound firewall rule or public machine address.
4. Gateway and worker recover from routine disconnects and rate limits without retry storms or duplicate writes.
5. Preserve read-only defaults, explicit write dispatch, session continuation, project-root enforcement, and provenance.
6. Expose health and readiness information sufficient to distinguish gateway, worker, queue, and Codex CLI failures.

## Non-goals

- Rebuild Nova V2 or change its application behavior.
- Run Codex on Railway or copy the user's project to a public host.
- Replace the repository's Canonical MCP server or create a second source of project truth.
- Promise availability while the user's Windows machine is offline, asleep, or disconnected.
- Repair OpenAI's managed tunnel service itself.

## Architecture

```text
ChatGPT custom MCP connection
          │ HTTPS / Streamable HTTP
          ▼
V3 gateway (Railway, stateless MCP handlers)
          │ durable job rows and result rows
          ▼
PostgreSQL (job state, leases, worker presence)
          ▲
          │ authenticated outbound WSS worker connection
          │ heartbeat, job delivery, result acknowledgement
Windows worker ── stdio ── Codex CLI ── configured local project
```

The gateway serves MCP over Streamable HTTP, not legacy two-endpoint SSE. MCP requests are stateless at the transport layer; application job IDs and Codex `session_id` values carry the state that must survive HTTP requests and gateway restarts. The worker maintains one authenticated outbound WebSocket connection, sends heartbeats, and reconnects with capped exponential backoff and jitter. A database lease and monotonically increasing worker generation fence off stale workers after reconnects. The project root is set as Codex's working directory and connector-controlled paths are canonicalized, but legacy native Windows Codex sandbox modes do not guarantee read isolation from other files accessible to the logged-in Windows account.

The gateway and worker are separate processes with narrow responsibilities. The public gateway necessarily receives MCP tool arguments and the result returned for an authorized tool call, but it receives no filesystem access, Codex credentials, or direct project checkout. The worker executes commands only in the configured root and retains Codex's sandbox policy. V3 is an execution bridge for Codex, not a replacement or second source of truth for Nova's Canonical MCP.

## Request and job lifecycle

1. ChatGPT sends an authenticated MCP tool request to `/mcp`.
2. The gateway validates the caller and tool schema, creates a durable job row, and waits for its terminal result within the caller's configured timeout.
3. The worker claims a job under a short lease and records its worker generation before dispatching to the Codex CLI.
4. The worker returns the structured result and acknowledges the job. The gateway replies with the existing tool result shape, including `session_id` where available.
5. If the HTTP caller disconnects, the gateway does not silently enqueue a second execution. The job continues to a terminal state. The gateway deduplicates implementation calls using the authenticated caller and an explicit `request_id`, or, when absent, a deterministic digest of the caller, tool, project/session, prompt, and timeout. A deliberate forced rerun can supply a new `request_id`; an identical retry attaches to the existing job/result.

Write jobs are never automatically replayed after an uncertain worker crash. They become `indeterminate` and require a status lookup or a deliberate new user request. Read-only jobs may be safely retried under a new attempt after lease expiry. Jobs for the same Codex `session_id` execute serially; independent sessions may run concurrently within a small configured cap. Delivery is at-least-once at the queue boundary, while worker claim, idempotency, generation fencing, and the no-replay rule for uncertain writes prevent silent duplicate implementation runs.

## Authentication and authorization

- ChatGPT-to-gateway authentication uses the supported custom MCP connection authentication mode; prefer OAuth if the connection setup supports it. A per-user bearer token is an acceptable first deployment only if ChatGPT can securely store and send it.
- Worker-to-gateway authentication uses a distinct, revocable worker credential. Store only a verifier/hash in PostgreSQL; never log credentials.
- Use TLS for HTTPS and WSS. Reject unregistered workers, expired credentials, invalid origins where applicable, malformed JSON-RPC, and oversized requests.
- Bind the worker to one configured `NOVA_PROJECT_ROOT` as its working directory; canonicalize connector-controlled paths and reject traversal or symlink escape. This does not constrain arbitrary model-generated reads under legacy native Windows sandbox modes.
- Enforce operation policy server-side: status/ask are read-only; implement uses workspace-write only and never requests danger-full-access.
- Redact secrets from CLI output and logs. Retain prompts and results only until the caller retrieves the terminal result or for at most 24 hours; retain sanitized job metadata without prompt/result bodies for 30 days for diagnostics. Never persist tokens or environment variable values.

## Failure handling

| Condition | Required behavior |
|---|---|
| Worker offline | Fail fast with a clear unavailable response; do not build an unbounded queue. |
| WSS disconnect | Close the old socket, reconnect with exponential backoff, jitter, and a cap; only one active generation may claim jobs. |
| Gateway HTTP 429 | Honor `Retry-After`; otherwise use bounded exponential backoff with jitter. Do not create parallel probes. |
| Gateway 5xx / network error | Reconnect with bounded backoff; preserve only jobs already durably accepted. |
| MCP invalid request/version | Return a protocol-level error; do not retry unchanged requests. |
| Job lease expires during read-only work | Reassign after fencing the previous worker generation. |
| Worker disappears during implementation | Mark the outcome indeterminate; never automatically rerun the write. |
| Codex CLI missing or spawn denied | Return a typed execution error with a diagnostic code; do not report transport success as task success. |
| ChatGPT request timeout/disconnect | Keep durable job state; use idempotency key and status retrieval to avoid re-execution. |

Every retry policy has finite attempts or a time budget. Health probes are low-frequency, share one connection lifecycle, and never launch Codex jobs. Logs include correlation/job IDs and sanitized error metadata, not tokens or project secrets.

## Hosting and operations

- Deploy the gateway as an HTTPS Railway service and use Railway PostgreSQL for durable queue state. The current Railway account has no existing project, so project/database provisioning is a later explicit deployment step.
- Keep the gateway horizontally stateless; PostgreSQL coordinates jobs and leases. Worker count defaults to one for this personal connector.
- Configure readiness to require database access; liveness must not depend on the local worker. Expose a sanitized worker-online status to report availability.
- Set deployment health checks, graceful shutdown, connection draining, bounded request bodies, database timeouts, and a single documented MCP URL.
- Keep secrets in host-managed environment variables. No credentials go into the repository, manifests, screenshots, or logs.

## Compatibility

- Keep the three current tool names and their core behavior.
- Keep `session_id` as the Codex CLI continuation identifier, bound to the configured project root.
- Add optional `request_id`/idempotency metadata without making current read-only calls incompatible. Without an explicit ID, derive a stable digest for identical `codex_implement` requests so a retry can attach to the original job instead of dispatching a duplicate.
- Return structured `status`, `success`, `errors`, `project_root`, `session_id`, and provenance fields consistently.
- The old local stdio connector may remain as a development fallback, but V3 ChatGPT setup uses the public `/mcp` endpoint directly.

## Verification criteria

1. MCP initialize (when negotiated by the client), `tools/list`, `ping`, and all three tool schemas pass protocol tests over HTTP.
2. A ChatGPT custom MCP connection can register the deployed `/mcp` endpoint and successfully call `codex_project_status` and a read-only `codex_ask` through the local worker.
3. A deliberate implementation smoke test runs only in the configured project root and returns a verifiable session ID/result; repeat delivery with the same idempotency key does not dispatch twice.
4. Simulated worker disconnect/reconnect leaves one active worker generation and resumes eligible queued jobs without a connection storm.
5. 429 honors `Retry-After`; missing header uses capped exponential backoff with jitter; 404 and invalid MCP responses fail clearly without retry loops.
6. Gateway restart preserves accepted jobs/results; worker crash during a write produces `indeterminate` and no automatic second execution.
7. Offline worker, missing Codex CLI, denied process spawn, wrong project root, expired token, and database failure return typed and sanitized errors.
8. No Nova application files change as part of the connector implementation.

## Alternatives considered

- **Keep the current stdio plugin and tunnel:** smallest change, but the failing managed SSE probe remains in the path; rejected for the recovery objective.
- **Run Codex on Railway:** simpler public MCP connection but changes the execution target and requires copying or cloning the project to the host; rejected because the goal is local Codex.
- **Public stateless MCP gateway plus local outbound worker (selected):** bypasses the failing tunnel while retaining local execution; adds a small gateway, worker, durable queue, and operational credentials.

## References

- OpenAI MCP server quickstart, including Streamable HTTP and connecting a public `/mcp` endpoint in ChatGPT: <https://developers.openai.com/plugins/build/app-quickstart>
- MCP TypeScript SDK v2 server guide, including Streamable HTTP and stateless server patterns: <https://ts.sdk.modelcontextprotocol.io/v2/>
- MCP transport specification (current version): <https://modelcontextprotocol.io/specification/2026-07-28/basic/transports>
- Official TypeScript SDK v2 migration and 2026-07-28 protocol support notes: <https://ts.sdk.modelcontextprotocol.io/v2/migration/support-2026-07-28>
- Nova V2 Ygdrassil repository and its existing Gemini Streamable HTTP contract: <https://github.com/skywalker-gh/nova-v2-ygdrassil>

## Known limitations and implementation decisions

- Railway project provisioning and ChatGPT custom MCP registration require account/UI setup not represented in the local workspace. Deployment cannot be called complete until a public endpoint is live and ChatGPT connects to it.
- The current Nova V2 local folder is not a Git checkout. V3 will be developed under a dedicated `connector-v3/` directory in this workspace. Publishing or committing it to the private GitHub repository is a separate step; this design document does not authorize a remote repository mutation.
- Availability of local Codex operations is bounded by the Windows worker machine's uptime and internet connection.
- Strict read isolation from files outside `NOVA_PROJECT_ROOT` is not verified on native Windows. The current Codex CLI legacy `read-only` sandbox may permit reads across the Windows account's accessible filesystem; use only with a trusted caller and resolve this boundary before public deployment.
- The repository's R2 review workflow calls for independent Grok and Gemini reviews before changes to security boundaries and MCP interfaces. Those reviews are not available as tools in this chat; on 2026-10-07 the Human Authority explicitly authorized implementation without them. They remain not conducted and must not be represented as completed.
- This workspace has no `.git` repository, so the specification cannot be committed here. It is saved as a reviewable workspace artifact.
