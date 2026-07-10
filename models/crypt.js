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
// This crypt was read by the intended recipient
export const STATUS_READ = 'read';

// How long an authentication cookie stays valid (one week)
export const AUTH_COOKIE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
// Minimum delay between two authentication emails for a given crypt (anti email-bombing)
export const AUTH_MAIL_COOLDOWN_MS = 15 * 60 * 1000;

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
 * Gets a link for a given crypt and action
 * For instance: /crypts/abc-123/verify-from-email
 *
 * @param {Object} crypt
 * @param {String} crypt.uuid uuid of this crypt
 * @param {"warnings"|"verify"|"verify-from-email"|"auth-from-email"|"healthcheck"|"edit"|""|"read"} action
 * @returns
 */
export const cryptLink = (crypt, action) => `/crypts/${crypt.uuid}/${action}`;

/**
 * Generate a unique hash for a given action, with expiration time.
 * This can then be validated through @validateCryptHash
 * @param {Object} crypt
 * @param {String} crypt.uuid uuid of this crypt
 * @param {String} action the action to hash against
 * @param {Number} validUntil how long (in seconds) this token should be valid (one year by default)
 */
export const getCryptHash = (crypt, action, payload, validUntil = Date.now() + 60 * 60 * 24 * 365 * 1000) => {
  // JSON.stringify gives an unambiguous, injective encoding of the fields, so a value
  // containing a delimiter (e.g. an email address holding '@') can't shift field boundaries.
  const toHash = JSON.stringify([crypt.uuid, action, payload, validUntil]);
  // HMAC (rather than a raw secret-prefixed SHA-256) is immune to length-extension attacks.
  const hash = crypto.createHmac('sha256', secret).update(toHash).digest('hex');

  return {
    hash,
    validUntil
  };
};

/**
 * Generate a unique hash for a given action
 * @param {Object} crypt
 * @param {String} crypt.uuid uuid of this crypt
 * @param {"verify-email"|"auth-email"|"auth"} action the action to hash against
 * @param {String} hash the hash sent by the user
 * @param {Number} validUntil timestamp of validity
 */
export const validateCryptHash = (crypt, action, payload, hash, validUntil) => {
  validUntil = Number(validUntil);
  if (!(validUntil > Date.now()) || typeof hash !== 'string') {
    return false;
  }
  const validHash = getCryptHash(crypt, action, payload, validUntil);
  // Constant-time comparison to avoid leaking the expected hash through timing.
  // Compare byte lengths (not string lengths: multibyte input differs), as timingSafeEqual throws on mismatched buffer lengths.
  const hashBuffer = Buffer.from(hash);
  const validHashBuffer = Buffer.from(validHash.hash);
  if (hashBuffer.length !== validHashBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(hashBuffer, validHashBuffer);
};

/**
 * Build the week-long authentication cookie for a crypt owner.
 * The uuid and expiry are baked into the hash input, so a cookie copied from
 * another crypt or with a tampered expiry will fail validation.
 * @param {Object} crypt
 * @param {String} crypt.uuid uuid of this crypt
 * @param {String} crypt.from_mail verified owner email
 * @returns {{ name: String, value: String, validUntil: Number }}
 */
export const getAuthCookie = (crypt) => {
  const { hash, validUntil } = getCryptHash(crypt, 'auth', crypt.from_mail, Date.now() + AUTH_COOKIE_DURATION_MS);
  return {
    name: `auth-${crypt.uuid}`,
    value: `${hash}.${validUntil}`,
    validUntil
  };
};

/**
 * Validate an authentication cookie value (`<hash>.<validUntil>`) against a crypt.
 * @param {Object} crypt
 * @param {String} crypt.uuid uuid of this crypt
 * @param {String} crypt.from_mail verified owner email
 * @param {String} cookieValue the raw cookie value
 * @returns {Boolean}
 */
export const isValidAuthCookie = (crypt, cookieValue) => {
  if (!cookieValue || typeof cookieValue !== 'string') {
    return false;
  }
  // sha256 hex digests contain no '.', so the split is unambiguous.
  const [hash, validUntil] = cookieValue.split('.');
  return validateCryptHash(crypt, 'auth', crypt.from_mail, hash, validUntil);
};
