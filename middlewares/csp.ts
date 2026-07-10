

import { randomUUID } from 'crypto';
import type { Middleware } from 'koa';


export const addCSP: Middleware = async (ctx, next) => {
  ctx.nonce = randomUUID();
  ctx.set('Content-Security-Policy', `script-src 'strict-dynamic' 'nonce-${ctx.nonce}'; object-src 'none'; base-uri 'none'; style-src 'nonce-${ctx.nonce}'`);

  return next();
};
