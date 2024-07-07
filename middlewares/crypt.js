import db from '../db.js';
import { NotFound } from 'fejl';

export const getCrypt = async (ctx, next) => {
  const crypt = await db('crypts').where('uuid', ctx.params.uuid).first();

  NotFound.assert(crypt, 'This crypt does not exist');

  ctx.crypt = crypt;

  return next();
};
