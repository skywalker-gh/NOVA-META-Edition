import { createHash, timingSafeEqual } from 'node:crypto';

export class AuthError extends Error {
  constructor() { super('Unauthorized'); this.name = 'AuthError'; this.status = 401; }
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function createTokenVerifier(expectedHash, principal = 'chatgpt') {
  if (typeof expectedHash !== 'string' || !/^[a-f\d]{64}$/i.test(expectedHash)) {
    throw new TypeError('Token verifier must be configured with a SHA-256 hex digest.');
  }
  const expected = Buffer.from(expectedHash, 'hex');
  return async token => {
    if (typeof token !== 'string' || !token) return null;
    const actual = Buffer.from(hashToken(token), 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    return { id: principal };
  };
}

export async function verifyMcpCaller(request, verifier) {
  const authorization = request.headers.get('authorization') || '';
  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  if (!match) throw new AuthError();
  const principal = await verifier(match[1]);
  if (!principal) throw new AuthError();
  return principal;
}
