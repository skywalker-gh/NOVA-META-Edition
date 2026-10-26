import { McpServer } from '@modelcontextprotocol/server';
import { createMcpHandler as createMcpSdkHandler } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { verifyMcpCaller } from './auth.js';
import { JobError } from './job-service.js';

const TOOL_NAMES = ['codex_project_status', 'codex_ask', 'codex_implement'];
const promptSchema = z.object({
  prompt: z.string().min(1).max(100_000),
  session_id: z.string().uuid().optional(),
  timeout_seconds: z.number().int().min(10).max(3600).optional()
}).strict();
const implementSchema = promptSchema.extend({
  request_id: z.string().min(1).max(200).optional()
}).strict();

export function createMcpHandler({ jobService, tokenVerifier }) {
  const handler = createMcpSdkHandler(({ authInfo }) => {
    const server = new McpServer({ name: 'codex-connector-3000-v3', version: '3.0.0' });
    const principal = authInfo?.clientId || 'chatgpt';

    server.registerTool('codex_project_status', {
      description: 'Inspect the configured local Codex project without making changes.',
      inputSchema: {}
    }, async (_input, extra) => runTool('codex_project_status', {}, principal, jobService, extra));

    server.registerTool('codex_ask', {
      description: 'Ask Codex to inspect or explain the configured project. Read-only.',
      inputSchema: promptSchema
    }, async (input, extra) => runTool('codex_ask', {
      prompt: input.prompt, session_id: input.session_id, timeout_seconds: input.timeout_seconds
    }, principal, jobService, extra));

    server.registerTool('codex_implement', {
      description: 'Ask Codex to make an explicitly requested minimal project change.',
      inputSchema: implementSchema
    }, async (input, extra) => runTool('codex_implement', {
      prompt: input.prompt, session_id: input.session_id, timeout_seconds: input.timeout_seconds,
      request_id: input.request_id
    }, principal, jobService, extra));
    return server;
  }, { legacy: 'stateless', responseMode: 'json', maxRequestBodySize: 128 * 1024, onerror: () => {} });

  return {
    async fetch(request) {
      let principal;
      try { principal = await verifyMcpCaller(request, tokenVerifier); }
      catch { return Response.json({ error: 'Unauthorized' }, { status: 401, headers: { 'www-authenticate': 'Bearer' } }); }
      const authInfo = { token: 'validated', clientId: principal.id, scopes: [] };
      return handler.fetch(request, { authInfo });
    },
    close: () => handler.close()
  };
}

async function runTool(tool, payload, principal, jobService, extra) {
  try {
    const worker = await jobService.store.getWorkerStatus('local-worker');
    if (!worker.online) return toolError('worker_offline', 'The local Codex worker is offline.');
    const job = await jobService.submit({
      principal, tool, payload, sessionId: payload.session_id ?? null,
      timeoutSeconds: payload.timeout_seconds ?? 300, requestId: payload.request_id
    });
    const result = await jobService.waitForResult(job.id, (payload.timeout_seconds ?? 300) * 1000, extra?.signal);
    if (result.state !== 'completed') return toolError(result.error?.code || result.state, result.error?.message || 'The Codex job did not complete.');
    return result.result;
  } catch (error) {
    if (error instanceof JobError) return toolError(error.code, error.message);
    return toolError('internal_error', 'The connector could not complete this request.');
  }
}

function toolError(code, message) {
  const safeError = { code, message };
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify({ status: 'error', success: false, errors: [safeError] }) }],
    structuredContent: { status: 'error', success: false, errors: [safeError], session_id: null,
      provenance: { source: 'chatgpt-mcp', executor: 'local-codex-cli' } }
  };
}

// Keep tool names exported so the public names can be pinned in compatibility checks.
export { TOOL_NAMES };

