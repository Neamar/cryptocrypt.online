import db from '../db.js';

export const STATUS_EMPTY = 'empty';
export const STATUS_INVALID = 'invalid';
export const STATUS_READY = 'ready';
export const STATUS_SENT = 'sent';

export const logCryptEvent = async (cryptUuid, event, ctx, trx = db) => {
  await trx('crypt_events').insert({
    crypt_uuid: cryptUuid,
    event,
    created_at: new Date(),
    ip: ctx.request.ip,
    user_agent: ctx.header['user-agent'] || 'unknown'
  });
};
