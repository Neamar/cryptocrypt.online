import db from '../db.js';
import crypto from 'node:crypto';
import { secret } from '../helpers/env.js';

// This crypt was just created, and doesn't have a verified owner email
export const STATUS_INVALID = 'invalid';
// This crypt has a verified owner email, but recipient or message are missing.
export const STATUS_EMPTY = 'empty';
// This crypt is "armed", and we'll check regularly if the owner is still around
export const STATUS_READY = 'ready';
// This crypt was sent to the intended recipient
export const STATUS_SENT = 'sent';
// This crypts was read by the intended recipient
export const STATUS_READ = 'read';

export const logCryptEvent = async (cryptUuid, event, ctx, trx = db) => {
  await trx('crypt_events').insert({
    crypt_uuid: cryptUuid,
    event,
    created_at: new Date(),
    ip: ctx.request.ip,
    user_agent: ctx.header['user-agent'] || 'unknown'
  });
};

/**
 *
 * @param {Object} crypt
 * @param {String} crypt.uuid uuid of this crypt
 * @param {"warnings"|"verify"|"verify-from-email"|"healthcheck"|"edit"|""|"preview"} action
 * @returns
 */
export const cryptLink = (crypt, action) => `/crypts/${crypt.uuid}/${action}`;

/**
 * Generate a unique hash for a given action
 * @param {Object} crypt
 * @param {String} crypt.uuid uuid of this crypt
 * @param {String} action the action to hash against
 * @param {Number} validUntil how long (in seconds) this token should be valid (one year by default)
 */
export const getCryptHash = (crypt, action, payload, validUntil = Date.now() + 60 * 60 * 24 * 365 * 1000) => {
  const toHash = `${secret}:${crypt.uuid}/${action}#${payload}@${validUntil}`;
  const hash = crypto.createHash('sha256').update(toHash).digest('hex');

  return {
    hash,
    validUntil
  };
};

/**
 * Generate a unique hash for a given action
 * @param {Object} crypt
 * @param {String} crypt.uuid uuid of this crypt
 * @param {"verify-email"} action the action to hash against
 * @param {String} hash the hash sent by the user
 * @param {Number} validUntil timestamp of validity
 */
export const validateCryptHash = (crypt, action, payload, hash, validUntil) => {
  validUntil = Number(validUntil);
  const validHash = getCryptHash(crypt, action, payload, validUntil);
  return validUntil > Date.now() && hash === validHash.hash;
};
