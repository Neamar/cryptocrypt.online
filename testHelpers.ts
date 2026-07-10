import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import db from './db.ts';
import { AUTH_COOKIE_DURATION_MS, getCryptHash } from './models/crypt.ts';
import type { Crypt, CryptStatus } from './models/crypt.ts';

/**
 * Forge a valid owner authentication cookie header for a crypt.
 * Use as `headers: { Cookie: authCookie(crypt) }`.
 */
export const authCookie = (crypt: Pick<Crypt, 'uuid' | 'from_mail'>): string => {
  const { hash, validUntil } = getCryptHash(crypt, 'auth', crypt.from_mail, Date.now() + AUTH_COOKIE_DURATION_MS);
  return `auth-${crypt.uuid}=${hash}.${validUntil}`;
};

/**
 * @param crypt the crypt to use
 * @param upToDateCrypt an async function that will always return the most up to date version of the crypt
 */
type WithCryptCallback = (crypt: Crypt, upToDateCrypt: () => Promise<Crypt>) => unknown;

/**
 * Generate a crypt, and makes it available for a test function
 */
export const withCrypt = (status: CryptStatus, custom: Partial<Crypt> | WithCryptCallback, cb?: WithCryptCallback) => {
  if (!cb) {
    cb = custom as WithCryptCallback;
    custom = {};
  }

  return async () => {
    const now = new Date();
    const crypt = (await db('crypts').insert({
      uuid: randomUUID(),
      from_name: 'Test suite sender',
      from_mail: `test-sender@${process.env.SELF_URL}`,
      to_name: 'Test suite recipient',
      to_mail: `test-recipient@${process.env.SELF_URL}`,
      message: `An important test message`,
      status,
      created_at: now,
      updated_at: now,
      refreshed_at: now,
      ...(custom as Partial<Crypt>)
    }).returning('*'))[0]!;

    // Typed as always returning a Crypt for convenience: the crypt exists for the duration
    // of the test (the rare test checking deletion asserts against undefined at runtime).
    const upToDateCrypt = async (): Promise<Crypt> => (await db('crypts').where('uuid', crypt.uuid).select('*').first()) as Crypt;

    try {
      await cb(crypt, upToDateCrypt);
    }
    finally {
      await db('crypts').where('uuid', crypt.uuid).delete();
    }
  };
};

let serverPort: number | null = null;

/**
 * Run fetch() on the internal server
 */
export const internalFetch = async (endpoint: string, options: RequestInit = {}) => {
  if (serverPort === null) {
    const { server } = await import("./index.ts");
    // Server will be running on ephemeral port (PORT=0 in test mode), so the actual port comes from the socket
    const addr = server.address() as AddressInfo;
    serverPort = addr.port;
  }
  return fetch(`http://localhost:${serverPort}${endpoint}`, options);
};
