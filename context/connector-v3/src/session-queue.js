import { randomUUID } from 'node:crypto';

export class SessionQueue {
  constructor(maxConcurrency = 2) {
    this.maxConcurrency = maxConcurrency;
    this.active = 0;
    this.tails = new Map();
    this.waiting = [];
    this.acquired = new Set();
  }

  async run(sessionId, task, { signal } = {}) {
    const key = sessionId || `independent:${randomUUID()}`;
    const previous = this.tails.get(key) || Promise.resolve();
    let releaseSession;
    const tail = new Promise(resolve => { releaseSession = resolve; });
    this.tails.set(key, tail);
    try {
      await previous;
      await this.#acquire(tail, signal);
      if (signal?.aborted) throw abortError();
      return await task();
    } finally {
      if (this.acquired.delete(tail)) this.active--;
      releaseSession();
      if (this.tails.get(key) === tail) this.tails.delete(key);
      this.#drain();
    }
  }

  #acquire(tail, signal) {
    if (signal?.aborted) return Promise.reject(abortError());
    if (this.active < this.maxConcurrency) {
      this.active++;
      this.acquired.add(tail);
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const entry = { tail, resolve, reject, signal };
      entry.onAbort = () => {
        this.waiting = this.waiting.filter(item => item !== entry);
        reject(abortError());
      };
      signal?.addEventListener('abort', entry.onAbort, { once: true });
      this.waiting.push(entry);
    });
  }

  #drain() {
    while (this.active < this.maxConcurrency && this.waiting.length) {
      this.active++;
      const entry = this.waiting.shift();
      entry.signal?.removeEventListener('abort', entry.onAbort);
      this.acquired.add(entry.tail);
      entry.resolve();
    }
  }
}

function abortError() { return Object.assign(new Error('Queued job was cancelled.'), { name: 'AbortError' }); }
