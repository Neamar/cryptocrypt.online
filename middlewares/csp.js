

import { randomUUID } from 'crypto';


export const addCSP = async (ctx, next) => {
  // TODO: after migrating away from webflow, remove this
  if (ctx.request.url !== '/' && ctx.request.url !== '/examples') {
    ctx.nonce = randomUUID();
    ctx.set('Content-Security-Policy', `script-src 'strict-dynamic' 'nonce-${ctx.nonce}'; object-src 'none'; base-uri 'none'; style-src 'nonce-${ctx.nonce}'`);
  }

  return next();
};
