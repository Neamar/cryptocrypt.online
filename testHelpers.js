import { randomUUID } from 'crypto';
import db from './db.js';

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

/**
 * Run fetch() on the internal server
 * @param {String} endpoint
 * @param {RequestInit} options
 * @returns
 */
export const internalFetch = async (endpoint, options = {}) => {
  // @ts-ignore
  await import("./index.js");
  return fetch(`http://localhost:3000${endpoint}`, options);
};
