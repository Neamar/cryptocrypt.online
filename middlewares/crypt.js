import db from '../db.js';
import { NotFound } from 'fejl';
import { cryptLink } from '../models/crypt.js';

export const getCrypt = async (ctx, next) => {
  // Retrieve the crypt, except encrypted message.
  const crypt = await db('crypts').where('uuid', ctx.params.uuid).select('uuid', 'from_name', 'from_mail', 'to_name', 'to_mail', 'message', 'encrypted_message_name', 'status', 'created_at', 'updated_at', 'refreshed_at', 'triggered_at', 'read_at', db.raw('pg_size_pretty(LENGTH(encrypted_message)::bigint) as encrypted_message_length')).first();

  NotFound.assert(crypt, 'This crypt does not exist');

  ctx.crypt = crypt;

  return next();
};

/**
 *
 * @param {("empty"|"invalid"|"ready"|"sent"|"read")[]} statuses
 * @returns Function
 */
export const requireCryptStatus = (statuses) => {
  return async (ctx, next) => {
    if (!statuses.includes(ctx.crypt.status)) {
      ctx.setToast('This action is not available for this crypt, redirecting to crypt main page.');
      ctx.redirect(cryptLink(ctx.crypt, ''));
    }
    else {
      return next();
    }
  };
};
