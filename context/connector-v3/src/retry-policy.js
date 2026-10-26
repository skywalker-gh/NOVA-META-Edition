export function computeReconnectDelay({ attempt, retryAfterMs, random = Math.random }) {
  if (retryAfterMs !== null && retryAfterMs !== undefined) {
    return Math.min(5 * 60_000, Math.max(0, retryAfterMs) + Math.round(random() * 1000));
  }
  const cap = Math.min(30_000, 500 * 2 ** Math.min(Math.max(0, attempt - 1), 16));
  return Math.max(250, Math.round(cap * random()));
}

export function shouldStopRetry(statusCode) {
  return statusCode === 401 || statusCode === 404;
}

export function parseRetryAfter(value, now = Date.now()) {
  if (!value) return null;
  const seconds = Number(value);
  const milliseconds = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now;
  return Number.isFinite(milliseconds) && milliseconds > 0 ? Math.min(milliseconds, 5 * 60_000) : null;
}

export function sleepWithSignal(ms, signal) {
  if (signal?.aborted) return Promise.resolve(false);
  return new Promise(resolve => {
    const timer = setTimeout(() => finish(true), ms);
    timer.unref?.();
    const onAbort = () => finish(false);
    function finish(completed) {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve(completed);
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
