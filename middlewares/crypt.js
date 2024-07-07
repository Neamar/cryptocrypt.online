import db from '../db.js';
import { BadRequest, NotFound } from 'fejl';
import { STATUS_SENT } from '../models/crypts.js';

export const getCrypt = async (ctx, next) => {
  const crypt = await db('crypts').where('uuid', ctx.params.uuid).first();

  NotFound.assert(crypt, 'This crypt does not exist');

  ctx.crypt = crypt;

  return next();
};

export const requireUnsentCrypt = async (ctx, next) => {
  BadRequest.assert(ctx.crypt.status !== STATUS_SENT, 'This crypt has been sent already.');

  return next();
};
