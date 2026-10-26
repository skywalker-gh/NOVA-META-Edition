import test from 'node:test';
import assert from 'node:assert/strict';
import { createMcpHandler, TOOL_NAMES } from '../src/mcp-server.js';
import { createTokenVerifier, hashToken } from '../src/auth.js';

function mockJobs() {
  return {
    store: { async getWorkerStatus() { return { online: false }; } },
    async submit() { throw new Error('offline worker must never submit'); },
    async waitForResult() { throw new Error('offline worker must never wait'); }
  };
}

test('tool registration preserves the three deployed tool names', () => {
  assert.deepEqual(TOOL_NAMES, ['codex_project_status', 'codex_ask', 'codex_implement']);
});

test('unauthenticated MCP request is rejected before dispatch', async () => {
  const handler = createMcpHandler({ jobService: mockJobs(), tokenVerifier: createTokenVerifier(hashToken('valid')) });
  const response = await handler.fetch(new Request('https://connector.invalid/mcp', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
  }));
  assert.equal(response.status, 401);
});

test('authenticated stateless MCP endpoint lists all tools and preserves full offline error', async () => {
  const handler = createMcpHandler({ jobService: mockJobs(), tokenVerifier: createTokenVerifier(hashToken('valid')) });
  const response = await handler.fetch(new Request('https://connector.invalid/mcp', {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: 'Bearer valid' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
  }));
  assert.equal(response.status, 200);
  const wire = await response.text();
  const data = JSON.parse(wire.split('\n').find(line => line.startsWith('data: ')).slice(6));
  const names = data.result.tools.map(tool => tool.name).sort();
  assert.deepEqual(names, [...TOOL_NAMES].sort());
  const ask = data.result.tools.find(tool => tool.name === 'codex_ask');
  const implement = data.result.tools.find(tool => tool.name === 'codex_implement');
  assert.deepEqual(Object.keys(ask.inputSchema.properties).sort(), ['prompt', 'session_id', 'timeout_seconds']);
  assert.ok(implement.inputSchema.properties.request_id);
});

test('authenticated tool dispatch forwards the prompt and returns the Codex session id', async () => {
  let submitted;
  const jobs = {
    store: { async getWorkerStatus() { return { online: true }; } },
    async submit(input) { submitted = input; return { id: 'job-1' }; },
    async waitForResult() { return { state: 'completed', result: { content: [{ type: 'text', text: 'Done' }], structuredContent: { status: 'completed', success: true, summary: 'Done', session_id: '7dcf4acb-f140-4d8f-b877-916b26f051dc' } } }; }
  };
  const handler = createMcpHandler({ jobService: jobs, tokenVerifier: createTokenVerifier(hashToken('valid')) });
  const response = await handler.fetch(new Request('https://connector.invalid/mcp', {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: 'Bearer valid' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'codex_ask', arguments: { prompt: 'Inspect this function' } } })
  }));
  const wire = await response.text();
  const data = JSON.parse(wire.split('\n').find(line => line.startsWith('data: ')).slice(6));
  assert.equal(submitted.payload.prompt, 'Inspect this function');
  assert.equal(data.result.structuredContent.session_id, '7dcf4acb-f140-4d8f-b877-916b26f051dc');
  assert.equal(data.result.structuredContent.status, 'completed');
  assert.equal(data.result.structuredContent.success, true);
});

test('tool returns a typed offline error without enqueuing work', async () => {
  const handler = createMcpHandler({ jobService: mockJobs(), tokenVerifier: createTokenVerifier(hashToken('valid')) });
  const response = await handler.fetch(new Request('https://connector.invalid/mcp', {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: 'Bearer valid' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'codex_project_status', arguments: {} } })
  }));
  const wire = await response.text();
  const data = JSON.parse(wire.split('\n').find(line => line.startsWith('data: ')).slice(6));
  assert.equal(data.result.isError, true);
  assert.match(data.result.content[0].text, /worker_offline/);
  assert.equal(data.result.structuredContent.success, false);
  assert.equal(data.result.structuredContent.errors[0].code, 'worker_offline');
});
