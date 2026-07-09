import { randomUUID } from 'node:crypto';
import db from './db.js';
import { AUTH_COOKIE_DURATION_MS, getCryptHash } from './models/crypt.js';

/**
 * Forge a valid owner authentication cookie header for a crypt.
 * Use as `headers: { Cookie: authCookie(crypt) }`.
 * @param {{uuid: String, from_mail: String}} crypt a crypt with uuid + from_mail
 * @returns {String}
 */
export const authCookie = (crypt) => {
  const { hash, validUntil } = getCryptHash(crypt, 'auth', crypt.from_mail, Date.now() + AUTH_COOKIE_DURATION_MS);
  return `auth-${crypt.uuid}=${hash}.${validUntil}`;
};

/**
 * Generate a crypt, and makes it available for a test function
 * @param {String} status
 * @param {Object|Function} custom
 * @callback [cb]
 * @param {Object} crypt the crypt to user
 * @param {Function} upToDateCrypt an async function that will always return the most up to date version of the crypt
 */
export const withCrypt = (status, custom, cb) => {
  if (!cb) {
    cb = custom;
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
      ...custom
    }).returning('*'))[0];

    const upToDateCrypt = () => db('crypts').where('uuid', crypt.uuid).select('*').first();

    try {
      await cb(crypt, upToDateCrypt);
    }
    finally {
      await db('crypts').where('uuid', crypt.uuid).delete();
    }
  };
};

let serverPort = null;

/**
 * Run fetch() on the internal server
 * @param {String} endpoint
 * @param {RequestInit} options
 * @returns
 */
export const internalFetch = async (endpoint, options = {}) => {
  if (serverPort === null) {
    // @ts-expect-error dynamic import
    const { server } = await import("./index.js");
    // Server will be running on epehemeral port (PORT=0 in test_mode)
    const addr = server.address();
    serverPort = addr.port;
  }
  return fetch(`http://localhost:${serverPort}${endpoint}`, options);
};
