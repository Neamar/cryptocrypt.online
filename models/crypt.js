import db from '../db.js';

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
