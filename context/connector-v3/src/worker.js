import WebSocket from 'ws';
import { loadWorkerConfig } from './config.js';
import { runCodexJob, CodexRunError } from './codex-runner.js';
import { SessionQueue } from './session-queue.js';
import { computeReconnectDelay, parseRetryAfter, shouldStopRetry, sleepWithSignal } from './retry-policy.js';

const config = loadWorkerConfig();
const workerToken = config.workerToken;
let stopping = false;
let activeSocket = null;
const stopController = new AbortController();

function stopWorker() {
  stopping = true;
  stopController.abort();
  activeSocket?.close(1001, 'worker stopping');
}
process.once('SIGINT', stopWorker);
process.once('SIGTERM', stopWorker);

let failures = 0;
while (!stopping) {
  const outcome = await connectOnce().catch(() => ({}));
  if (outcome.permanent) { stopping = true; break; }
  if (stopping) break;
  failures++;
  await sleepWithSignal(computeReconnectDelay({ attempt: failures, retryAfterMs: outcome.retryAfterMs }), stopController.signal);
}

async function connectOnce() {
  return new Promise(resolve => {
    const socket = new WebSocket(config.gatewayUrl, {
      headers: { authorization: `Bearer ${workerToken}` },
      handshakeTimeout: 15_000, maxPayload: 1024 * 1024, perMessageDeflate: false
    });
    activeSocket = socket;
    let connectedAt = 0;
    let generation = null;
    const activeJobs = new Set();
    const jobControllers = new Map();
    const ackResolvers = new Map();
    const sessionQueue = new SessionQueue(2);
    const connectionController = new AbortController();
    let retryAfter = null;
    let permanent = false;
    socket.once('open', () => {
      connectedAt = Date.now();
      const heartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN && generation !== null) {
          socket.send(envelope('heartbeat', { generation }));
          socket.send(envelope('claim', { generation }));
        }
      }, 5000);
      heartbeat.unref?.();
      socket.once('close', () => clearInterval(heartbeat));
    });
    socket.on('unexpected-response', (_request, response) => {
      if (response.statusCode === 429) retryAfter = parseRetryAfter(response.headers['retry-after']);
      if (shouldStopRetry(response.statusCode)) {
        permanent = true;
        console.warn(`Connector rejected worker connection with HTTP ${response.statusCode}; fix the endpoint or worker credential.`);
      }
      response.resume();
    });
    socket.on('message', data => {
      let message;
      try { message = JSON.parse(data.toString()); } catch { return socket.close(1007, 'invalid server message'); }
      if (message.version !== 1 || message.worker_id !== 'local-worker') return socket.close(1008, 'invalid gateway envelope');
      if (message.type === 'ready' && Number.isSafeInteger(message.generation)) {
        generation = message.generation;
        socket.send(envelope('claim', { generation }));
      }
      if (message.type === 'job' && generation === message.job?.generation && !activeJobs.has(message.job?.id)) {
        activeJobs.add(message.job.id);
        const jobController = new AbortController();
        jobControllers.set(message.job.id, jobController);
        connectionController.signal.addEventListener('abort', () => jobController.abort(), { once: true });
        sessionQueue.run(message.job.session_id || null, () => executeJob(socket, message.job, jobController.signal), { signal: jobController.signal })
          .catch(() => socket.close(1011, 'job dispatch failed'))
          .finally(() => { activeJobs.delete(message.job.id); jobControllers.delete(message.job.id); });
      }
      if (message.type === 'ack' && ackResolvers.has(message.job_id)) {
        ackResolvers.get(message.job_id)();
        ackResolvers.delete(message.job_id);
      }
    });
    socket.once('error', () => {});
    socket.once('close', () => {
      connectionController.abort();
      if (activeSocket === socket) activeSocket = null;
      if (connectedAt && Date.now() - connectedAt > 30_000) failures = 0;
      for (const done of ackResolvers.values()) done();
      resolve({ retryAfterMs: retryAfter, permanent });
    });

    async function executeJob(ws, job, signal) {
      if (!job?.id || job.generation !== generation || signal.aborted || ws.readyState !== WebSocket.OPEN) return;
      ws.send(envelope('running', { generation, job_id: job.id }));
      try {
        const result = await runCodexJob(job, config, { signal });
        await sendAndWait(ws, envelope('complete', { generation, job_id: job.id, result }), job.id);
      } catch (error) {
        if (signal.aborted || ws.readyState !== WebSocket.OPEN || generation !== job.generation) return;
        const code = error instanceof CodexRunError ? error.code : 'codex_failed';
        const uncertainWrite = job.tool === 'codex_implement';
        const indeterminate = uncertainWrite;
        await sendAndWait(ws, envelope('fail', { generation, job_id: job.id, terminal: indeterminate || code !== 'timeout', error: { code, message: 'Codex could not complete this request.', indeterminate }, result: {
          status: indeterminate ? 'indeterminate' : 'failed', success: false, summary: 'Codex could not complete this request.', project_root: config.projectRoot,
          session_id: job.session_id || null, errors: [{ code, message: 'Codex could not complete this request.' }], changed_files: [], tests: [],
          provenance: { source: 'chatgpt-mcp', executor: 'local-codex-cli', tool: job.tool, job_id: job.id }
        } }), job.id);
      }
    }

    function sendAndWait(ws, message, jobId) {
      return new Promise(resolveAck => {
        if (ws.readyState !== WebSocket.OPEN) return resolveAck();
        const timeout = setTimeout(() => { ackResolvers.delete(jobId); resolveAck(); }, 5000);
        timeout.unref?.();
        ackResolvers.set(jobId, () => { clearTimeout(timeout); resolveAck(); });
        ws.send(JSON.stringify(message));
      });
    }

    function envelope(type, fields = {}) { return { version: 1, type, worker_id: 'local-worker', ...fields }; }
  });
}
