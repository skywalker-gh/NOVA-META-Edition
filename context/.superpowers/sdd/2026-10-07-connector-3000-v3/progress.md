# SDD ledger — plan: docs/superpowers/plans/2026-10-07-connector-3000-v3.md

Ruling: No Git checkout or worktree exists for Nova V2 — implement only inside the approved isolated `connector-v3/` directory and keep plan artifacts in this workspace — cost if wrong: changes cannot be reviewed through Git history until the project is linked to a repository.

Ruling: Human Authority explicitly authorized implementation on 2026-10-07 without the unavailable Grok/Gemini reviews required by the repository's R2 workflow — proceed, but disclose reviews were not conducted — cost if wrong: independent review may identify security or protocol issues before public deployment.

Pre-flight: Task 1 produces gateway/worker config and project-root validation; Tasks 2–5 consume those settings. Interfaces reviewed: gateway config owns `PORT`, `DATABASE_URL`, and token hashes; worker config owns `GATEWAY_URL`, `WORKER_TOKEN`, `NOVA_PROJECT_ROOT`, and `CODEX_BIN`; root resolution is asynchronous to check symlinks.
Pre-flight: Task 2 produces `JobStore` and `JobService`; Task 3 consumes `JobService` to implement MCP tool calls; Task 4 consumes `JobStore` to claim/fence jobs; Task 5 consumes job envelopes and completion APIs. Keep the interfaces and terminal job states consistent.
Pre-flight: Task 4 produces authenticated WSS job envelopes/generation fencing; Task 5 consumes those envelopes and completes jobs only for the active generation. Reviewed and consistent.
Pre-flight: Task 5 produces the local worker executable and task 6 packages it with the gateway. No Nova backend interfaces are changed.

Task 1: in progress

Task 1–5: local implementation present; fresh unit suite passed 32 tests with 0 failures. PostgreSQL integration tests skipped because TEST_DATABASE_URL is unavailable; gateway not run end-to-end.

Task 6: local Docker/Railway/operations artifacts present. No Railway project, Docker executable, local PostgreSQL, or registered V3 ChatGPT endpoint. Deployment and live MCP status/ask smoke not complete. Native Windows Codex read-only mode does not establish an out-of-root read boundary; current machine is Windows 10 Home and elevated sandbox enforcement is unverified. A known upstream Windows issue reports :root=deny failing to prevent out-of-root reads on CLI 0.152.0; do not expose service to untrusted callers.

Security fixes from local reviewer: worker generation fencing for lease renewal, abort queued/running jobs on socket close, wait for child close, abort reconnect wait on shutdown, typed MCP output contract, bounded 2-job gateway dispatch. Grok/Gemini reviews not conducted per explicit human authorization.
