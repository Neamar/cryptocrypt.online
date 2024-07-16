

import { randomUUID } from 'crypto';


export const addCSP = async (ctx, next) => {
  ctx.nonce = randomUUID();
  ctx.set('Content-Security-Policy', `script-src 'strict-dynamic' 'nonce-${ctx.nonce}' 'unsafe-inline' http: https:; object-src 'none'; base-uri 'none'; style-src 'nonce-${ctx.nonce}'`);

  return next();
};
