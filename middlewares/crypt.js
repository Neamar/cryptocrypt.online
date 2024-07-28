import db from '../db.js';
import { BadRequest, NotFound } from 'fejl';

export const getCrypt = async (ctx, next) => {
  // Retrieve the crypt, except encrypted message.
  const crypt = await db('crypts').where('uuid', ctx.params.uuid).select('uuid', 'from_name', 'from_mail', 'to_name', 'to_mail', 'message', 'encrypted_message_name', 'status', 'created_at', 'updated_at', 'refreshed_at', 'triggered_at', 'read_at', db.raw('pg_size_pretty(LENGTH(encrypted_message)::bigint) as encrypted_message_length')).first();

  NotFound.assert(crypt, 'This crypt does not exist');

  ctx.crypt = crypt;

  return next();
};

export const requireCryptStatus = (statuses) => {
  return async (ctx, next) => {
    BadRequest.assert(statuses.indexOf(ctx.crypt.status) !== -1, 'This action is not available for this crypt.');

    return next();
  };
};
