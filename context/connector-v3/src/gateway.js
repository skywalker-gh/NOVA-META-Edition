import { createServer } from 'node:http';
import pg from 'pg';
import { WebSocketServer, WebSocket } from 'ws';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { loadGatewayConfig } from './config.js';
import { createTokenVerifier } from './auth.js';
import { JobStore } from './job-store.js';
import { JobService } from './job-service.js';
import { createMcpHandler } from './mcp-server.js';

const config = loadGatewayConfig();
const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 8, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
const store = new JobStore(pool);
const jobs = new JobService(store);
const mcp = createMcpHandler({ jobService: jobs, tokenVerifier: createTokenVerifier(config.mcpTokenHash) });
const mcpNodeHandler = toNodeHandler(mcp);

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health/live' && req.method === 'GET') return sendJson(res, 200, { status: 'ok' });
  if (url.pathname === '/health/ready' && req.method === 'GET') {
    try { await pool.query('SELECT 1'); return sendJson(res, 200, { status: 'ready' }); }
    catch { return sendJson(res, 503, { status: 'unavailable', component: 'database' }); }
  }
  if (url.pathname === '/health/worker' && req.method === 'GET') {
    try { return sendJson(res, 200, await store.getWorkerStatus('local-worker')); }
    catch { return sendJson(res, 503, { online: false, error: 'status_unavailable' }); }
  }
  if (url.pathname === '/mcp') return mcpNodeHandler(req, res);
  return sendJson(res, 404, { error: 'not_found' });
});

const workerSockets = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024, perMessageDeflate: false });
server.on('upgrade', async (req, socket, head) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname !== '/worker') return socket.destroy();
  const bearer = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '');
  const principal = bearer ? await createTokenVerifier(config.workerTokenHash, 'local-worker')(bearer[1]) : null;
  if (!principal) return socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
  workerSockets.handleUpgrade(req, socket, head, ws => workerSockets.emit('connection', ws, req));
});

workerSockets.on('connection', async ws => {
  let generation;
  try {
    generation = await store.registerWorker('local-worker');
    for (const other of workerSockets.clients) if (other !== ws && other.readyState === WebSocket.OPEN) other.close(4001, 'replaced by newer worker generation');
    ws.send(JSON.stringify({ version: 1, type: 'ready', worker_id: 'local-worker', generation }));
  } catch {
    ws.close(1011, 'temporarily unavailable');
    return;
  }
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  const activeJobs = new Set();
  const claim = async () => {
    if (ws.readyState !== WebSocket.OPEN) return;
    while (activeJobs.size < 2 && ws.readyState === WebSocket.OPEN) {
      let job;
      try { job = await store.claimNext('local-worker', generation, 60_000); }
      catch { ws.close(1011, 'claim unavailable'); return; }
      if (!job) return;
      activeJobs.add(job.id);
      ws.send(JSON.stringify({ version: 1, type: 'job', worker_id: 'local-worker', job: { id: job.id, tool: job.tool, payload: job.payload, session_id: job.sessionId, generation } }));
    }
  };
  const heartbeat = setInterval(() => {
    if (ws.isAlive === false) { ws.terminate(); return; }
    ws.isAlive = false;
    ws.ping();
    store.workerHeartbeat('local-worker', generation).catch(() => {});
    claim();
  }, 5000);
  heartbeat.unref?.();
  ws.on('message', async data => {
    if (data.length > 1024 * 1024) return ws.close(1009, 'message too large');
    let message;
    try { message = JSON.parse(data.toString()); } catch { return ws.close(1007, 'invalid JSON'); }
    if (message.version !== 1 || message.worker_id !== 'local-worker' || (message.generation !== undefined && Number(message.generation) !== generation)) {
      return ws.close(1008, 'invalid worker envelope');
    }
    try {
      if (message.type === 'heartbeat') {
        await store.workerHeartbeat('local-worker', generation);
        ws.send(JSON.stringify({ version: 1, type: 'heartbeat_ack', worker_id: 'local-worker', generation }));
      } else if (message.type === 'claim') {
        await claim();
      } else if (message.type === 'running' && typeof message.job_id === 'string') {
        await store.setRunning(message.job_id, generation);
      } else if (message.type === 'complete' && typeof message.job_id === 'string') {
        await store.complete(message.job_id, generation, message.result);
        activeJobs.delete(message.job_id);
        ws.send(JSON.stringify({ version: 1, type: 'ack', worker_id: 'local-worker', generation, job_id: message.job_id }));
        claim();
      } else if (message.type === 'fail' && typeof message.job_id === 'string') {
        await store.fail(message.job_id, generation, message.error, message.terminal !== false);
        activeJobs.delete(message.job_id);
        ws.send(JSON.stringify({ version: 1, type: 'ack', worker_id: 'local-worker', generation, job_id: message.job_id }));
        claim();
      } else ws.close(1008, 'unsupported message');
    } catch {
      // Never send database diagnostics or user data across the worker boundary.
      ws.send(JSON.stringify({ version: 1, type: 'error', worker_id: 'local-worker', generation, code: 'stale_or_unavailable' }));
    }
  });
  ws.on('close', () => {
    clearInterval(heartbeat);
    store.disconnectWorker('local-worker', generation).catch(() => {});
  });
  claim();
});

server.headersTimeout = 10_000;
server.requestTimeout = 3_700_000;
await store.migrate();
server.listen(config.port, config.host, () => console.log(`Connector 3000 V3 gateway listening on ${config.port}`));
const maintenance = setInterval(() => {
  jobs.markExpiredLeases().catch(() => {});
  store.purgeExpiredBodies().catch(() => {});
  store.purgeExpiredMetadata().catch(() => {});
}, 10_000);
maintenance.unref?.();

let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  clearInterval(maintenance);
  server.close();
  for (const ws of workerSockets.clients) ws.close(1001, 'gateway shutting down');
  await mcp.close();
  await pool.end();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}
